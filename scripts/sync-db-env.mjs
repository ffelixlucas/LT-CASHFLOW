#!/usr/bin/env node
/**
 * Atualiza DB_* em apps/web/.env.local a partir das variaveis de ambiente.
 * Aceita DB_* ou padrao Railway (MYSQL* / MYSQL_PUBLIC_URL).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envLocalPath = resolve(process.cwd(), "apps/web/.env.local");
const dbKeys = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];

function parseMysqlUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "mysql:") {
      return null;
    }
    return {
      host: parsed.hostname,
      port: parsed.port || "3306",
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
    };
  } catch {
    return null;
  }
}

function resolveDbFromEnv() {
  const fromUrl =
    parseMysqlUrl(process.env.MYSQL_PUBLIC_URL) ??
    parseMysqlUrl(process.env.DATABASE_URL) ??
    parseMysqlUrl(process.env.MYSQL_URL);

  if (fromUrl?.host) {
    return {
      DB_HOST: fromUrl.host,
      DB_PORT: fromUrl.port,
      DB_USER: fromUrl.user,
      DB_PASSWORD: fromUrl.password,
      DB_NAME: fromUrl.database,
      source: "MYSQL_PUBLIC_URL/DATABASE_URL",
    };
  }

  const host =
    process.env.DB_HOST ??
    process.env.MYSQLHOST ??
    process.env.MYSQL_HOST ??
    process.env.MYSQL_HOSTNAME;

  if (!host) {
    return null;
  }

  return {
    DB_HOST: host,
    DB_PORT: process.env.DB_PORT ?? process.env.MYSQLPORT ?? process.env.MYSQL_PORT ?? "3306",
    DB_USER: process.env.DB_USER ?? process.env.MYSQLUSER ?? process.env.MYSQL_USER ?? "root",
    DB_PASSWORD:
      process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? process.env.MYSQL_PASSWORD ?? "",
    DB_NAME:
      process.env.DB_NAME ??
      process.env.MYSQLDATABASE ??
      process.env.MYSQL_DATABASE ??
      "railway",
    source: process.env.DB_HOST ? "DB_*" : "MYSQL*",
  };
}

function upsertEnvFile(path, updates) {
  const lines = readFileSync(path, "utf8").split("\n");
  const seen = new Set();
  const out = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (dbKeys.includes(key)) {
      if (!seen.has(key)) {
        seen.add(key);
        out.push(`${key}=${updates[key] ?? ""}`);
      }
      continue;
    }
    out.push(line);
  }

  for (const key of dbKeys) {
    if (!seen.has(key)) {
      out.push(`${key}=${updates[key] ?? ""}`);
    }
  }

  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

const db = resolveDbFromEnv();

if (!db?.DB_HOST) {
  console.error(
    "Nenhuma credencial de banco no ambiente.\n" +
      "Exporte DB_* ou MYSQL* (Railway), ou rode: bash scripts/use-railway-db.sh",
  );
  process.exit(1);
}

if (/^localhost$/i.test(db.DB_HOST) || db.DB_HOST === "127.0.0.1") {
  console.error(`DB_HOST=${db.DB_HOST} e local. Use o host publico do MySQL no Railway.`);
  process.exit(1);
}

if (!existsSync(envLocalPath)) {
  console.error(`Arquivo nao encontrado: ${envLocalPath}`);
  process.exit(1);
}

writeFileSync(envLocalPath, upsertEnvFile(envLocalPath, db), "utf8");

console.log(`Atualizado ${envLocalPath} (${db.source})`);
console.log(`  DB_HOST=${db.DB_HOST}`);
console.log(`  DB_PORT=${db.DB_PORT}`);
console.log(`  DB_USER=${db.DB_USER}`);
console.log(`  DB_NAME=${db.DB_NAME}`);
