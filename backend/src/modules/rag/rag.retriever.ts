import { createLogger } from "../../utils/logger";
import { cosineSimilarity } from "../embeddings/embeddings.search";
import type { EmbeddingsStore } from "../embeddings/embeddings.store";
import type { EmbeddingsProvider } from "../embeddings/embeddings.types";
import type { DocsRegistry } from "../docs/docs.registry";
import type { ChunksStore } from "./rag.store";
import type { RetrievalMatch } from "./rag.types";

const log = createLogger("rag.retriever");

export interface RetrieveDeps {
  provider: EmbeddingsProvider;
  embeddingsStore: EmbeddingsStore;
  chunksStore: ChunksStore;
  registry: DocsRegistry;
}

export interface RetrieveOptions {
  /** Quantos documentos top considerar antes do re-rank por chunks. */
  topDocs?: number;
  /** Quantos chunks por documento. */
  topChunksPerDoc?: number;
  /** Total de chunks no resultado final (após merge global). */
  topChunksTotal?: number;
}

/**
 * Pipeline de retrieval:
 *  1. embeda a query;
 *  2. ranqueia documentos (doc-level embedding) → top N;
 *  3. para cada doc top, ranqueia chunks → top M por doc;
 *  4. mescla, ordena por score global, devolve top K total.
 *
 * Quando um documento não tem `chunks` ainda (ex.: foi salvo antes do RAG
 * ser ligado), cai em fallback doc-level com `chunkId: -1` e `content: ""`.
 */
export async function retrieve(
  deps: RetrieveDeps,
  query: string,
  opts: RetrieveOptions = {}
): Promise<RetrievalMatch[]> {
  const topDocs = Math.max(1, opts.topDocs ?? 6);
  const topChunksPerDoc = Math.max(1, opts.topChunksPerDoc ?? 3);
  const topChunksTotal = Math.max(1, opts.topChunksTotal ?? 8);

  log.debug("retrieve_start", {
    queryChars: query.length,
    topDocs,
    topChunksPerDoc,
    topChunksTotal,
  });

  const queryVector = await deps.provider.embed(query);

  const allDocs = await deps.embeddingsStore.list();
  const docScored = allDocs
    .filter((d) => d.dimensions === queryVector.length)
    .map((d) => ({ rec: d, score: cosineSimilarity(queryVector, d.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topDocs);

  const registryEntries = await deps.registry.read();
  const regByPath = new Map(registryEntries.map((e) => [e.path, e]));

  const matches: RetrievalMatch[] = [];

  for (const { rec, score: docScore } of docScored) {
    const reg = regByPath.get(rec.path);
    const docCategoria = reg?.categoria ?? rec.categoria;
    const docTags = reg?.tags ?? rec.tags;

    const chunkRec = await deps.chunksStore.get(rec.hash);
    if (!chunkRec || chunkRec.chunks.length === 0) {
      matches.push({
        docPath: rec.path,
        docCategoria,
        docTags,
        chunkId: -1,
        headingPath: [],
        content: "",
        score: Number(docScore.toFixed(6)),
      });
      continue;
    }

    const chunkScored = chunkRec.chunks
      .filter((c) => c.vector && c.vectorDims === queryVector.length)
      .map((c) => ({
        chunk: c,
        score: cosineSimilarity(queryVector, c.vector!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topChunksPerDoc);

    for (const cs of chunkScored) {
      matches.push({
        docPath: rec.path,
        docCategoria,
        docTags,
        chunkId: cs.chunk.id,
        headingPath: cs.chunk.headingPath,
        content: cs.chunk.content,
        score: Number(cs.score.toFixed(6)),
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const trimmed = matches.slice(0, topChunksTotal);

  log.info("retrieve_ok", {
    docsConsidered: docScored.length,
    matchesReturned: trimmed.length,
  });

  return trimmed;
}
