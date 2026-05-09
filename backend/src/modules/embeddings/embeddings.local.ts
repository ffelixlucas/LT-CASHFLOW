import { createLogger } from "../../utils/logger";
import type { EmbeddingsProvider, EmbeddingVector } from "./embeddings.types";

const log = createLogger("embeddings.local");

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
/** all-MiniLM-L6-v2 → 384. Mantemos override para evolução do modelo. */
const DEFAULT_DIMENSIONS = 384;

/** Cache do extractor por modelo (singleton no processo). */
const extractorByModel = new Map<string, Promise<unknown>>();

async function loadExtractor(model: string): Promise<unknown> {
  const cached = extractorByModel.get(model);
  if (cached) return cached;
  const promise = (async () => {
    const start = Date.now();
    log.info("loading_model", { model });
    // Dynamic import porque @xenova/transformers é ESM e o TS aqui é CJS.
    const transformers = await import("@xenova/transformers");
    const pipe = await transformers.pipeline("feature-extraction", model);
    log.info("model_loaded", { model, ms: Date.now() - start });
    return pipe;
  })();
  extractorByModel.set(model, promise);
  return promise;
}

/**
 * Provider local baseado em `@xenova/transformers`.
 *
 * - Lazy load: o modelo só é baixado/carregado na primeira chamada `embed`.
 * - Pooling: `mean` + L2 normalize (padrão para sentence-transformers).
 * - Substituição: trocar para OpenAI/Voyage/Cohere = nova classe que
 *   implementa `EmbeddingsProvider`. Nada mais muda.
 */
export class LocalEmbeddingsProvider implements EmbeddingsProvider {
  readonly model: string;
  readonly dimensions: number;

  constructor(opts: { model?: string; dimensions?: number } = {}) {
    this.model = opts.model ?? DEFAULT_MODEL;
    this.dimensions = opts.dimensions ?? DEFAULT_DIMENSIONS;
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const pipe = (await loadExtractor(this.model)) as (
      input: string,
      options?: { pooling?: "mean" | "cls" | "none"; normalize?: boolean }
    ) => Promise<{ data: Float32Array | number[] }>;
    const out = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(out.data as Float32Array);
  }
}
