import { execSync } from "node:child_process";
import { resolve } from "node:path";

export default async function globalSetup() {
  if (process.env.E2E_SKIP_SEED === "1") {
    return;
  }

  const webRoot = resolve(__dirname, "..");
  try {
    execSync("node scripts/seed-e2e.mjs", {
      cwd: webRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_ENV_FILE: process.env.E2E_ENV_FILE ?? resolve(webRoot, ".env.test"),
      },
    });
  } catch (error) {
    console.warn(
      "[e2e] Seed falhou — testes serao ignorados. Configure apps/web/.env.test e rode pnpm --filter web seed:e2e",
    );
    console.warn(error instanceof Error ? error.message : error);
  }
}
