/* eslint-disable no-console */
import path from "node:path";
import { promises as fs } from "node:fs";
import express from "express";

import { DocsService } from "../modules/docs/docs.service";
import { DocsRegistry } from "../modules/docs/docs.registry";
import type {
  DocRegistryEntry,
  PostWriteContext,
} from "../modules/docs/docs.types";
import { buildDocsRouter } from "../modules/docs/docs.routes";
import { DocsController } from "../modules/docs/docs.controller";
import {
  buildSaveManySchema,
  DEFAULT_SAVE_MANY_LIMIT,
} from "../modules/docs/docs.schema";

import { StubEmbeddingsProvider } from "../modules/embeddings/embeddings.stub";
import { EmbeddingsStore } from "../modules/embeddings/embeddings.store";
import { createEmbeddingsHook } from "../modules/embeddings/embeddings.hook";
import { searchByQuery } from "../modules/embeddings/embeddings.search";

import { ChunksStore } from "../modules/rag/rag.store";
import { createChunksHook } from "../modules/rag/rag.hook";
import { chunkMarkdown } from "../modules/rag/rag.chunker";
import { retrieve } from "../modules/rag/rag.retriever";
import { buildContext } from "../modules/rag/rag.context";

import { createVersioningHook } from "../modules/versioning/versioning.hook";

import { HealthController } from "../modules/health/health.controller";

// ────────────────────────────────────────────────────────────────────────
// Sandbox isolado pra esse smoke (não polui docs reais).
// ────────────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SANDBOX_ROOT = path.resolve(REPO_ROOT, "backend/.smoke-sandbox");
const REGISTRY_PATH = path.resolve(SANDBOX_ROOT, "docs/.registry.json");
const EMBEDDINGS_DIR = path.resolve(SANDBOX_ROOT, "docs/.embeddings");
const CHUNKS_DIR = path.resolve(SANDBOX_ROOT, "docs/.chunks");
const VERSIONS_DIR = path.resolve(SANDBOX_ROOT, "docs/.versions");

let failures = 0;
function ok(label: string, msg = ""): void {
  console.log(`OK   [${label}]${msg ? " " + msg : ""}`);
}
function fail(label: string, msg = ""): void {
  failures++;
  console.error(`FAIL [${label}]${msg ? " " + msg : ""}`);
}
async function expectError(
  label: string,
  fn: () => Promise<unknown>
): Promise<void> {
  try {
    await fn();
    fail(label, "expected error, got success");
  } catch (err) {
    ok(label, `rejected: ${(err as Error).message}`);
  }
}

async function resetSandbox(): Promise<void> {
  await fs.rm(SANDBOX_ROOT, { recursive: true, force: true });
  await fs.mkdir(SANDBOX_ROOT, { recursive: true });
}

async function readRegistry(): Promise<DocRegistryEntry[]> {
  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  return JSON.parse(raw);
}

async function ls(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function main(): Promise<void> {
  await resetSandbox();

  const provider = new StubEmbeddingsProvider({ dimensions: 64 });
  const service = new DocsService({
    root: SANDBOX_ROOT,
    maxContentBytes: 1_000_000,
    allowedExtensions: [".md"],
  });
  const registry = new DocsRegistry(REGISTRY_PATH);
  const embeddingsStore = new EmbeddingsStore(EMBEDDINGS_DIR);
  const chunksStore = new ChunksStore(CHUNKS_DIR);

  const registryHook = async (ctx: PostWriteContext) => {
    await registry.upsert({
      path: ctx.path,
      categoria: ctx.categoria,
      tags: ctx.tags,
      hash: ctx.hash,
      bytes: ctx.bytes,
      updatedAt: ctx.savedAt,
    });
  };
  const embeddingsHook = createEmbeddingsHook({
    provider,
    store: embeddingsStore,
  });
  const chunksHook = createChunksHook({
    provider,
    store: chunksStore,
    maxChars: 400,
  });
  const versioningHook = createVersioningHook({ versionsDir: VERSIONS_DIR });

  const allHooks = {
    preWriteHooks: [versioningHook],
    postWriteHooks: [registryHook, embeddingsHook, chunksHook],
  };

  // ── 1) FASE 1: save + registry (regressão) ─────────────────────────────
  const PATH_A = "docs/modelagem/product/competencia-vs-liquidacao.md";
  const PATH_B = "docs/modelagem/product/cartao-vs-corrente.md";
  const PATH_C = "docs/modelagem/ux/acessibilidade-mobile.md";

  const r1 = await service.saveMarkdown(
    {
      path: PATH_A,
      content:
        "# Competência vs liquidação\n\n" +
        "## Definição\n\nCompetência é quando o gasto pertence ao mês.\n\n" +
        "## Liquidação\n\nLiquidação é quando o caixa muda.\n",
      tags: ["competencia", "financeiro"],
    },
    allHooks
  );
  if (
    r1.hash &&
    r1.categoria === "product" &&
    r1.tags.length === 2 &&
    r1.bytes > 0
  ) {
    ok("save+meta", `hash=${r1.hash.slice(0, 8)}…`);
  } else {
    fail("save+meta", JSON.stringify(r1));
  }

  // file está em disco?
  const stat = await fs.stat(path.resolve(SANDBOX_ROOT, PATH_A));
  if (stat.size === r1.bytes) ok("file-on-disk", `${stat.size} bytes`);
  else fail("file-on-disk", `expected ${r1.bytes}, got ${stat.size}`);

  // registry com 1 entry
  let reg = await readRegistry();
  if (
    reg.length === 1 &&
    reg[0]!.path === PATH_A &&
    reg[0]!.createdAt === reg[0]!.updatedAt
  ) {
    ok("registry-insert");
  } else {
    fail("registry-insert", JSON.stringify(reg));
  }
  const aCreatedAt = reg[0]!.createdAt;

  // ── 2) Embeddings: gerado na 1ª vez ────────────────────────────────────
  if (await embeddingsStore.has(r1.hash)) ok("embedding-generated");
  else fail("embedding-generated");

  const embRec = await embeddingsStore.get(r1.hash);
  if (
    embRec &&
    embRec.dimensions === provider.dimensions &&
    Array.isArray(embRec.vector) &&
    embRec.vector.length === provider.dimensions
  ) {
    ok("embedding-shape", `dims=${embRec.dimensions}`);
  } else {
    fail("embedding-shape", JSON.stringify(embRec));
  }

  // ── 3) Embeddings: reuso quando hash não mudou ─────────────────────────
  // sobrescrita com MESMO conteúdo: hash igual → reuso, registry só atualiza updatedAt
  await new Promise((r) => setTimeout(r, 5));
  const r1same = await service.saveMarkdown(
    {
      path: PATH_A,
      content:
        "# Competência vs liquidação\n\n" +
        "## Definição\n\nCompetência é quando o gasto pertence ao mês.\n\n" +
        "## Liquidação\n\nLiquidação é quando o caixa muda.\n",
      tags: ["competencia", "financeiro"],
    },
    allHooks
  );
  if (r1same.hash === r1.hash) ok("embedding-reused-same-hash");
  else fail("embedding-reused-same-hash");

  // ── 4) Versionamento: capturado quando conteúdo muda ───────────────────
  // primeiro save em PATH_A NÃO deve ter gerado versão (não havia "anterior")
  // mas a sobrescrita com mesmo conteúdo capturou versão (versioning não checa hash hoje).
  // Vamos sobrescrever com conteúdo novo e validar versionamento.
  const r2 = await service.saveMarkdown(
    {
      path: PATH_A,
      content:
        "# Competência vs liquidação (v2)\n\n" +
        "## Definição\n\nCompetência é a janela mental.\n\n" +
        "## Liquidação\n\nLiquidação é a janela do caixa.\n",
      tags: ["competencia", "financeiro", "v2"],
    },
    allHooks
  );
  if (r2.hash !== r1.hash) ok("hash-changed-on-update");
  else fail("hash-changed-on-update");

  const versions = await ls(VERSIONS_DIR);
  if (
    versions.length >= 1 &&
    versions.every((v) => v.endsWith(".md") || v.endsWith(".md~"))
  ) {
    ok("versioning-files-present", `count=${versions.length}`);
  } else {
    fail("versioning-files-present", JSON.stringify(versions));
  }

  // registry preserva createdAt
  reg = await readRegistry();
  const entryA = reg.find((e) => e.path === PATH_A);
  if (
    entryA &&
    entryA.createdAt === aCreatedAt &&
    entryA.updatedAt === r2.savedAt &&
    entryA.hash === r2.hash
  ) {
    ok("registry-upsert-keeps-createdAt");
  } else {
    fail("registry-upsert-keeps-createdAt", JSON.stringify(entryA));
  }

  // embedding novo gerado para hash novo (ainda existe o antigo + o novo)
  if (
    (await embeddingsStore.has(r1.hash)) &&
    (await embeddingsStore.has(r2.hash))
  ) {
    ok("embedding-store-has-both-hashes");
  } else {
    fail("embedding-store-has-both-hashes");
  }

  // ── 5) Chunks gerados (RAG sidecar) ────────────────────────────────────
  const chunkRec = await chunksStore.get(r2.hash);
  if (chunkRec && chunkRec.chunks.length >= 2) {
    const headingPaths = chunkRec.chunks.map((c) => c.headingPath);
    const hasHeadings = headingPaths.some(
      (h) => h.length >= 1 && h[0] === "Competência vs liquidação (v2)"
    );
    if (hasHeadings) {
      ok(
        "chunks-generated",
        `count=${chunkRec.chunks.length} v=${chunkRec.chunkingVersion}`
      );
    } else {
      fail("chunks-generated", "headingPath não capturou heading raiz");
    }
  } else {
    fail("chunks-generated", JSON.stringify(chunkRec));
  }

  // ── 6) Salva mais 2 docs e roda search/retrieve ────────────────────────
  await service.saveMarkdown(
    {
      path: PATH_B,
      content:
        "# Cartão vs conta corrente\n\n" +
        "## Limite e fatura\n\nFatura do cartão consolida compras.\n\n" +
        "## Pagamento\n\nO pagamento da fatura debita a corrente.\n",
      tags: ["cartao", "fatura", "financeiro"],
    },
    allHooks
  );
  await service.saveMarkdown(
    {
      path: PATH_C,
      content:
        "# Acessibilidade mobile\n\n" +
        "## Contraste\n\nValores monetários precisam de alto contraste.\n\n" +
        "## Toque\n\nCTAs vivem na zona confortável do polegar.\n",
      tags: ["acessibilidade", "mobile", "ux"],
    },
    allHooks
  );

  // ── 7) Search semântico ranqueia por palavras compartilhadas ───────────
  const sCompetencia = await searchByQuery(
    { provider, store: embeddingsStore },
    "como funciona competência",
    { topK: 3 }
  );
  if (sCompetencia.length > 0 && sCompetencia[0]!.path === PATH_A) {
    ok(
      "search-rank-competencia",
      `top=${sCompetencia[0]!.path} score=${sCompetencia[0]!.score}`
    );
  } else {
    fail("search-rank-competencia", JSON.stringify(sCompetencia));
  }

  const sCartao = await searchByQuery(
    { provider, store: embeddingsStore },
    "fatura do cartão",
    { topK: 3 }
  );
  if (sCartao.length > 0 && sCartao[0]!.path === PATH_B) {
    ok("search-rank-cartao", `top=${sCartao[0]!.path}`);
  } else {
    fail("search-rank-cartao", JSON.stringify(sCartao));
  }

  // search com filtro de categoria
  const sCatUx = await searchByQuery(
    { provider, store: embeddingsStore },
    "contraste mobile",
    { topK: 5, categoria: "ux" }
  );
  if (sCatUx.length === 1 && sCatUx[0]!.path === PATH_C) {
    ok("search-filter-categoria");
  } else {
    fail("search-filter-categoria", JSON.stringify(sCatUx));
  }

  // ranking determinístico (rodar duas vezes deve dar idêntico)
  const sAgain = await searchByQuery(
    { provider, store: embeddingsStore },
    "como funciona competência",
    { topK: 3 }
  );
  if (JSON.stringify(sAgain) === JSON.stringify(sCompetencia)) {
    ok("search-deterministic");
  } else {
    fail("search-deterministic");
  }

  // ── 8) Retrieve + buildContext ─────────────────────────────────────────
  const retrieveDeps = {
    provider,
    embeddingsStore,
    chunksStore,
    registry,
  };
  const matches = await retrieve(retrieveDeps, "competência liquidação", {
    topDocs: 3,
    topChunksPerDoc: 2,
    topChunksTotal: 5,
  });
  if (matches.length > 0 && matches[0]!.docPath === PATH_A) {
    ok(
      "retrieve-doc-rank",
      `top=${matches[0]!.docPath} score=${matches[0]!.score}`
    );
  } else {
    fail("retrieve-doc-rank", JSON.stringify(matches));
  }
  if (matches.some((m) => m.content.length > 0 && m.headingPath.length > 0)) {
    ok("retrieve-has-chunks");
  } else {
    fail("retrieve-has-chunks", JSON.stringify(matches));
  }

  const ctx = await buildContext(
    retrieveDeps,
    "competência liquidação",
    {
      maxContextChars: 1500,
      topDocs: 3,
      topChunksPerDoc: 2,
      topChunksTotal: 5,
    }
  );
  if (
    ctx.context.length > 0 &&
    ctx.context.length <= 1500 + 200 &&
    ctx.tokensEstimate >= 1
  ) {
    ok(
      "rag-context-built",
      `chars=${ctx.context.length} tokens≈${ctx.tokensEstimate}`
    );
  } else {
    fail("rag-context-built", JSON.stringify(ctx).slice(0, 200));
  }

  // ── 9) Chunker isolado: heading-aware ─────────────────────────────────
  const chunks = chunkMarkdown(
    "# Top\nintro\n\n## Sub A\nlinha 1\n\n## Sub B\nlinha 2\n",
    { maxChars: 400 }
  );
  if (
    chunks.length >= 3 &&
    chunks[0]!.headingPath[0] === "Top" &&
    chunks.some((c) => c.headingPath.includes("Sub A"))
  ) {
    ok("chunker-heading-aware", `count=${chunks.length}`);
  } else {
    fail("chunker-heading-aware", JSON.stringify(chunks));
  }

  // ── 10) Health snapshot ───────────────────────────────────────────────
  const health = new HealthController({
    registry,
    embeddingsStore,
    chunksStore,
  });
  const snap = await health.snapshot();
  if (
    snap.docs >= 3 &&
    snap.embeddings >= 3 &&
    snap.chunks >= 3 &&
    snap.registryHealthy &&
    snap.embeddingsHealthy &&
    snap.chunksHealthy
  ) {
    ok(
      "health-snapshot",
      `docs=${snap.docs} emb=${snap.embeddings} chunks=${snap.chunks}`
    );
  } else {
    fail("health-snapshot", JSON.stringify(snap));
  }

  // ── 11) Registry-recovery (regressão FASE 1) ──────────────────────────
  await fs.writeFile(REGISTRY_PATH, "{not-json", "utf8");
  await service.saveMarkdown(
    { path: PATH_A, content: "# trivial\n", categoria: "product", tags: [] },
    allHooks
  );
  const recovered = await readRegistry();
  if (recovered.find((e) => e.path === PATH_A)) {
    ok("registry-recovers-from-corrupt");
  } else {
    fail("registry-recovers-from-corrupt", JSON.stringify(recovered));
  }

  // ── 12) buildDocsRouter compila com tudo ligado (sanity wiring) ───────
  const app = express();
  app.use(
    "/docs",
    buildDocsRouter({
      root: SANDBOX_ROOT,
      versioning: { enabled: true },
      embeddings: { enabled: true, provider: { kind: "stub" } },
      rag: { enabled: true },
      health: { enabled: true },
    })
  );
  // Não inicia listener (sandbox de rede pode bloquear); só valida que
  // o router monta sem erro. `express()` retorna uma função-aplicação.
  if (typeof app === "function") ok("router-builds");
  else fail("router-builds", typeof app);

  // ── 13) Validações originais de path e payload (regressão) ────────────
  await expectError("traversal", () =>
    service.saveMarkdown({ path: "../escape.md", content: "x" })
  );
  await expectError("ext", () =>
    service.saveMarkdown({ path: "docs/foo.txt", content: "x" })
  );
  await expectError("invalid-tags", () =>
    service.saveMarkdown(
      {
        path: "docs/x.md",
        content: "x",
        tags: ["ok", 1 as unknown as string],
      },
      allHooks
    )
  );

  // ── 14) save-many: schema do envelope (Zod) ───────────────────────────
  const schemaSm = buildSaveManySchema(DEFAULT_SAVE_MANY_LIMIT);
  const empty = schemaSm.safeParse({ docs: [] });
  if (!empty.success) ok("save-many-schema-rejects-empty");
  else fail("save-many-schema-rejects-empty");

  const tooMany = schemaSm.safeParse({
    docs: Array.from({ length: DEFAULT_SAVE_MANY_LIMIT + 1 }, (_, i) => ({
      path: `docs/x-${i}.md`,
      content: "x",
    })),
  });
  if (!tooMany.success) ok("save-many-schema-rejects-over-limit");
  else fail("save-many-schema-rejects-over-limit");

  const missingDocs = schemaSm.safeParse({});
  if (!missingDocs.success) ok("save-many-schema-rejects-missing-docs");
  else fail("save-many-schema-rejects-missing-docs");

  const happy = schemaSm.safeParse({
    docs: [{ path: "docs/y.md", content: "x" }],
  });
  if (happy.success) ok("save-many-schema-accepts-valid");
  else fail("save-many-schema-accepts-valid");

  // ── 15) save-many: pipeline em service (loop sequencial) ──────────────
  const BATCH_PATHS = [
    "docs/modelagem/product/batch-a.md",
    "docs/modelagem/product/batch-b.md",
    "docs/modelagem/ux/batch-c.md",
  ];
  const batchOk = await service.saveManyMarkdown(
    [
      {
        path: BATCH_PATHS[0]!,
        content:
          "# Batch A\n\n## Sec\n\nDecisão arquitetural sobre A.\n",
        tags: ["batch", "a"],
      },
      {
        path: BATCH_PATHS[1]!,
        content:
          "# Batch B\n\n## Sec\n\nDecisão arquitetural sobre B.\n",
        tags: ["batch", "b"],
      },
      {
        path: BATCH_PATHS[2]!,
        content: "# Batch C\n\n## UX\n\nNotas de UX C.\n",
        categoria: "ux",
        tags: ["batch", "c"],
      },
    ],
    allHooks
  );
  if (
    batchOk.success &&
    batchOk.processed === 3 &&
    batchOk.failed === 0 &&
    batchOk.results.every((r) => r.ok)
  ) {
    ok("save-many-all-success");
  } else {
    fail("save-many-all-success", JSON.stringify(batchOk));
  }

  // registry contém os 3 + os anteriores
  const regAfterBatch = await readRegistry();
  if (BATCH_PATHS.every((p) => regAfterBatch.find((e) => e.path === p))) {
    ok("save-many-registry-has-all");
  } else {
    fail(
      "save-many-registry-has-all",
      regAfterBatch.map((e) => e.path).join(",")
    );
  }
  // categoria inferida funcionou pra batch-a/batch-b
  const entryBatchA = regAfterBatch.find((e) => e.path === BATCH_PATHS[0]);
  if (entryBatchA?.categoria === "product") ok("save-many-categoria-inferida");
  else
    fail(
      "save-many-categoria-inferida",
      JSON.stringify(entryBatchA ?? null)
    );

  // embeddings + chunks gerados pra todos
  const allHaveEmb = await Promise.all(
    batchOk.results
      .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
      .map((r) => embeddingsStore.has(r.result.hash))
  );
  if (allHaveEmb.every(Boolean)) ok("save-many-embeddings-all-present");
  else fail("save-many-embeddings-all-present", JSON.stringify(allHaveEmb));

  // ── 16) save-many: tolerância a falha por item ────────────────────────
  // 1 válido + 1 com path inválido (extensão errada) + 1 válido
  const batchPartial = await service.saveManyMarkdown(
    [
      {
        path: "docs/modelagem/product/batch-d.md",
        content: "# Batch D\nok\n",
      },
      {
        path: "docs/modelagem/product/batch-e.txt",
        content: "# Batch E\nfalha esperada (ext .txt)\n",
      },
      {
        path: "docs/modelagem/product/batch-f.md",
        content: "# Batch F\nok depois da falha\n",
      },
    ],
    allHooks
  );
  if (
    batchPartial.processed === 2 &&
    batchPartial.failed === 1 &&
    batchPartial.results[0]?.ok === true &&
    batchPartial.results[1]?.ok === false &&
    batchPartial.results[2]?.ok === true
  ) {
    ok("save-many-partial-failure-isolated");
  } else {
    fail("save-many-partial-failure-isolated", JSON.stringify(batchPartial));
  }

  // o item que falhou veio com error.code preenchido
  const failedItem = batchPartial.results[1];
  if (
    failedItem &&
    failedItem.ok === false &&
    typeof failedItem.error.code === "string" &&
    failedItem.error.code.length > 0
  ) {
    ok("save-many-failed-item-has-code", `code=${failedItem.error.code}`);
  } else {
    fail("save-many-failed-item-has-code", JSON.stringify(failedItem));
  }

  // ── 17) save-many: controller (HTTP-like) com Zod ─────────────────────
  // Usa fake req/res para validar caminho completo do controller.
  const controller = new DocsController(service, {
    preWriteHooks: allHooks.preWriteHooks,
    postWriteHooks: allHooks.postWriteHooks,
    saveManyMaxItems: DEFAULT_SAVE_MANY_LIMIT,
  });

  type CapturedRes = {
    status: number;
    body: unknown;
  };
  function makeRes(): { res: any; captured: CapturedRes } {
    const captured: CapturedRes = { status: 0, body: null };
    const res: any = {
      status(code: number) {
        captured.status = code;
        return res;
      },
      json(payload: unknown) {
        captured.body = payload;
        return res;
      },
    };
    return { res, captured };
  }

  // 17a) envelope inválido → 400
  {
    const { res, captured } = makeRes();
    await controller.saveMany({ body: { docs: [] } } as any, res);
    if (
      captured.status === 400 &&
      (captured.body as any).success === false
    ) {
      ok("save-many-controller-rejects-empty-400");
    } else {
      fail(
        "save-many-controller-rejects-empty-400",
        JSON.stringify(captured)
      );
    }
  }

  // 17b) item shape inválido (content number) → 400
  {
    const { res, captured } = makeRes();
    await controller.saveMany(
      {
        body: {
          docs: [{ path: "docs/x.md", content: 123 as unknown as string }],
        },
      } as any,
      res
    );
    if (captured.status === 400) ok("save-many-controller-rejects-bad-shape");
    else
      fail(
        "save-many-controller-rejects-bad-shape",
        JSON.stringify(captured)
      );
  }

  // 17c) batch válido → 200 + processed
  {
    const { res, captured } = makeRes();
    await controller.saveMany(
      {
        body: {
          docs: [
            {
              path: "docs/modelagem/product/batch-g.md",
              content: "# G\nok\n",
            },
            {
              path: "docs/modelagem/product/batch-h.md",
              content: "# H\nok\n",
            },
          ],
        },
      } as any,
      res
    );
    const body = captured.body as any;
    if (
      captured.status === 200 &&
      body.success === true &&
      body.processed === 2 &&
      body.failed === 0
    ) {
      ok("save-many-controller-happy-path");
    } else {
      fail("save-many-controller-happy-path", JSON.stringify(captured));
    }
  }

  // ── cleanup ───────────────────────────────────────────────────────────
  await fs.rm(SANDBOX_ROOT, { recursive: true, force: true });

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nall green");
}

main().catch((err) => {
  console.error("smoke crashed:", err);
  process.exit(1);
});
