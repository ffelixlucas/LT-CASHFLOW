import crypto from "node:crypto";
import type { EmbeddingsProvider, EmbeddingVector } from "./embeddings.types";

/**
 * Provider determinístico baseado em **bag-of-tokens hashing**.
 *
 * Não depende de modelo nem rede — pensado pra:
 *  - smoke tests (`pnpm smoke:engine`)
 *  - ambientes air-gapped
 *  - CI/CD sem GPU/rede livre
 *
 * Garantias úteis para teste:
 *  - mesmo texto → mesmo vetor (determinístico);
 *  - textos com palavras em comum têm cosine maior que textos sem overlap;
 *  - L2-normalizado, escala estável.
 *
 * Não substitui um modelo real em produção. Default: `kind: 'local'`.
 */
export class StubEmbeddingsProvider implements EmbeddingsProvider {
  readonly model: string;
  readonly dimensions: number;

  constructor(opts: { model?: string; dimensions?: number } = {}) {
    this.model = opts.model ?? "stub-bow-v1";
    this.dimensions = opts.dimensions ?? 64;
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const v = new Array<number>(this.dimensions).fill(0);
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9áéíóúâêîôûãõç]+/)
      .filter(Boolean);
    for (const tok of tokens) {
      const h = crypto.createHash("sha256").update(tok).digest();
      const idx1 = h.readUInt16BE(0) % this.dimensions;
      const idx2 = h.readUInt16BE(2) % this.dimensions;
      v[idx1] = (v[idx1] ?? 0) + 1;
      v[idx2] = (v[idx2] ?? 0) + 1;
    }
    let norm = 0;
    for (let i = 0; i < v.length; i++) norm += (v[i] ?? 0) ** 2;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < v.length; i++) v[i] = (v[i] ?? 0) / norm;
    return v;
  }
}
