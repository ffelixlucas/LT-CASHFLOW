import { Router } from "express";
import path from "node:path";
import { docsSecurity } from "../../middlewares/docs.security";
import { DocsController } from "./docs.controller";
import { DocsRegistry } from "./docs.registry";
import {
  DocsService,
  type PostWriteHook,
  type PreWriteHook,
} from "./docs.service";
import type { DocsEngineConfig } from "./docs.types";

import {
  createProvider,
  type ProviderConfig,
} from "../embeddings/embeddings.provider";
import { EmbeddingsStore } from "../embeddings/embeddings.store";
import { createEmbeddingsHook } from "../embeddings/embeddings.hook";
import { SearchController } from "../embeddings/embeddings.controller";
import { registerSearchRoute } from "../embeddings/embeddings.routes";
import type { EmbeddingsProvider } from "../embeddings/embeddings.types";

import { ChunksStore } from "../rag/rag.store";
import { createChunksHook } from "../rag/rag.hook";
import { RagController } from "../rag/rag.controller";
import { registerAskRoute } from "../rag/rag.routes";

import { createVersioningHook } from "../versioning/versioning.hook";

import { HealthController } from "../health/health.controller";
import { registerHealthRoute } from "../health/health.routes";

export interface BuildDocsRouterOptions {
  // ── FASE 1 (compat) ───────────────────────────────────────────────────
  /** Diretório raiz absoluto. Default: raiz do repositório (`<backend>/..`). */
  root?: string;
  /** Bytes máximos por documento. Default: 1_000_000. */
  maxContentBytes?: number;
  /** Extensões aceitas. Default: `['.md']`. */
  allowedExtensions?: string[];
  /** Habilitar registry. Default: `true`. */
  enableRegistry?: boolean;
  /** Path relativo do registry. Default: `docs/.registry.json`. */
  registryRelativePath?: string;
  /** Hooks pós-escrita extras (rodam DEPOIS dos defaults). */
  extraPostWriteHooks?: PostWriteHook[];
  /** Hooks pré-escrita extras (rodam DEPOIS dos defaults). */
  extraPreWriteHooks?: PreWriteHook[];
  /** Teto de itens em `POST /docs/save-many`. Default: 50. */
  saveManyMaxItems?: number;

  // ── Versionamento (opt-in) ────────────────────────────────────────────
  versioning?: {
    enabled?: boolean;
    /** Default: `docs/.versions/`. */
    versionsRelativePath?: string;
  };

  // ── Embeddings (opt-in) ───────────────────────────────────────────────
  embeddings?: {
    enabled?: boolean;
    /** Default: `{ kind: 'local' }`. */
    provider?: ProviderConfig;
    /** Default: `docs/.embeddings/`. */
    storeRelativePath?: string;
  };

  // ── RAG / chunks (opt-in, requer embeddings) ──────────────────────────
  rag?: {
    enabled?: boolean;
    /** Default: `docs/.chunks/`. */
    chunksRelativePath?: string;
    /** Default: 1200. */
    chunkMaxChars?: number;
    /** Default: 6. */
    topDocs?: number;
    /** Default: 3. */
    topChunksPerDoc?: number;
    /** Default: 8. */
    topChunksTotal?: number;
    /** Default: 6000. */
    askMaxContextChars?: number;
  };

  // ── /docs/health (opt-in) ─────────────────────────────────────────────
  health?: { enabled?: boolean };
}

const REPO_ROOT_DEFAULT = path.resolve(__dirname, "..", "..", "..", "..");

/**
 * Compõe o router unificado do Doc Engine + plataforma (search/ask/health).
 *
 * Mantemos um único mount-point (`/docs`) e middleware de segurança
 * aplicado a tudo. Nada é forçado: cada bloco é opt-in.
 */
export function buildDocsRouter(opts: BuildDocsRouterOptions = {}): Router {
  const config: DocsEngineConfig = {
    root: path.resolve(opts.root ?? REPO_ROOT_DEFAULT),
    maxContentBytes: opts.maxContentBytes ?? 1_000_000,
    allowedExtensions: (opts.allowedExtensions ?? [".md"]).map((e) =>
      e.toLowerCase()
    ),
  };

  // Registry (FASE 1 default)
  const enableRegistry = opts.enableRegistry ?? true;
  const registry = new DocsRegistry(
    path.resolve(config.root, opts.registryRelativePath ?? "docs/.registry.json")
  );

  const postHooks: PostWriteHook[] = [];
  const preHooks: PreWriteHook[] = [];

  if (enableRegistry) {
    postHooks.push(async (ctx) => {
      await registry.upsert({
        path: ctx.path,
        categoria: ctx.categoria,
        tags: ctx.tags,
        hash: ctx.hash,
        bytes: ctx.bytes,
        updatedAt: ctx.savedAt,
      });
    });
  }

  // Versionamento (preWrite)
  if (opts.versioning?.enabled) {
    const versionsDir = path.resolve(
      config.root,
      opts.versioning.versionsRelativePath ?? "docs/.versions"
    );
    preHooks.push(createVersioningHook({ versionsDir }));
  }

  // Embeddings + Search
  let embeddingsProvider: EmbeddingsProvider | null = null;
  let embeddingsStore: EmbeddingsStore | null = null;
  let chunksStore: ChunksStore | null = null;
  let searchController: SearchController | null = null;
  let ragController: RagController | null = null;

  if (opts.embeddings?.enabled) {
    embeddingsProvider = createProvider(
      opts.embeddings.provider ?? { kind: "local" }
    );
    embeddingsStore = new EmbeddingsStore(
      path.resolve(
        config.root,
        opts.embeddings.storeRelativePath ?? "docs/.embeddings"
      )
    );
    postHooks.push(
      createEmbeddingsHook({
        provider: embeddingsProvider,
        store: embeddingsStore,
      })
    );
    searchController = new SearchController({
      provider: embeddingsProvider,
      store: embeddingsStore,
    });

    // RAG depende de embeddings
    if (opts.rag?.enabled) {
      chunksStore = new ChunksStore(
        path.resolve(
          config.root,
          opts.rag.chunksRelativePath ?? "docs/.chunks"
        )
      );
      postHooks.push(
        createChunksHook({
          provider: embeddingsProvider,
          store: chunksStore,
          maxChars: opts.rag.chunkMaxChars,
        })
      );
      ragController = new RagController(
        {
          provider: embeddingsProvider,
          embeddingsStore,
          chunksStore,
          registry,
        },
        {
          defaultTopDocs: opts.rag.topDocs,
          defaultTopChunksPerDoc: opts.rag.topChunksPerDoc,
          defaultTopChunksTotal: opts.rag.topChunksTotal,
          defaultMaxContextChars: opts.rag.askMaxContextChars,
        }
      );
    }
  }

  // Hooks extras do chamador (rodam por último)
  if (opts.extraPreWriteHooks?.length) preHooks.push(...opts.extraPreWriteHooks);
  if (opts.extraPostWriteHooks?.length) postHooks.push(...opts.extraPostWriteHooks);

  const service = new DocsService(config);
  const docsController = new DocsController(service, {
    preWriteHooks: preHooks,
    postWriteHooks: postHooks,
    saveManyMaxItems: opts.saveManyMaxItems,
  });

  const router = Router();
  router.use(docsSecurity);

  // FASE 1
  router.post("/save", docsController.save);
  router.post("/save-many", docsController.saveMany);

  // FASE 2 — search
  if (searchController) registerSearchRoute(router, searchController);

  // FASE 3 — ask (RAG retrieval, sem LLM)
  if (ragController) registerAskRoute(router, ragController);

  // Health
  if (opts.health?.enabled) {
    const healthController = new HealthController({
      registry,
      embeddingsStore: embeddingsStore ?? undefined,
      chunksStore: chunksStore ?? undefined,
    });
    registerHealthRoute(router, healthController);
  }

  return router;
}
