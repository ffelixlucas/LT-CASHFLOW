/**
 * Contratos do módulo Doc Engine.
 *
 * Mantemos shapes estáveis para que evoluções futuras (versionamento,
 * embeddings, registry, RAG) não exijam quebra de contrato no client.
 */

export interface SaveDocPayload {
  path: string;
  content: string;
  /** Opcional. Quando ausente, o engine infere a partir do path. */
  categoria?: string | null;
  /** Opcional. Default `[]`. */
  tags?: string[];
}

export interface SaveDocResult {
  success: true;
  path: string;
  /** ISO-8601 UTC. */
  savedAt: string;
  bytes: number;
  /** SHA-256 hex do conteúdo persistido. Útil para invalidação de embeddings. */
  hash: string;
  categoria: string | null;
  tags: string[];
}

export interface DocsEngineConfig {
  /** Diretório raiz absoluto sob o qual o engine pode escrever. */
  root: string;
  /** Tamanho máximo do conteúdo (bytes). */
  maxContentBytes: number;
  /** Extensões permitidas (lowercase, com ponto). */
  allowedExtensions: string[];
}

/** Forma de cada item em `docs/.registry.json`. */
export interface DocRegistryEntry {
  path: string;
  categoria: string | null;
  tags: string[];
  hash: string;
  bytes: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Contexto entregue aos `postWriteHooks` do `DocsService`.
 * Expansões futuras (embeddings, RAG, indexação) usam isso como input.
 */
export interface PostWriteContext extends SaveDocResult {
  absolute: string;
  content: string;
}

/**
 * Contexto entregue aos `preWriteHooks` do `DocsService`.
 *
 * Roda **antes** do arquivo ser sobrescrito — necessário para versionamento
 * (capturar estado anterior). Não conhece o `hash`/`savedAt` finais ainda.
 */
export interface PreWriteContext {
  absolute: string;
  /** Path relativo POSIX. */
  relative: string;
  /** Bytes do conteúdo que vai ser escrito. */
  incomingBytes: number;
  /** Hash SHA-256 hex do conteúdo que vai ser escrito. */
  incomingHash: string;
  categoria: string | null;
  tags: string[];
}

// ── Batch / save-many ─────────────────────────────────────────────────────

/** Envelope para ingestão massiva. */
export interface SaveManyDocsPayload {
  docs: SaveDocPayload[];
}

/** Resultado individual dentro de um batch. */
export type SaveManyItemResult =
  | {
      ok: true;
      index: number;
      path: string;
      result: SaveDocResult;
    }
  | {
      ok: false;
      index: number;
      /** Path solicitado (mesmo se falhou na validação de path). */
      path: string | null;
      error: { code: string; message: string };
    };

/** Resposta agregada de `POST /docs/save-many`. */
export interface SaveManyDocsResult {
  success: true;
  processed: number;
  failed: number;
  results: SaveManyItemResult[];
}
