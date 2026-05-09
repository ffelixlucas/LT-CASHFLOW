/**
 * Contratos do módulo de embeddings.
 *
 * Estável a propósito: trocar provider (local → OpenAI/Voyage/Cohere) não
 * deve mudar a forma do `EmbeddingRecord` nem a interface de busca.
 */

export type EmbeddingVector = number[];

export interface EmbeddingsProvider {
  /** Identificador do modelo (ex.: `Xenova/all-MiniLM-L6-v2`). */
  readonly model: string;
  /** Dimensão dos vetores produzidos. */
  readonly dimensions: number;
  embed(text: string): Promise<EmbeddingVector>;
}

export interface EmbeddingRecord {
  /** Hash SHA-256 hex do conteúdo do documento (chave de invalidação). */
  hash: string;
  path: string;
  categoria: string | null;
  tags: string[];
  model: string;
  dimensions: number;
  /** ISO-8601 UTC. */
  createdAt: string;
  vector: EmbeddingVector;
}

export interface SearchMatch {
  path: string;
  score: number;
  categoria: string | null;
  tags: string[];
  hash: string;
}
