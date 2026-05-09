import { promises as fs } from "node:fs";
import path from "node:path";
import { createLogger } from "../../utils/logger";
import type { PreWriteHook } from "../docs/docs.service";

const log = createLogger("versioning");

/**
 * Gancho `preWrite` que captura a versão atual do arquivo antes de
 * sobrescrever, salvando em `<versionsDir>/<isoTs>-<basename>`.
 *
 * - **Não** versiona quando hash de saída == hash atual em disco
 *   (sobrescrita idempotente — não polui histórico).
 * - **Não** falha o save se a captura der erro (apenas warn).
 * - Salva flat por timestamp pra busca trivial; mover para mirror tree
 *   é trade-off futuro caso o histórico cresça muito.
 */
export function createVersioningHook(opts: {
  versionsDir: string;
}): PreWriteHook {
  return async (ctx) => {
    let existing: Buffer;
    try {
      existing = await fs.readFile(ctx.absolute);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return;
      log.warn("read_existing_failed", {
        path: ctx.relative,
        code,
        message: (err as Error).message,
      });
      return;
    }

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const basename = path.basename(ctx.absolute);
    const versionAbs = path.join(opts.versionsDir, `${ts}-${basename}`);

    try {
      await fs.mkdir(opts.versionsDir, { recursive: true });
      await fs.writeFile(versionAbs, existing);
      log.info("version_created", {
        from: ctx.relative,
        to: path.relative(path.dirname(opts.versionsDir), versionAbs),
        bytes: existing.length,
      });
    } catch (err) {
      log.warn("version_write_failed", {
        path: ctx.relative,
        message: (err as Error).message,
      });
    }
  };
}
