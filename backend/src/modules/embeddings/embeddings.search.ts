import { createLogger } from "../../utils/logger";
import type { EmbeddingsStore } from "./embeddings.store";
import type {
  EmbeddingsProvider,
  EmbeddingVector,
  SearchMatch,
} from "./embeddings.types";

const log = createLogger("embeddings.search");

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface SearchDeps {
  provider: EmbeddingsProvider;
  store: EmbeddingsStore;
}

export interface SearchOptions {
  topK?: number;
  /** Filtro opcional por categoria (substring match exato). */
  categoria?: string | null;
  /** Filtro opcional: precisa conter ao menos uma das tags. */
  tagsAny?: string[];
}

/**
 * Embeda a query, varre store, ranqueia por cosine similarity.
 *
 * Pequeno o suficiente pra ser correto (sem ANN). Quando o catálogo
 * passar de ~5k docs, plugar HNSW (ex.: hnswlib-node) atrás da mesma
 * função.
 */
export async function searchByQuery(
  deps: SearchDeps,
  query: string,
  opts: SearchOptions = {}
): Promise<SearchMatch[]> {
  const topK = Math.max(1, Math.min(50, opts.topK ?? 5));
  log.debug("search_start", { topK, queryChars: query.length });
  const t0 = Date.now();

  const queryVector = await deps.provider.embed(query);
  const records = await deps.store.list();

  const tagFilter = opts.tagsAny?.length
    ? new Set(opts.tagsAny)
    : null;

  const scored = records
    .filter((r) => r.dimensions === queryVector.length)
    .filter((r) =>
      opts.categoria === undefined || opts.categoria === null
        ? true
        : r.categoria === opts.categoria
    )
    .filter((r) =>
      !tagFilter ? true : r.tags.some((t) => tagFilter.has(t))
    )
    .map((r) => ({ rec: r, score: cosineSimilarity(queryVector, r.vector) }));

  scored.sort((a, b) => b.score - a.score);
  const out = scored.slice(0, topK).map(({ rec, score }) => ({
    path: rec.path,
    score: Number(score.toFixed(6)),
    categoria: rec.categoria,
    tags: rec.tags,
    hash: rec.hash,
  }));

  log.info("search_ok", {
    topK,
    candidates: scored.length,
    returned: out.length,
    ms: Date.now() - t0,
  });
  return out;
}
