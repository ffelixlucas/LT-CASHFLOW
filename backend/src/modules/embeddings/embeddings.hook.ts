import { createLogger } from "../../utils/logger";
import type { PostWriteHook } from "../docs/docs.service";
import type { EmbeddingsStore } from "./embeddings.store";
import type { EmbeddingsProvider } from "./embeddings.types";

const log = createLogger("embeddings.hook");

/**
 * Hook de save que mantém `docs/.embeddings/<hash>.json` em dia.
 *
 * Regra-chave: **se hash já existe no store, NÃO regenerar** o vetor.
 * Isso reduz custo (rede/CPU) drasticamente em ambientes de IA com
 * muitos saves idempotentes.
 */
export function createEmbeddingsHook(deps: {
  provider: EmbeddingsProvider;
  store: EmbeddingsStore;
}): PostWriteHook {
  return async (ctx) => {
    if (await deps.store.has(ctx.hash)) {
      log.info("embedding_reused", {
        path: ctx.path,
        hash: ctx.hash,
        model: deps.provider.model,
      });
      return;
    }

    const t0 = Date.now();
    const vector = await deps.provider.embed(ctx.content);
    await deps.store.save({
      hash: ctx.hash,
      path: ctx.path,
      categoria: ctx.categoria,
      tags: ctx.tags,
      model: deps.provider.model,
      dimensions: deps.provider.dimensions,
      createdAt: ctx.savedAt,
      vector,
    });
    log.info("embedding_generated", {
      path: ctx.path,
      hash: ctx.hash,
      model: deps.provider.model,
      dimensions: deps.provider.dimensions,
      ms: Date.now() - t0,
    });
  };
}
