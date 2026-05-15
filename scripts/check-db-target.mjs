#!/usr/bin/env node
/**
 * Mostra para qual MySQL o dev local aponta e contagens basicas.
 * Uso: pnpm db:check
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const envPath = resolve(
  process.cwd(),
  process.env.DB_ENV_FILE ?? "apps/web/.env.local",
);

function loadEnvFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Arquivo nao encontrado: ${path}`);
  }

  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function isLikelyRailwayHost(host) {
  return /railway|rlwy\.net/i.test(host);
}

function runMysql(env, sql) {
  return execFileSync(
    "mysql",
    [
      "-h",
      env.DB_HOST ?? "localhost",
      "-P",
      String(env.DB_PORT ?? 3306),
      "-u",
      env.DB_USER ?? "root",
      `-p${env.DB_PASSWORD ?? ""}`,
      env.DB_NAME ?? "lt_cashflow",
      "-N",
      "-e",
      sql,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

const env = loadEnvFile(envPath);
const host = env.DB_HOST ?? "localhost";
const port = Number(env.DB_PORT ?? 3306);
const user = env.DB_USER ?? "root";
const database = env.DB_NAME ?? "lt_cashflow";
const onRailway = isLikelyRailwayHost(host);

console.log(`--- Alvo do banco (${process.env.DB_ENV_FILE ?? "apps/web/.env.local"}) ---`);
console.log(`host:     ${host}`);
console.log(`port:     ${port}`);
console.log(`user:     ${user}`);
console.log(`database: ${database}`);
console.log(`railway:  ${onRailway ? "sim (host parece Railway)" : "nao (provavel MySQL local)"}`);

if (!onRailway) {
  console.log("\n⚠ Local e producao NAO compartilham o mesmo banco enquanto DB_HOST=localhost.");
  console.log("  Copie DB_* do servico MySQL no Railway para apps/web/.env.local.");
}

try {
  const gestoes = runMysql(env, "SELECT COUNT(*) FROM gestoes");
  const lancamentos = runMysql(env, "SELECT COUNT(*) FROM lancamentos");
  const gestaoList = runMysql(env, "SELECT CONCAT(id, ':', nome) FROM gestoes ORDER BY id");

  console.log("\n--- Dados no banco conectado ---");
  console.log(`gestoes:     ${gestoes}`);
  console.log(`lancamentos: ${lancamentos}`);
  console.log("gestoes:");
  for (const row of gestaoList.split("\n").filter(Boolean)) {
    const [id, ...nomeParts] = row.split(":");
    console.log(`  - ${id}: ${nomeParts.join(":")}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("\nFalha ao conectar:", message);
  process.exit(1);
}
