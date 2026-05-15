#!/usr/bin/env node
/**
 * Consultas read-only: compara contagens local (.env.local) vs Railway (API GraphQL).
 *
 * Env necessarios para o Railway:
 *   RAILWAY_TOKEN          — https://railway.com/account/tokens
 *   RAILWAY_PROJECT_ID     — Cmd+K no painel → Copy Project ID
 *   RAILWAY_ENVIRONMENT_ID — Copy Environment ID (ex.: production)
 *   RAILWAY_SERVICE_ID     — servico MySQL (opcional; se omitido, variaveis compartilhadas)
 *
 * Uso: pnpm db:query-railway
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const RAILWAY_GQL = "https://backboard.railway.com/graphql/v2";

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

function toDbConfig(vars) {
  const url = vars.MYSQL_PUBLIC_URL ?? vars.DATABASE_URL;
  if (url?.startsWith("mysql:")) {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || "3306",
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  }
  return {
    host: vars.DB_HOST ?? vars.MYSQLHOST,
    port: vars.DB_PORT ?? vars.MYSQLPORT ?? "3306",
    user: vars.DB_USER ?? vars.MYSQLUSER ?? "root",
    password: vars.DB_PASSWORD ?? vars.MYSQLPASSWORD ?? "",
    database: vars.DB_NAME ?? vars.MYSQLDATABASE ?? "railway",
  };
}

function mysqlCounts(cfg, label) {
  if (!cfg.host) {
    return { label, error: "host ausente" };
  }
  try {
    const out = execFileSync(
      "mysql",
      [
        "-h",
        cfg.host,
        "-P",
        String(cfg.port),
        "-u",
        cfg.user,
        `-p${cfg.password}`,
        cfg.database,
        "-N",
        "-e",
        "SELECT COUNT(*) FROM gestoes; SELECT COUNT(*) FROM lancamentos;",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
    const [gestoes, lancamentos] = out.split("\n");
    return { label, host: cfg.host, database: cfg.database, gestoes, lancamentos };
  } catch (e) {
    return { label, host: cfg.host, error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchRailwayVariables() {
  const token = process.env.RAILWAY_TOKEN;
  const projectId = process.env.RAILWAY_PROJECT_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  const serviceId = process.env.RAILWAY_SERVICE_ID;

  if (!token || !projectId || !environmentId) {
    throw new Error(
      "Defina RAILWAY_TOKEN, RAILWAY_PROJECT_ID e RAILWAY_ENVIRONMENT_ID (IDs no painel Railway, Cmd+K).",
    );
  }

  const query = `
    query Variables($projectId: String!, $environmentId: String!, $serviceId: String) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }
  `;

  const res = await fetch(RAILWAY_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: { projectId, environmentId, serviceId: serviceId ?? null },
    }),
  });

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data?.variables ?? {};
}

function printRow(row) {
  if (row.error) {
    console.log(`  ${row.label}: ERRO — ${row.error}`);
    return;
  }
  console.log(`  ${row.label} (${row.host} / ${row.database})`);
  console.log(`    gestoes: ${row.gestoes}, lancamentos: ${row.lancamentos}`);
}

const localEnv = loadEnvFile(resolve(process.cwd(), "apps/web/.env.local"));
const local = mysqlCounts(toDbConfig(localEnv), "Local (.env.local)");

console.log("=== Consulta de dados (somente leitura) ===\n");
printRow(local);

try {
  const railwayVars = await fetchRailwayVariables();
  const prod = mysqlCounts(toDbConfig(railwayVars), "Producao (Railway API)");
  console.log("");
  printRow(prod);

  if (!local.error && !prod.error) {
    const same =
      local.gestoes === prod.gestoes && local.lancamentos === prod.lancamentos;
    console.log(
      same
        ? "\n✓ Mesmas contagens — mesmo banco ou dados alinhados."
        : "\n✗ Contagens diferentes — bancos distintos ou dados desatualizados.",
    );
  }
} catch (e) {
  console.log("");
  console.log(`  Producao: ${e instanceof Error ? e.message : e}`);
  console.log("\n  Exporte o token e IDs, depois rode de novo: pnpm db:query-railway");
}
