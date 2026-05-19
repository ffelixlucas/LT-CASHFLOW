#!/usr/bin/env node
/**
 * Seed isolado para E2E multitenant (usuários @ltcashflow.test).
 * Requer banco de teste: DB_NAME com "e2e" ou E2E_ALLOW_SEED=1.
 *
 * Uso: pnpm --filter web seed:e2e
 * Env: apps/web/.env.test (copie de .env.test.example)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const seedStatePath = resolve(webRoot, "e2e/.seed-state.json");

const E2E_PASSWORD = "E2eTestPass123!";
const E2E_EMAIL_DOMAIN = "@ltcashflow.test";
const E2E_EMAIL_PREFIX = "e2e-";

const USERS = {
  editorA: { email: `${E2E_EMAIL_PREFIX}editor-a${E2E_EMAIL_DOMAIN}`, nome: "E2E Editor A" },
  editorB: { email: `${E2E_EMAIL_PREFIX}editor-b${E2E_EMAIL_DOMAIN}`, nome: "E2E Editor B" },
  viewerA: { email: `${E2E_EMAIL_PREFIX}viewer-a${E2E_EMAIL_DOMAIN}`, nome: "E2E Viewer A" },
};

const GESTAO_A = {
  nome: "E2E Gestão A",
  descricao: "E2E_GESTAO_A_MARKER",
  tipo: "pessoal",
};
const GESTAO_B = {
  nome: "E2E Gestão B",
  descricao: "E2E_GESTAO_B_MARKER",
  tipo: "pessoal",
};

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return {};
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

function assertSafeToSeed(env) {
  if (env.NODE_ENV === "production") {
    console.error(
      "Recusa de seed E2E: NODE_ENV=production. O seed nunca roda em deploy familiar/produção.",
    );
    process.exit(1);
  }

  const dbName = (env.DB_NAME ?? "").toLowerCase();
  const allow = env.E2E_ALLOW_SEED === "1";
  const looksLikeTestDb = dbName.includes("e2e") || dbName.includes("test");

  if (allow && !looksLikeTestDb) {
    console.error(
      [
        "Recusa de seed E2E: E2E_ALLOW_SEED=1 exige DB_NAME com 'e2e' ou 'test'.",
        `DB_NAME atual: ${env.DB_NAME ?? "(vazio)"}`,
      ].join("\n"),
    );
    process.exit(1);
  }

  if (allow || looksLikeTestDb) {
    return;
  }

  console.error(
    [
      "Recusa de seed E2E: banco não parece ser de teste.",
      `DB_NAME atual: ${env.DB_NAME ?? "(vazio)"}`,
      "Use DB_NAME com 'e2e' ou 'test', ou defina E2E_ALLOW_SEED=1 em apps/web/.env.test.",
      "Nunca rode seed E2E no banco de produção ou dados pessoais.",
    ].join("\n"),
  );
  process.exit(1);
}

async function cleanupE2e(conn) {
  const [users] = await conn.query(
    `SELECT id FROM usuarios WHERE email LIKE ?`,
    [`${E2E_EMAIL_PREFIX}%${E2E_EMAIL_DOMAIN}`],
  );

  const userIds = users.map((row) => row.id);
  if (userIds.length === 0) {
    return;
  }

  const [gestoes] = await conn.query(
    `
      SELECT DISTINCT g.id
      FROM gestoes g
      INNER JOIN gestao_membros gm ON gm.gestao_id = g.id
      WHERE gm.usuario_id IN (?)
    `,
    [userIds],
  );

  const gestaoIds = gestoes.map((row) => row.id);

  await conn.query("SET FOREIGN_KEY_CHECKS = 0");

  if (gestaoIds.length > 0) {
    const placeholders = gestaoIds.map(() => "?").join(",");
    const tablesWithGestaoId = [
      "lancamentos",
      "gastos_fixos",
      "gestao_planos_fixos_mes",
      "gestao_planos_fixos_template",
      "fechamentos_periodo",
      "contas",
      "categorias",
      "gestao_membros",
    ];

    for (const table of tablesWithGestaoId) {
      try {
        await conn.query(`DELETE FROM ${table} WHERE gestao_id IN (${placeholders})`, gestaoIds);
      } catch {
        // Tabela pode não existir em ambientes antigos — ignorar.
      }
    }

    await conn.query(`DELETE FROM gestoes WHERE id IN (${placeholders})`, gestaoIds);
  }

  await conn.query(`DELETE FROM usuarios WHERE id IN (${userIds.map(() => "?").join(",")})`, userIds);
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");
}

async function insertUser(conn, { nome, email }, senhaHash) {
  const [result] = await conn.query(
    `INSERT INTO usuarios (nome, email, senha_hash, status) VALUES (?, ?, ?, 'ativo')`,
    [nome, email, senhaHash],
  );
  return result.insertId;
}

async function createGestao(conn, ownerUserId, gestao) {
  const [gestaoResult] = await conn.query(
    `
      INSERT INTO gestoes (nome, descricao, tipo, criado_por_usuario_id, status)
      VALUES (?, ?, ?, ?, 'ativa')
    `,
    [gestao.nome, gestao.descricao, gestao.tipo, ownerUserId],
  );

  const gestaoId = gestaoResult.insertId;

  await conn.query(
    `
      INSERT INTO gestao_membros (gestao_id, usuario_id, papel, status)
      VALUES (?, ?, 'proprietario', 'ativo')
    `,
    [gestaoId, ownerUserId],
  );

  const [contaResult] = await conn.query(
    `
      INSERT INTO contas (gestao_id, criado_por_usuario_id, nome, tipo, instituicao, saldo_inicial)
      VALUES (?, ?, 'Conta E2E', 'corrente', 'E2E', 0.00)
    `,
    [gestaoId, ownerUserId],
  );

  await conn.query(
    `
      INSERT INTO categorias (gestao_id, criada_por_usuario_id, nome, natureza, sistema)
      VALUES (?, ?, 'E2E Despesa', 'despesa', 1)
    `,
    [gestaoId, ownerUserId],
  );

  const [categoriaRows] = await conn.query(
    `SELECT id FROM categorias WHERE gestao_id = ? ORDER BY id ASC LIMIT 1`,
    [gestaoId],
  );

  return {
    id: gestaoId,
    nome: gestao.nome,
    marker: gestao.descricao,
    contaId: contaResult.insertId,
    categoriaId: categoriaRows[0]?.id ?? null,
  };
}

async function main() {
  const envFile = process.env.E2E_ENV_FILE ?? resolve(webRoot, ".env.test");
  const fileEnv = loadEnvFile(envFile);
  const env = { ...fileEnv, ...process.env };
  assertSafeToSeed(env);

  const conn = await mysql.createConnection({
    host: env.DB_HOST ?? "127.0.0.1",
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? "root",
    password: env.DB_PASSWORD ?? "",
    database: env.DB_NAME ?? "lt_cashflow_e2e",
    multipleStatements: true,
  });

  try {
    const senhaHash = await bcrypt.hash(E2E_PASSWORD, 12);

    await cleanupE2e(conn);
    await conn.beginTransaction();

    const editorAId = await insertUser(conn, USERS.editorA, senhaHash);
    const editorBId = await insertUser(conn, USERS.editorB, senhaHash);
    const viewerAId = await insertUser(conn, USERS.viewerA, senhaHash);

    const gestaoA = await createGestao(conn, editorAId, GESTAO_A);
    const gestaoB = await createGestao(conn, editorBId, GESTAO_B);

    await conn.query(
      `
        INSERT INTO gestao_membros (gestao_id, usuario_id, papel, status)
        VALUES (?, ?, 'visualizador', 'ativo')
      `,
      [gestaoA.id, viewerAId],
    );

    await conn.commit();

    const seedState = {
      seededAt: new Date().toISOString(),
      dbFingerprint: createHash("sha256")
        .update(`${env.DB_HOST}:${env.DB_NAME}`)
        .digest("hex")
        .slice(0, 12),
      password: E2E_PASSWORD,
      users: {
        editorA: { ...USERS.editorA, id: editorAId },
        editorB: { ...USERS.editorB, id: editorBId },
        viewerA: { ...USERS.viewerA, id: viewerAId },
      },
      gestoes: {
        a: gestaoA,
        b: gestaoB,
      },
    };

    writeFileSync(seedStatePath, `${JSON.stringify(seedState, null, 2)}\n`, "utf8");
    console.log(`Seed E2E gravado em ${seedStatePath}`);
    console.log(`Gestão A id=${gestaoA.id} | Gestão B id=${gestaoB.id}`);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
