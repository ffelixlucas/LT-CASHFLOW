import type { EmbeddingVector } from "../embeddings/embeddings.types";

/** Versão do chunker — incrementar quando a heurística mudar (invalidação). */
export const CHUNKER_VERSION = "md-heading-v1";

export interface Chunk {
  /** Ordinal estável dentro do documento (sequencial). */
  id: number;
  /** Cadeia de headings que contém o chunk (ex.: ["UX", "Cores"]). */
  headingPath: string[];
  /** Conteúdo do chunk em markdown. Inclui o heading da seção quando aplicável. */
  content: string;
  /** Comprimento em caracteres. */
  chars: number;
}

export interface ChunkWithVector extends Chunk {
  vector?: EmbeddingVector;
  vectorModel?: string;
  vectorDims?: number;
}

export interface ChunkRecord {
  docPath: string;
  /** Hash SHA-256 hex do markdown original. */
  docHash: string;
  chunkingVersion: string;
  chunks: ChunkWithVector[];
}

export interface RetrievalMatch {
  docPath: string;
  docCategoria: string | null;
  docTags: string[];
  /** -1 quando o match é doc-level e não houve chunks. */
  chunkId: number;
  headingPath: string[];
  content: string;
  score: number;
}

export interface BuildContextResult {
  query: string;
  matches: RetrievalMatch[];
  /** Markdown concatenado pronto para um prompt. */
  context: string;
  /** Estimativa de tokens (chars / 4). */
  tokensEstimate: number;
}
