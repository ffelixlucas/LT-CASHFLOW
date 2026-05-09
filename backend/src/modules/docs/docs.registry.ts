import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createLogger } from "../../utils/logger";
import type { DocRegistryEntry } from "./docs.types";

const log = createLogger("docs.registry");

/**
 * Repositório do `docs/.registry.json`.
 *
 * Decisões deliberadas:
 * - **append/upsert por `path`**: cada documento aparece **uma única vez**;
 * - **escrita atômica** (`tempfile + rename`) pra não corromper a lista em
 *   caso de crash;
 * - **fila serializada in-memory** pra evitar leitura/escrita concorrente
 *   no mesmo processo;
 * - **formato simples** (array de objetos) — fica óbvio versionar pro
 *   `{ version, entries }` quando precisarmos.
 */
export class DocsRegistry {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly registryAbsolutePath: string) {}

  /** Lê e devolve a lista atual. Tolera arquivo ausente ou corrompido. */
  async read(): Promise<DocRegistryEntry[]> {
    try {
      const raw = await fs.readFile(this.registryAbsolutePath, "utf8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        log.warn("registry_not_array_resetting", {
          file: this.registryAbsolutePath,
        });
        return [];
      }
      return parsed as DocRegistryEntry[];
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") return [];
      log.warn("registry_unreadable_resetting", {
        file: this.registryAbsolutePath,
        code,
        message: (err as Error)?.message,
      });
      return [];
    }
  }

  /**
   * Insere ou atualiza uma entrada (chave = `entry.path`).
   * Preserva `createdAt` original se já existir.
   * Retorna a entrada efetivamente persistida.
   */
  async upsert(
    partial: Omit<DocRegistryEntry, "createdAt"> & { createdAt?: string }
  ): Promise<DocRegistryEntry> {
    return this.serialize(async () => {
      const entries = await this.read();
      const idx = entries.findIndex((e) => e.path === partial.path);
      const createdAt =
        idx >= 0
          ? entries[idx]!.createdAt ?? partial.updatedAt
          : partial.createdAt ?? partial.updatedAt;

      const next: DocRegistryEntry = {
        path: partial.path,
        categoria: partial.categoria,
        tags: partial.tags,
        hash: partial.hash,
        bytes: partial.bytes,
        createdAt,
        updatedAt: partial.updatedAt,
      };

      if (idx >= 0) entries[idx] = next;
      else entries.push(next);

      entries.sort((a, b) => a.path.localeCompare(b.path));

      await this.atomicWrite(entries);
      log.debug("registry_upserted", {
        path: next.path,
        categoria: next.categoria,
        bytes: next.bytes,
      });
      return next;
    });
  }

  private async atomicWrite(entries: DocRegistryEntry[]): Promise<void> {
    await fs.mkdir(path.dirname(this.registryAbsolutePath), { recursive: true });
    const tmp = `${this.registryAbsolutePath}.tmp-${crypto
      .randomBytes(6)
      .toString("hex")}`;
    const body = JSON.stringify(entries, null, 2) + "\n";
    await fs.writeFile(tmp, body, "utf8");
    await fs.rename(tmp, this.registryAbsolutePath);
  }

  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }
}

/**
 * Inferência simples de `categoria` a partir do path relativo.
 *
 * Heurística (não-mágica, fácil de auditar):
 * - `docs/modelagem/<categoria>/...`  → `<categoria>`
 * - `docs/<categoria>/...`            → `<categoria>`
 * - resto → `null`
 *
 * Quando a IA mandar `categoria` explicitamente no payload, esse fallback
 * **não roda** — explicit > implicit.
 */
export function inferCategoria(relativePath: string): string | null {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts[0] !== "docs") return null;
  if (parts[1] === "modelagem" && parts[2]) return parts[2];
  if (parts[1]) return parts[1];
  return null;
}
