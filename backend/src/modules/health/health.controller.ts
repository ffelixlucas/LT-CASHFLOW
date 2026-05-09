import type { Request, Response } from "express";
import { createLogger } from "../../utils/logger";
import type { DocsRegistry } from "../docs/docs.registry";
import type { EmbeddingsStore } from "../embeddings/embeddings.store";
import type { ChunksStore } from "../rag/rag.store";

const log = createLogger("health");

export interface HealthDeps {
  registry: DocsRegistry;
  embeddingsStore?: EmbeddingsStore;
  chunksStore?: ChunksStore;
}

export interface HealthSnapshot {
  docs: number;
  embeddings: number;
  chunks: number;
  registryHealthy: boolean;
  embeddingsHealthy: boolean | null;
  chunksHealthy: boolean | null;
}

export class HealthController {
  constructor(private readonly deps: HealthDeps) {}

  /** Snapshot puro (testável sem HTTP). */
  async snapshot(): Promise<HealthSnapshot> {
    let registryHealthy = false;
    let docs = 0;
    try {
      const reg = await this.deps.registry.read();
      registryHealthy = Array.isArray(reg);
      docs = reg.length;
    } catch (err) {
      log.warn("registry_unhealthy", { message: (err as Error).message });
    }

    let embeddings = 0;
    let embeddingsHealthy: boolean | null = null;
    if (this.deps.embeddingsStore) {
      embeddingsHealthy = true;
      try {
        embeddings = await this.deps.embeddingsStore.count();
      } catch (err) {
        embeddingsHealthy = false;
        log.warn("embeddings_unhealthy", { message: (err as Error).message });
      }
    }

    let chunks = 0;
    let chunksHealthy: boolean | null = null;
    if (this.deps.chunksStore) {
      chunksHealthy = true;
      try {
        chunks = await this.deps.chunksStore.totalChunks();
      } catch (err) {
        chunksHealthy = false;
        log.warn("chunks_unhealthy", { message: (err as Error).message });
      }
    }

    return {
      docs,
      embeddings,
      chunks,
      registryHealthy,
      embeddingsHealthy,
      chunksHealthy,
    };
  }

  health = async (_req: Request, res: Response): Promise<void> => {
    const snap = await this.snapshot();
    res.json(snap);
  };
}
