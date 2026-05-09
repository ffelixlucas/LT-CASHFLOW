import type { Request, Response } from "express";
import { createLogger } from "../../utils/logger";
import { searchByQuery, type SearchDeps } from "./embeddings.search";

const log = createLogger("embeddings.controller");

export class SearchController {
  constructor(private readonly deps: SearchDeps) {}

  search = async (req: Request, res: Response): Promise<void> => {
    const { query, topK, categoria, tagsAny } = (req.body ?? {}) as {
      query?: unknown;
      topK?: unknown;
      categoria?: unknown;
      tagsAny?: unknown;
    };

    if (typeof query !== "string" || !query.trim()) {
      res.status(400).json({ success: false, error: "missing_query" });
      return;
    }

    const k = typeof topK === "number" ? topK : Number(topK ?? 5);
    const cat =
      categoria === undefined
        ? undefined
        : categoria === null || typeof categoria === "string"
          ? categoria
          : undefined;
    const tags =
      Array.isArray(tagsAny) && tagsAny.every((t) => typeof t === "string")
        ? (tagsAny as string[])
        : undefined;

    log.info("POST /docs/search", {
      queryChars: query.length,
      topK: k,
      categoria: cat,
      tagsCount: tags?.length ?? 0,
    });

    try {
      const results = await searchByQuery(this.deps, query, {
        topK: Number.isFinite(k) ? k : 5,
        categoria: cat,
        tagsAny: tags,
      });
      res.json(results);
    } catch (err) {
      log.error("search_failed", { message: (err as Error).message });
      res.status(500).json({ success: false, error: "search_failed" });
    }
  };
}
