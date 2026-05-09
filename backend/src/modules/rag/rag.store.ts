import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createLogger } from "../../utils/logger";
import type { ChunkRecord } from "./rag.types";

const log = createLogger("rag.store");

/**
 * Sidecar por documento: `<dir>/<docHash>.json`.
 *
 * Chave = hash do conteúdo do documento (mesma chave dos embeddings),
 * o que dá invalidação atômica entre `embeddings/` e `chunks/`.
 */
export class ChunksStore {
  constructor(private readonly dirAbsolutePath: string) {}

  private fileFor(docHash: string): string {
    return path.join(this.dirAbsolutePath, `${docHash}.json`);
  }

  async has(docHash: string): Promise<boolean> {
    try {
      await fs.access(this.fileFor(docHash));
      return true;
    } catch {
      return false;
    }
  }

  async get(docHash: string): Promise<ChunkRecord | null> {
    try {
      const raw = await fs.readFile(this.fileFor(docHash), "utf8");
      return JSON.parse(raw) as ChunkRecord;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        log.warn("get_failed", {
          docHash,
          code,
          message: (err as Error).message,
        });
      }
      return null;
    }
  }

  async save(record: ChunkRecord): Promise<void> {
    await fs.mkdir(this.dirAbsolutePath, { recursive: true });
    const target = this.fileFor(record.docHash);
    const tmp = `${target}.tmp-${crypto.randomBytes(6).toString("hex")}`;
    await fs.writeFile(tmp, JSON.stringify(record), "utf8");
    await fs.rename(tmp, target);
  }

  async list(): Promise<ChunkRecord[]> {
    let files: string[] = [];
    try {
      files = await fs.readdir(this.dirAbsolutePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    const out: ChunkRecord[] = [];
    for (const f of files) {
      if (!f.endsWith(".json") || f.includes(".tmp-")) continue;
      try {
        const raw = await fs.readFile(
          path.join(this.dirAbsolutePath, f),
          "utf8"
        );
        out.push(JSON.parse(raw) as ChunkRecord);
      } catch (err) {
        log.warn("skip_corrupt_record", {
          file: f,
          message: (err as Error).message,
        });
      }
    }
    return out;
  }

  async totalChunks(): Promise<number> {
    const all = await this.list();
    return all.reduce((acc, r) => acc + (r.chunks?.length ?? 0), 0);
  }
}
