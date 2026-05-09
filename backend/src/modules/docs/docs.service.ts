import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { InvalidPathError, normalizePath } from "../../utils/normalizePath";
import { createLogger } from "../../utils/logger";
import { inferCategoria } from "./docs.registry";
import type {
  DocsEngineConfig,
  PostWriteContext,
  PreWriteContext,
  SaveDocPayload,
  SaveDocResult,
  SaveManyDocsResult,
  SaveManyItemResult,
} from "./docs.types";

const log = createLogger("docs.service");

export class DocEngineError extends Error {
  constructor(public readonly code: string, message?: string) {
    super(message ?? code);
    this.name = "DocEngineError";
  }
}

export type PostWriteHook = (ctx: PostWriteContext) => Promise<void> | void;
export type PreWriteHook = (ctx: PreWriteContext) => Promise<void> | void;

export interface SaveOptions {
  /** Hooks executados ANTES da escrita (uso clássico: versionamento). */
  preWriteHooks?: PreWriteHook[];
  /**
   * Hooks executados DEPOIS da escrita. Não bloqueiam a resposta HTTP em
   * caso de erro do hook (já gravado).
   *
   * Casos planejados:
   *   - registry      → docs/.registry.json (default em `buildDocsRouter`)
   *   - embeddings    → docs/.embeddings/<hash>.json
   *   - chunks        → docs/.chunks/<hash>.json
   *   - indexer       → fila/worker
   */
  postWriteHooks?: PostWriteHook[];
}

export class DocsService {
  constructor(private readonly config: DocsEngineConfig) {}

  /**
   * Salva (ou sobrescreve) um documento markdown sob `config.root`.
   *
   * Validações: path traversal, extensão, tamanho.
   * Cria diretórios intermediários quando necessário.
   * Calcula SHA-256 do conteúdo (chave para invalidação de embeddings).
   */
  async saveMarkdown(
    payload: SaveDocPayload,
    options: SaveOptions = {}
  ): Promise<SaveDocResult> {
    if (!payload || typeof payload !== "object") {
      throw new DocEngineError("invalid_payload");
    }

    if (typeof payload.content !== "string") {
      throw new DocEngineError("content_must_be_string");
    }

    const bytes = Buffer.byteLength(payload.content, "utf8");
    if (bytes > this.config.maxContentBytes) {
      throw new DocEngineError(
        "content_too_large",
        `content exceeds ${this.config.maxContentBytes} bytes (got ${bytes})`
      );
    }

    if (
      payload.tags !== undefined &&
      !(Array.isArray(payload.tags) && payload.tags.every((t) => typeof t === "string"))
    ) {
      throw new DocEngineError("tags_must_be_string_array");
    }
    if (
      payload.categoria !== undefined &&
      payload.categoria !== null &&
      typeof payload.categoria !== "string"
    ) {
      throw new DocEngineError("categoria_must_be_string_or_null");
    }

    let normalized;
    try {
      normalized = normalizePath(payload.path, {
        root: this.config.root,
        allowedExtensions: this.config.allowedExtensions,
      });
    } catch (err) {
      if (err instanceof InvalidPathError) {
        throw new DocEngineError(err.message);
      }
      throw err;
    }

    const incomingHash = crypto
      .createHash("sha256")
      .update(payload.content, "utf8")
      .digest("hex");

    const categoria =
      payload.categoria !== undefined
        ? payload.categoria
        : inferCategoria(normalized.relative);
    const tags = payload.tags ?? [];

    log.debug("save_start", {
      relative: normalized.relative,
      bytes,
      hash: incomingHash,
    });

    if (options.preWriteHooks?.length) {
      const preCtx: PreWriteContext = {
        absolute: normalized.absolute,
        relative: normalized.relative,
        incomingBytes: bytes,
        incomingHash,
        categoria,
        tags,
      };
      for (const hook of options.preWriteHooks) {
        try {
          await hook(preCtx);
        } catch (hookErr) {
          log.warn("pre_write_hook_failed", {
            error: (hookErr as Error)?.message,
          });
        }
      }
    }

    await fs.mkdir(path.dirname(normalized.absolute), { recursive: true });
    await fs.writeFile(normalized.absolute, payload.content, "utf8");

    const result: SaveDocResult = {
      success: true,
      path: normalized.relative,
      savedAt: new Date().toISOString(),
      bytes,
      hash: incomingHash,
      categoria,
      tags,
    };

    log.info("save_ok", {
      path: result.path,
      bytes: result.bytes,
      categoria: result.categoria,
      tagsCount: result.tags.length,
    });

    if (options.postWriteHooks?.length) {
      const ctx: PostWriteContext = {
        ...result,
        absolute: normalized.absolute,
        content: payload.content,
      };
      for (const hook of options.postWriteHooks) {
        try {
          await hook(ctx);
        } catch (hookErr) {
          log.warn("post_write_hook_failed", {
            error: (hookErr as Error)?.message,
          });
        }
      }
    }

    return result;
  }

  /**
   * Ingestão massiva sequencial.
   *
   * Reaproveita 100% o pipeline do `saveMarkdown` por item (registry,
   * embeddings, chunks, versionamento). Sequencial de propósito:
   *
   * - registry/embeddings/chunks já são serializados internamente, então
   *   paralelizar não acelera;
   * - sequencial mantém ordem dos `index` na resposta e logs legíveis;
   * - falha em um item NÃO interrompe os seguintes (tolerância a falhas).
   *
   * O envelope (tamanho do batch, vazio, schema) é validado pelo controller
   * via Zod **antes** de chegar aqui — esta camada confia no shape e foca
   * em preservar a semântica do `saveMarkdown` por documento.
   */
  async saveManyMarkdown(
    items: SaveDocPayload[],
    options: SaveOptions = {}
  ): Promise<SaveManyDocsResult> {
    const results: SaveManyItemResult[] = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      const raw = items[i]!;
      try {
        const result = await this.saveMarkdown(raw, options);
        processed++;
        results.push({
          ok: true,
          index: i,
          path: result.path,
          result,
        });
      } catch (err) {
        failed++;
        const code =
          err instanceof DocEngineError ? err.code : "internal_error";
        const message =
          err instanceof Error ? err.message : "unknown_error";
        log.warn("save_many_item_failed", {
          index: i,
          path: typeof raw?.path === "string" ? raw.path : null,
          code,
        });
        results.push({
          ok: false,
          index: i,
          path: typeof raw?.path === "string" ? raw.path : null,
          error: { code, message },
        });
      }
    }

    log.info("save_many_done", { total: items.length, processed, failed });

    return { success: true, processed, failed, results };
  }
}
