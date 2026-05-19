#!/usr/bin/env node
/**
 * Prepara MySQL de teste/CI: cria DB e aplica schema consolidado.
 * Não usa Railway nem .env.local — apenas variáveis DB_* do ambiente.
 *
 * Requisito: DB_NAME deve conter "e2e" ou "test" (ou CI=true).
 *
 * Uso: DB_NAME=lt_cashflow_e2e DB_PASSWORD=... node scripts/ci-mysql-init.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const schemaPath = resolve(repoRoot, "backend/database/schema.sql");

const GESTOES_PATCHES = [
  "ALTER TABLE gestoes ADD COLUMN inicio_em DATETIME NULL",
  "ALTER TABLE gestoes ADD COLUMN percentual_reserva DECIMAL(5,2) NOT NULL DEFAULT 10.00",
];

function assertCiDatabaseTarget() {
  const dbName = (process.env.DB_NAME ?? "").toLowerCase();
  const isCi = process.env.CI === "true" || process.env.CI === "1";
  const looksLikeTestDb = dbName.includes("e2e") || dbName.includes("test");

  if (isCi && looksLikeTestDb) {
    return;
  }

  if (looksLikeTestDb) {
    return;
  }

  console.error(
    [
      "Recusa de ci-mysql-init: DB_NAME não parece banco de teste.",
      `DB_NAME=${process.env.DB_NAME ?? "(vazio)"}`,
      'Use nome com "e2e" ou "test", ou rode em CI com DB_NAME=lt_cashflow_e2e.',
    ].join("\n"),
  );
  process.exit(1);
}

function adaptSchemaSql(raw, database) {
  return raw
    .replace(/CREATE DATABASE IF NOT EXISTS lt_cashflow[\s\S]*?;/i, "")
    .replace(/\bUSE lt_cashflow\s*;/gi, "")
    .replace(/\blt_cashflow\b/g, database);
}

async function waitForMysql(config, attempts = 30) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const conn = await mysql.createConnection({ ...config, multipleStatements: true });
      await conn.query("SELECT 1");
      await conn.end();
      return;
    } catch (error) {
      if (i === attempts) {
        throw error;
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 2000));
    }
  }
}

async function applyGestoesPatches(conn) {
  for (const sql of GESTOES_PATCHES) {
    try {
      await conn.query(sql);
    } catch (error) {
      const code = error?.code;
      if (code === "ER_DUP_FIELDNAME") {
        continue;
      }
      throw error;
    }
  }
}

async function main() {
  assertCiDatabaseTarget();

  const database = process.env.DB_NAME ?? "lt_cashflow_e2e";
  const config = {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  };

  console.log(`[ci-mysql-init] Aguardando MySQL em ${config.host}:${config.port}...`);
  await waitForMysql(config);

  const admin = await mysql.createConnection(config);
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  await admin.end();

  const schemaSql = adaptSchemaSql(readFileSync(schemaPath, "utf8"), database);
  const conn = await mysql.createConnection({ ...config, database });
  console.log(`[ci-mysql-init] Aplicando ${schemaPath} em ${database}...`);
  await conn.query(schemaSql);
  await applyGestoesPatches(conn);
  await conn.end();

  console.log(`[ci-mysql-init] Schema pronto em ${database}.`);
  console.log(
    "[ci-mysql-init] Migrations incrementais (backend/database/migrations) não rodam aqui — schema.sql consolidado + patch gestoes.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
