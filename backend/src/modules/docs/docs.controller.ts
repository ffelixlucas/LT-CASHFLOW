import type { Request, Response } from "express";
import { z } from "zod";
import { createLogger } from "../../utils/logger";
import {
  DocEngineError,
  DocsService,
  type PostWriteHook,
  type PreWriteHook,
} from "./docs.service";
import {
  buildSaveManySchema,
  DEFAULT_SAVE_MANY_LIMIT,
  formatZodError,
} from "./docs.schema";
import type { SaveDocPayload } from "./docs.types";

const log = createLogger("docs.controller");

const ENGINE_ERROR_STATUS: Record<string, number> = {
  invalid_payload: 400,
  content_must_be_string: 400,
  tags_must_be_string_array: 400,
  categoria_must_be_string_or_null: 400,
  content_too_large: 413,
};

export interface DocsControllerOptions {
  /** Hooks executados ANTES de cada save (ex.: versionamento). */
  preWriteHooks?: PreWriteHook[];
  /** Hooks executados após cada save bem-sucedido (ex.: registry/embeddings). */
  postWriteHooks?: PostWriteHook[];
  /** Teto do batch em `POST /docs/save-many`. Default: 50. */
  saveManyMaxItems?: number;
}

export class DocsController {
  private readonly saveManySchema: ReturnType<typeof buildSaveManySchema>;

  constructor(
    private readonly service: DocsService,
    private readonly opts: DocsControllerOptions = {}
  ) {
    this.saveManySchema = buildSaveManySchema(
      opts.saveManyMaxItems ?? DEFAULT_SAVE_MANY_LIMIT
    );
  }

  save = async (req: Request, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as Partial<SaveDocPayload>;
    const { path: rawPath, content, categoria, tags } = body;

    log.info("POST /docs/save", {
      path: typeof rawPath === "string" ? rawPath : null,
      contentBytes:
        typeof content === "string" ? Buffer.byteLength(content, "utf8") : null,
      hasCategoria: categoria !== undefined,
      hasTags: tags !== undefined,
    });

    if (typeof rawPath !== "string" || typeof content !== "string") {
      res
        .status(400)
        .json({ success: false, error: "missing_path_or_content" });
      return;
    }

    try {
      const result = await this.service.saveMarkdown(
        { path: rawPath, content, categoria, tags },
        {
          preWriteHooks: this.opts.preWriteHooks,
          postWriteHooks: this.opts.postWriteHooks,
        }
      );
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof DocEngineError) {
        const status =
          ENGINE_ERROR_STATUS[err.code] ??
          (err.code.startsWith("invalid_path:") ? 400 : 400);
        log.warn("save_rejected", { code: err.code });
        res.status(status).json({ success: false, error: err.code });
        return;
      }
      log.error("save_failed", {
        message: (err as Error)?.message,
        stack: (err as Error)?.stack,
      });
      res.status(500).json({ success: false, error: "internal_error" });
    }
  };

  /**
   * Ingestão massiva. Validação estrutural via Zod (envelope, limite, shape
   * dos itens). Validação semântica por item (path, ext, tamanho) continua
   * no `DocsService` — sem duplicação.
   *
   * Falha em item individual NÃO derruba o batch; cada item retorna
   * `{ ok: true | false, ... }` na resposta.
   */
  saveMany = async (req: Request, res: Response): Promise<void> => {
    const parsed = this.saveManySchema.safeParse(req.body);

    if (!parsed.success) {
      const formatted = formatZodError(parsed.error as z.ZodError);
      log.warn("save_many_invalid_envelope", {
        code: formatted.code,
        firstIssuePath: formatted.issues[0]?.path,
      });
      res.status(400).json({
        success: false,
        error: formatted.code,
        message: formatted.message,
        issues: formatted.issues,
      });
      return;
    }

    const { docs } = parsed.data;
    log.info("POST /docs/save-many", { batchSize: docs.length });

    try {
      const out = await this.service.saveManyMarkdown(docs, {
        preWriteHooks: this.opts.preWriteHooks,
        postWriteHooks: this.opts.postWriteHooks,
      });
      res.status(200).json(out);
    } catch (err) {
      log.error("save_many_failed", {
        message: (err as Error)?.message,
        stack: (err as Error)?.stack,
      });
      res.status(500).json({ success: false, error: "internal_error" });
    }
  };
}
