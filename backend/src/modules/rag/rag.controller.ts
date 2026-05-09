import type { Request, Response } from "express";
import { createLogger } from "../../utils/logger";
import { buildContext, type BuildContextOptions } from "./rag.context";
import type { RetrieveDeps } from "./rag.retriever";

const log = createLogger("rag.controller");

export interface RagControllerOptions {
  /** Default `maxContextChars` quando o cliente não envia. */
  defaultMaxContextChars?: number;
  defaultTopDocs?: number;
  defaultTopChunksPerDoc?: number;
  defaultTopChunksTotal?: number;
}

export class RagController {
  constructor(
    private readonly deps: RetrieveDeps,
    private readonly opts: RagControllerOptions = {}
  ) {}

  ask = async (req: Request, res: Response): Promise<void> => {
    const { query, topK, maxContextChars, topDocs, topChunksPerDoc } =
      (req.body ?? {}) as {
        query?: unknown;
        topK?: unknown;
        maxContextChars?: unknown;
        topDocs?: unknown;
        topChunksPerDoc?: unknown;
      };

    if (typeof query !== "string" || !query.trim()) {
      res.status(400).json({ success: false, error: "missing_query" });
      return;
    }

    const buildOpts: BuildContextOptions = {
      topChunksTotal:
        typeof topK === "number" && Number.isFinite(topK)
          ? topK
          : this.opts.defaultTopChunksTotal,
      topDocs:
        typeof topDocs === "number" && Number.isFinite(topDocs)
          ? topDocs
          : this.opts.defaultTopDocs,
      topChunksPerDoc:
        typeof topChunksPerDoc === "number" && Number.isFinite(topChunksPerDoc)
          ? topChunksPerDoc
          : this.opts.defaultTopChunksPerDoc,
      maxContextChars:
        typeof maxContextChars === "number" && Number.isFinite(maxContextChars)
          ? maxContextChars
          : this.opts.defaultMaxContextChars,
    };

    log.info("POST /docs/ask", {
      queryChars: query.length,
      ...buildOpts,
    });

    try {
      const result = await buildContext(this.deps, query, buildOpts);
      res.json(result);
    } catch (err) {
      log.error("rag_ask_failed", { message: (err as Error).message });
      res.status(500).json({ success: false, error: "rag_failed" });
    }
  };
}
