import { LocalEmbeddingsProvider } from "./embeddings.local";
import { StubEmbeddingsProvider } from "./embeddings.stub";
import type { EmbeddingsProvider } from "./embeddings.types";

/**
 * Configuração polimórfica para criar um provider sem lock-in.
 *
 * Adicionar OpenAI/Voyage/Cohere depois é só uma nova variante de `kind`
 * + uma classe que implementa `EmbeddingsProvider`.
 */
export type ProviderConfig =
  | { kind: "local"; model?: string; dimensions?: number }
  | { kind: "stub"; model?: string; dimensions?: number }
  | { kind: "instance"; provider: EmbeddingsProvider };

export function createProvider(cfg: ProviderConfig): EmbeddingsProvider {
  switch (cfg.kind) {
    case "local":
      return new LocalEmbeddingsProvider({
        model: cfg.model,
        dimensions: cfg.dimensions,
      });
    case "stub":
      return new StubEmbeddingsProvider({
        model: cfg.model,
        dimensions: cfg.dimensions,
      });
    case "instance":
      return cfg.provider;
  }
}
