import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createLogger } from "../../utils/logger";
import type { EmbeddingRecord } from "./embeddings.types";

const log = createLogger("embeddings.store");

/**
 * Store sidecar por arquivo: `<dir>/<hash>.json`.
 *
 * Uma chave por **conteúdo** (hash SHA-256 do markdown), não por path —
 * isso suporta reuso quando o mesmo conteúdo aparecer em paths diferentes
 * e cobre invalidação correta no save com hash novo.
 *
 * Atomic write garante que vetores nunca corrompam após crash.
 */
export class EmbeddingsStore {
  constructor(private readonly dirAbsolutePath: string) {}

  private fileFor(hash: string): string {
    return path.join(this.dirAbsolutePath, `${hash}.json`);
  }

  async has(hash: string): Promise<boolean> {
    try {
      await fs.access(this.fileFor(hash));
      return true;
    } catch {
      return false;
    }
  }

  async get(hash: string): Promise<EmbeddingRecord | null> {
    try {
      const raw = await fs.readFile(this.fileFor(hash), "utf8");
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as EmbeddingRecord).vector)
      ) {
        return parsed as EmbeddingRecord;
      }
      return null;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        log.warn("get_failed", { hash, code, message: (err as Error).message });
      }
      return null;
    }
  }

  async save(record: EmbeddingRecord): Promise<void> {
    await fs.mkdir(this.dirAbsolutePath, { recursive: true });
    const target = this.fileFor(record.hash);
    const tmp = `${target}.tmp-${crypto.randomBytes(6).toString("hex")}`;
    await fs.writeFile(tmp, JSON.stringify(record), "utf8");
    await fs.rename(tmp, target);
  }

  async list(): Promise<EmbeddingRecord[]> {
    let files: string[] = [];
    try {
      files = await fs.readdir(this.dirAbsolutePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    const out: EmbeddingRecord[] = [];
    for (const f of files) {
      if (!f.endsWith(".json") || f.includes(".tmp-")) continue;
      try {
        const raw = await fs.readFile(
          path.join(this.dirAbsolutePath, f),
          "utf8"
        );
        const parsed = JSON.parse(raw) as EmbeddingRecord;
        if (Array.isArray(parsed.vector)) out.push(parsed);
      } catch (err) {
        log.warn("skip_corrupt_record", {
          file: f,
          message: (err as Error).message,
        });
      }
    }
    return out;
  }

  async count(): Promise<number> {
    return (await this.list()).length;
  }
}
