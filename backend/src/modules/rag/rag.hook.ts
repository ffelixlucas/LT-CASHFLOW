import { createLogger } from "../../utils/logger";
import type { PostWriteHook } from "../docs/docs.service";
import type { EmbeddingsProvider } from "../embeddings/embeddings.types";
import { chunkMarkdown } from "./rag.chunker";
import type { ChunksStore } from "./rag.store";
import { CHUNKER_VERSION, type ChunkWithVector } from "./rag.types";

const log = createLogger("rag.hook");

/**
 * Hook `postWrite` que mantém `docs/.chunks/<docHash>.json` em dia.
 *
 * - se hash já existe → reusa (`chunks_reused`);
 * - senão → re-chunka, embeda cada chunk e persiste em sidecar.
 *
 * Embedar chunks é necessário para retrieval; usa o **mesmo provider**
 * dos embeddings doc-level (cache do modelo é compartilhado).
 */
export function createChunksHook(deps: {
  provider: EmbeddingsProvider;
  store: ChunksStore;
  maxChars?: number;
}): PostWriteHook {
  return async (ctx) => {
    if (await deps.store.has(ctx.hash)) {
      log.info("chunks_reused", { path: ctx.path, hash: ctx.hash });
      return;
    }

    const t0 = Date.now();
    const baseChunks = chunkMarkdown(ctx.content, { maxChars: deps.maxChars });

    const enriched: ChunkWithVector[] = [];
    for (const c of baseChunks) {
      const vector = await deps.provider.embed(c.content);
      enriched.push({
        ...c,
        vector,
        vectorModel: deps.provider.model,
        vectorDims: deps.provider.dimensions,
      });
    }

    await deps.store.save({
      docPath: ctx.path,
      docHash: ctx.hash,
      chunkingVersion: CHUNKER_VERSION,
      chunks: enriched,
    });

    log.info("chunks_generated", {
      path: ctx.path,
      hash: ctx.hash,
      count: enriched.length,
      ms: Date.now() - t0,
    });
  };
}
