import "server-only";

import {
  computeFaturaCompetenciaParaCompra,
  computeSaldoFaturaCartao,
  normalizeFaturaMesKey,
  resolveFaturaCompetenciaAberta,
} from "@ltcashflow/finance-core";
import { planoFixosMesItemSchema } from "@ltcashflow/validation";
import type { LancamentoMeio, PlanoFixosMesItem } from "@ltcashflow/validation";
import { z } from "zod";
import { addCalendarMonths, buildMonthCalendarDate } from "@/lib/date";
import { pool } from "@ltcashflow/db";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

import {
  assertLancamentoIdsInGestao,
  ensureFinancialRefsInGestao,
  type GestaoMemberRole,
} from "@/lib/server/gestao-access";

export type { GestaoMemberRole } from "@/lib/server/gestao-access";
export { getUserGestaoRole, userHasGestaoAccess } from "@/lib/server/gestao-access";

export type UserRow = RowDataPacket & {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
};

export type GestaoRow = RowDataPacket & {
  id: number;
  nome: string;
  descricao: string | null;
  tipo: "pessoal" | "familiar" | "profissional" | "projeto";
  inicio_em?: Date;
  percentual_reserva: string | null;
  papel?: GestaoMemberRole;
};

export type ContaRow = RowDataPacket & {
  id: number;
  nome: string;
  tipo: string;
  instituicao: string | null;
  saldo_inicial: string | null;
  saldo_inicial_em: string | null;
  limite_credito: string | null;
  fechamento_dia: number | null;
  vencimento_dia: number | null;
};

export type CategoriaRow = RowDataPacket & {
  id: number;
  nome: string;
  natureza: "receita" | "despesa" | "ambos";
};

type ContaResolucaoCartaoRow = RowDataPacket & {
  id: number;
  nome: string;
  tipo: string;
  instituicao: string | null;
};

export type LancamentoRow = RowDataPacket & {
  id: number;
  conta_id: number;
  conta_destino_id: number | null;
  conta_destino_tipo: string | null;
  categoria_id: number | null;
  criado_por_usuario_id: number | null;
  tipo: string;
  status: string;
  meio: LancamentoMeio | null;
  descricao: string;
  valor_total: string;
  competencia_data: string;
  fatura_competencia_data: string | null;
  competencia_hora: string | null;
  vencimento_data: string | null;
  categoria_nome: string | null;
  conta_nome: string;
  conta_destino_nome: string | null;
  conta_tipo: string;
  is_abertura?: boolean;
};

type LancamentoListItem = {
  id: number;
  conta_id: number;
  conta_destino_id: number | null;
  conta_destino_tipo: string | null;
  categoria_id: number | null;
  criado_por_usuario_id: number | null;
  tipo: string;
  status: string;
  meio: LancamentoMeio | null;
  descricao: string;
  valor_total: string;
  competencia_data: string;
  fatura_competencia_data: string | null;
  competencia_hora: string | null;
  vencimento_data: string | null;
  categoria_nome: string | null;
  conta_nome: string;
  conta_destino_nome: string | null;
  conta_tipo: string;
  is_abertura?: boolean;
};

export type SearchLancamentosInput = {
  gestaoId: number;
  text?: string;
  tipo?: "receita" | "despesa" | "ajuste" | "transferencia";
  meio?: LancamentoMeio;
  contaId?: number;
  categoriaId?: number;
  minValor?: number;
  maxValor?: number;
  dateFrom?: string;
  dateTo?: string;
  dateField?: "competencia" | "fatura";
  order?: "asc" | "desc";
};

export type SummaryRow = RowDataPacket & {
  receitas: string | null;
  despesas: string | null;
  saldo: string | null;
};

export type AvailableBalanceRow = RowDataPacket & {
  saldo_disponivel: string | null;
};

export type CashOverviewRow = RowDataPacket & {
  entradas_em_conta: string | null;
  despesas: string | null;
  saidas_da_conta: string | null;
};

export type PeriodResumoRow = RowDataPacket & {
  receitas: string | null;
  despesas: string | null;
  guardado: string | null;
  credito: string | null;
  debito: string | null;
  pix: string | null;
  total: string | null;
  abertura: string | null;
};

export type ContaCorrentePeriodoResumoRow = RowDataPacket & {
  entradas: string | null;
  saidas: string | null;
  pagamentos_fatura: string | null;
  saidas_total: string | null;
  guardado: string | null;
  resgatado: string | null;
  debito: string | null;
  pix: string | null;
  credito: string | null;
  saldo: string | null;
  sobra: string | null;
};

export type GestaoMembroResumoRow = RowDataPacket & {
  usuario_id: number;
  nome: string;
  email: string;
  papel: GestaoMemberRole;
  status: "ativo" | "inativo";
  receitas: string | null;
  despesas: string | null;
  total: string | null;
  movimentos: number;
};

/** Saldos agregados por natureza da conta (sem cartão de crédito). */
export type GestaoSaldosPorBucket = {
  disponivel: string;
  poupanca: string;
  investimento: string;
};

export type CashAccountBreakdownRow = RowDataPacket & {
  id: number;
  nome: string;
  tipo: string;
  saldo_inicial: string | null;
  entradas_em_conta: string | null;
  despesas: string | null;
  saidas_da_conta: string | null;
  saldo_atual: string | null;
  quantidade_movimentos: number;
};

export type GastoFixoRow = RowDataPacket & {
  id: number;
  gestao_id: number;
  conta_id: number;
  categoria_id: number;
  nome: string;
  descricao: string | null;
  valor_estimado: string;
  dia_vencimento: number;
  meio: LancamentoMeio | null;
  status: "ativo" | "inativo";
  conta_nome: string;
  categoria_nome: string;
  lancamento_mes_id: number | null;
  lancamento_mes_status: "previsto" | "pendente" | "liquidado" | "cancelado" | null;
};

export type GastoFixoSugestaoRow = RowDataPacket & {
  descricao: string;
  conta_id: number;
  categoria_id: number;
  conta_nome: string;
  categoria_nome: string;
  meio: LancamentoMeio | null;
  valor_medio: string;
  meses: number;
  ocorrencias: number;
  ultimo_dia: number;
};

export type CreditCardAccountRow = RowDataPacket & {
  id: number;
  nome: string;
  tipo: string;
  limite_credito: string | null;
  fechamento_dia: number | null;
  vencimento_dia: number | null;
};

export type CreditCardStatementMovementRow = RowDataPacket & {
  id: number;
  conta_id: number;
  conta_destino_id: number | null;
  tipo: "receita" | "despesa" | "transferencia" | "ajuste";
  status: "previsto" | "pendente" | "liquidado" | "cancelado";
  valor_total: string;
  competencia_data: string;
  fatura_competencia_data: string | null;
};

type SqlFilters = {
  conditions: string[];
  params: Array<string | number>;
};

async function registerAudit(input: {
  userId?: number;
  gestaoId: number;
  action: string;
  module: string;
  entity: string;
  entityId?: number;
  details?: Record<string, unknown>;
}) {
  try {
    await pool.query(
      `
        INSERT INTO auditoria (
          usuario_id,
          gestao_id,
          acao,
          modulo,
          entidade,
          entidade_id,
          origem,
          detalhes
        ) VALUES (?, ?, ?, ?, ?, ?, 'app_web', ?)
      `,
      [
        input.userId && input.userId > 0 ? input.userId : null,
        input.gestaoId,
        input.action,
        input.module,
        input.entity,
        input.entityId ?? null,
        input.details ? JSON.stringify(input.details) : null,
      ],
    );
  } catch {
    // Auditoria nunca deve bloquear o fluxo financeiro principal.
  }
}

const ORDER_BY_LANCAMENTO_RECIENTE_DESC =
  "l.competencia_data DESC, COALESCE(l.competencia_hora, TIME(l.criado_em)) DESC, l.criado_em DESC";
const ORDER_BY_LANCAMENTO_RECIENTE_ASC =
  "l.competencia_data ASC, COALESCE(l.competencia_hora, TIME(l.criado_em)) ASC, l.criado_em ASC";
const ORDER_BY_LANCAMENTO_FATURA_DESC =
  "COALESCE(l.fatura_competencia_data, l.competencia_data) DESC, COALESCE(l.competencia_hora, TIME(l.criado_em)) DESC, l.criado_em DESC";
const ORDER_BY_LANCAMENTO_FATURA_ASC =
  "COALESCE(l.fatura_competencia_data, l.competencia_data) ASC, COALESCE(l.competencia_hora, TIME(l.criado_em)) ASC, l.criado_em ASC";

/** Mês / período na gestão: fatura do cartão (quando preenchida), senão competência (ex.: data do banco). */
const SQL_L_DATA_RECORTE_GESTAO = "COALESCE(l.fatura_competencia_data, l.competencia_data)";
const SQL_DATA_RECORTE_GESTAO = "COALESCE(fatura_competencia_data, competencia_data)";

/**
 * Previsto criado automaticamente pelo cadastro de gasto fixo.
 * Não entra em totais de fluxo (mês/semana/categorias) para não somar em paralelo à despesa real
 * nem duplicar o que já aparece no painel Contas fixas.
 * Usa COALESCE no JSON para evitar que `NULL = 'gasto_fixo'` exclua previstos legítimos (metadados vazio).
 */
function sqlLancamentoNaoEhPrevistoSinteticoGastoFixo(alias: string): string {
  return `NOT (
    ${alias}.tipo = 'despesa'
    AND ${alias}.status = 'previsto'
    AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${alias}.metadados, '$.origem')), '') = 'gasto_fixo'
  )`;
}

function sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare(): string {
  return `NOT (
    tipo = 'despesa'
    AND status = 'previsto'
    AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.origem')), '') = 'gasto_fixo'
  )`;
}

/**
 * Lançamento real marcado como conta fixa: permanece no mês, fatura e extrato,
 * mas não entra nas somas do fechamento semanal (Dia a dia / KPIs da semana).
 */
function sqlLancamentoEntraFechamentoSemanal(alias: string): string {
  return `COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${alias}.metadados, '$.excluir_fechamento_semanal')), '') NOT IN ('true', '1')`;
}

/** Inclui lançamentos em que a conta aparece como origem ou destino (transferências). */
const JOIN_LANCAMENTOS_NA_CONTA =
  "LEFT JOIN lancamentos l ON (l.conta_id = ct.id OR l.conta_destino_id = ct.id)";

/** Variação de saldo por lançamento na conta `ct` após `JOIN_LANCAMENTOS_NA_CONTA`. */
const CASE_DELTA_SALDO_NA_CONTA = `
  CASE
    WHEN l.status <> 'liquidado' THEN 0
    WHEN l.tipo = 'receita' THEN l.valor_total
    WHEN l.tipo = 'despesa' THEN -l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_id = ct.id THEN -l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_destino_id = ct.id THEN l.valor_total
    ELSE 0
  END
`;

const CASE_ENTRADA_NA_CONTA = `
  CASE
    WHEN l.status <> 'liquidado' THEN 0
    WHEN l.tipo = 'receita' THEN l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_destino_id = ct.id THEN l.valor_total
    ELSE 0
  END
`;

const CASE_DESPESA_SEM_SAIDA_CONTA = `
  CASE
    WHEN l.status <> 'liquidado' THEN 0
    WHEN l.tipo = 'despesa' AND COALESCE(c.nome, '') <> 'Saida da conta' THEN l.valor_total
    ELSE 0
  END
`;

const CASE_SAIDA_DA_CONTA_AGREGADA = `
  CASE
    WHEN l.status <> 'liquidado' THEN 0
    WHEN l.tipo = 'despesa' AND c.nome = 'Saida da conta' THEN l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_id = ct.id THEN l.valor_total
    ELSE 0
  END
`;

async function syncGestaoInicioEm(connection: PoolConnection, gestaoId: number) {
  void connection;
  void gestaoId;
}

export async function findUserByEmail(email: string) {
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT id, nome, email, senha_hash
      FROM usuarios
      WHERE email = ?
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT id, nome, email, senha_hash
      FROM usuarios
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
}

export async function createUser(input: {
  nome: string;
  email: string;
  senhaHash: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO usuarios (nome, email, senha_hash)
      VALUES (?, ?, ?)
    `,
    [input.nome, input.email, input.senhaHash],
  );

  return result.insertId;
}

export async function listUserGestoes(userId: number) {
  const [rows] = await pool.query<GestaoRow[]>(
    `
      SELECT g.id, g.nome, g.descricao, g.tipo, g.inicio_em, g.percentual_reserva, gm.papel
      FROM gestoes g
      INNER JOIN gestao_membros gm
        ON gm.gestao_id = g.id
      WHERE gm.usuario_id = ?
        AND gm.status = 'ativo'
        AND g.status = 'ativa'
      ORDER BY g.criado_em ASC
    `,
    [userId],
  );

  return rows;
}

export type GestaoMemberRow = RowDataPacket & {
  usuario_id: number;
  nome: string;
  email: string;
  papel: GestaoMemberRole;
  status: "ativo" | "inativo";
};

export async function listGestaoMembros(gestaoId: number) {
  const [rows] = await pool.query<GestaoMemberRow[]>(
    `
      SELECT
        gm.usuario_id,
        u.nome,
        u.email,
        gm.papel,
        gm.status
      FROM gestao_membros gm
      INNER JOIN usuarios u
        ON u.id = gm.usuario_id
      WHERE gm.gestao_id = ?
      ORDER BY
        CASE gm.papel
          WHEN 'proprietario' THEN 1
          WHEN 'administrador' THEN 2
          WHEN 'editor' THEN 3
          ELSE 4
        END,
        u.nome ASC
    `,
    [gestaoId],
  );

  return rows;
}

export async function updateGestaoMembroPapel(input: {
  gestaoId: number;
  changedByUserId: number;
  memberUserId: number;
  papel: GestaoMemberRole;
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [targetRows] = await connection.query<Array<RowDataPacket & { papel: GestaoMemberRole }>>(
      `
        SELECT papel
        FROM gestao_membros
        WHERE gestao_id = ?
          AND usuario_id = ?
          AND status = 'ativo'
        LIMIT 1
      `,
      [input.gestaoId, input.memberUserId],
    );

    const target = targetRows[0];

    if (!target) {
      await connection.rollback();
      return false;
    }

    if (target.papel === "proprietario" && input.papel !== "proprietario") {
      const [ownerRows] = await connection.query<Array<RowDataPacket & { total: number }>>(
        `
          SELECT COUNT(*) AS total
          FROM gestao_membros
          WHERE gestao_id = ?
            AND status = 'ativo'
            AND papel = 'proprietario'
        `,
        [input.gestaoId],
      );

      const ownerCount = Number(ownerRows[0]?.total ?? 0);
      if (ownerCount <= 1) {
        await connection.rollback();
        return false;
      }
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        UPDATE gestao_membros
        SET papel = ?
        WHERE gestao_id = ?
          AND usuario_id = ?
          AND status = 'ativo'
      `,
      [input.papel, input.gestaoId, input.memberUserId],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    await connection.commit();

    await registerAudit({
      userId: input.changedByUserId,
      gestaoId: input.gestaoId,
      action: "update_role",
      module: "gestoes",
      entity: "gestao_membro",
      entityId: input.memberUserId,
      details: { papel: input.papel },
    });

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createGestaoWithDefaults(input: {
  userId: number;
  nome: string;
  descricao?: string;
  tipo: "pessoal" | "familiar" | "profissional" | "projeto";
  inicioEm?: string | null;
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [gestaoResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO gestoes (nome, descricao, tipo, criado_por_usuario_id)
        VALUES (?, ?, ?, ?)
      `,
      [input.nome, input.descricao ?? null, input.tipo, input.userId],
    );

    const gestaoId = gestaoResult.insertId;

    await connection.query(
      `
        INSERT INTO gestao_membros (gestao_id, usuario_id, papel)
        VALUES (?, ?, 'proprietario')
      `,
      [gestaoId, input.userId],
    );

    await connection.query(
      `
        INSERT INTO contas (gestao_id, criado_por_usuario_id, nome, tipo, instituicao, saldo_inicial)
        VALUES (?, ?, 'Conta principal', 'corrente', 'Manual', 0.00)
      `,
      [gestaoId, input.userId],
    );

    const categoriasPadrao = [
      ["Salario", "receita"],
      ["Freelance", "receita"],
      ["Alimentação/Moradia", "despesa"],
      ["Transporte", "despesa"],
      ["Saude", "despesa"],
      ["Lazer", "despesa"],
      ["Saida da conta", "despesa"],
      ["Outros", "ambos"],
    ];

    for (const [nome, natureza] of categoriasPadrao) {
      await connection.query(
        `
          INSERT INTO categorias (gestao_id, criada_por_usuario_id, nome, natureza, sistema)
          VALUES (?, ?, ?, ?, 1)
        `,
        [gestaoId, input.userId, nome, natureza],
      );
    }

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId,
      action: "create",
      module: "gestoes",
      entity: "gestao",
      entityId: gestaoId,
      details: { tipo: input.tipo, nome: input.nome },
    });

    return gestaoId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createGestaoWithOpeningBalances(input: {
  userId: number;
  nome: string;
  descricao?: string;
  tipo: "pessoal" | "familiar" | "profissional" | "projeto";
  inicioEm: string | null;
  contas: Array<{
    nome: string;
    tipo: "carteira" | "corrente" | "poupanca" | "cartao_credito" | "investimento" | "caixa" | "outro";
    instituicao?: string | null;
    saldoInicial: number;
    cartaoLimiteCredito?: number | null;
    cartaoFechamentoDia?: number | null;
    cartaoVencimentoDia?: number | null;
  }>;
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [gestaoResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO gestoes (nome, descricao, tipo, criado_por_usuario_id)
        VALUES (?, ?, ?, ?)
      `,
      [input.nome, input.descricao ?? null, input.tipo, input.userId],
    );

    const gestaoId = gestaoResult.insertId;

    await connection.query(
      `
        INSERT INTO gestao_membros (gestao_id, usuario_id, papel)
        VALUES (?, ?, 'proprietario')
      `,
      [gestaoId, input.userId],
    );

    for (const conta of input.contas) {
      await connection.query(
        `
          INSERT INTO contas (
            gestao_id,
            criado_por_usuario_id,
            nome,
            tipo,
            instituicao,
            saldo_inicial,
            limite_credito,
            fechamento_dia,
            vencimento_dia
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          gestaoId,
          input.userId,
          conta.nome,
          conta.tipo,
          conta.instituicao ?? "Manual",
          conta.tipo === "cartao_credito" && conta.saldoInicial > 0 ? -Math.abs(conta.saldoInicial) : conta.saldoInicial,
          conta.tipo === "cartao_credito" ? conta.cartaoLimiteCredito ?? null : null,
          conta.tipo === "cartao_credito" ? conta.cartaoFechamentoDia ?? null : null,
          conta.tipo === "cartao_credito" ? conta.cartaoVencimentoDia ?? null : null,
        ],
      );
    }

    const categoriasPadrao = [
      ["Salario", "receita"],
      ["Freelance", "receita"],
      ["Alimentação/Moradia", "despesa"],
      ["Transporte", "despesa"],
      ["Saude", "despesa"],
      ["Lazer", "despesa"],
      ["Saida da conta", "despesa"],
      ["Outros", "ambos"],
    ];

    for (const [nome, natureza] of categoriasPadrao) {
      await connection.query(
        `
          INSERT INTO categorias (gestao_id, criada_por_usuario_id, nome, natureza, sistema)
          VALUES (?, ?, ?, ?, 1)
        `,
        [gestaoId, input.userId, nome, natureza],
      );
    }

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId,
      action: "create",
      module: "gestoes",
      entity: "gestao",
      entityId: gestaoId,
        details: {
          tipo: input.tipo,
          nome: input.nome,
          inicioEm: input.inicioEm,
          openingBalances: input.contas.map((conta) => ({
            nome: conta.nome,
            tipo: conta.tipo,
            saldoInicial: conta.saldoInicial,
          })),
        },
      });

    return gestaoId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listContas(gestaoId: number) {
  const [rows] = await pool.query<ContaRow[]>(
    `
      SELECT
        id,
        nome,
        tipo,
        instituicao,
        COALESCE(saldo_inicial, 0) AS saldo_inicial,
        DATE_FORMAT(saldo_inicial_em, '%Y-%m-%d') AS saldo_inicial_em,
        limite_credito,
        fechamento_dia,
        vencimento_dia
      FROM contas
      WHERE gestao_id = ?
        AND ativa = 1
      ORDER BY criado_em ASC
    `,
    [gestaoId],
  );

  return rows;
}

function normalizeContaMatchingText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\b(banco|conta|cartao|cartao de credito|credito|credit|debito|pix)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contaMatchTokens(conta: ContaResolucaoCartaoRow) {
  const raw = `${conta.instituicao ?? ""} ${conta.nome}`;
  return normalizeContaMatchingText(raw)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function pickLinkedCreditCardConta(
  contas: ContaResolucaoCartaoRow[],
  contaOrigemId: number,
): ContaResolucaoCartaoRow | null {
  const origem = contas.find((conta) => conta.id === contaOrigemId);

  if (!origem || origem.tipo === "cartao_credito") {
    return origem ?? null;
  }

  const cartoes = contas.filter((conta) => conta.tipo === "cartao_credito");

  if (cartoes.length === 0) {
    return null;
  }

  const origemTokens = new Set(contaMatchTokens(origem));
  const origemInstituicao = normalizeContaMatchingText(origem.instituicao);
  const byInstitution =
    origemInstituicao.length > 0
      ? cartoes.find((cartao) => normalizeContaMatchingText(cartao.instituicao) === origemInstituicao)
      : null;

  if (byInstitution) {
    return byInstitution;
  }

  const byName = cartoes.find((cartao) => contaMatchTokens(cartao).some((token) => origemTokens.has(token)));

  if (byName) {
    return byName;
  }

  return cartoes.length === 1 ? (cartoes[0] ?? null) : null;
}

export async function resolveContaIdForLancamento(input: {
  gestaoId: number;
  contaId: number;
  tipo: "receita" | "despesa" | "ajuste" | "transferencia";
  meio?: LancamentoMeio | null;
}) {
  if (input.tipo !== "despesa" || input.meio !== "credito") {
    return input.contaId;
  }

  const [contas] = await pool.query<ContaResolucaoCartaoRow[]>(
    `
      SELECT id, nome, tipo, instituicao
      FROM contas
      WHERE gestao_id = ?
        AND ativa = 1
      ORDER BY criado_em ASC
    `,
    [input.gestaoId],
  );

  return pickLinkedCreditCardConta(contas, input.contaId)?.id ?? input.contaId;
}

function compareLancamentosDesc(a: LancamentoListItem, b: LancamentoListItem) {
  const da = a.fatura_competencia_data ?? a.competencia_data;
  const db = b.fatura_competencia_data ?? b.competencia_data;
  const dateDiff = db.localeCompare(da);

  if (dateDiff !== 0) {
    return dateDiff;
  }

  const timeA = a.competencia_hora ?? "00:00";
  const timeB = b.competencia_hora ?? "00:00";
  const timeDiff = timeB.localeCompare(timeA);

  if (timeDiff !== 0) {
    return timeDiff;
  }

  return b.id - a.id;
}

function buildOpeningLancamentos(
  contas: ContaRow[],
  input?: { contaId?: number; dateFrom?: string; dateTo?: string },
): LancamentoListItem[] {
  return contas.flatMap((conta) => {
    const saldoInicial = Number(conta.saldo_inicial ?? 0);
    const aberturaEm = conta.saldo_inicial_em;

    if (!aberturaEm || saldoInicial === 0) {
      return [];
    }

    if (input?.contaId && input.contaId !== conta.id) {
      return [];
    }

    if (input?.dateFrom && aberturaEm < input.dateFrom) {
      return [];
    }

    if (input?.dateTo && aberturaEm > input.dateTo) {
      return [];
    }

    return [
      {
        id: -1_000_000 - conta.id,
        conta_id: conta.id,
        conta_destino_id: null,
        conta_destino_tipo: null,
        categoria_id: null,
        criado_por_usuario_id: null,
        tipo: "abertura",
        status: "liquidado",
        meio: null,
        descricao: conta.tipo === "cartao_credito" ? "Abertura do cartao" : "Abertura da conta",
        valor_total: saldoInicial.toFixed(2),
        competencia_data: aberturaEm,
        fatura_competencia_data: null,
        competencia_hora: "00:00",
        vencimento_data: aberturaEm,
        categoria_nome: "Abertura",
        conta_nome: conta.nome,
        conta_destino_nome: null,
        conta_tipo: conta.tipo,
        is_abertura: true,
      } satisfies LancamentoListItem,
    ];
  });
}

export async function listCategorias(gestaoId: number) {
  const [rows] = await pool.query<CategoriaRow[]>(
    `
      SELECT id, nome, natureza
      FROM categorias
      WHERE gestao_id = ?
        AND ativa = 1
      ORDER BY nome ASC
    `,
    [gestaoId],
  );

  return rows;
}

export async function createConta(input: {
  gestaoId: number;
  userId: number;
  nome: string;
  tipo: string;
  instituicao?: string;
  saldoInicial: number;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO contas (gestao_id, criado_por_usuario_id, nome, tipo, instituicao, saldo_inicial)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [input.gestaoId, input.userId, input.nome, input.tipo, input.instituicao ?? null, input.saldoInicial],
  );

  await registerAudit({
    userId: input.userId,
    gestaoId: input.gestaoId,
    action: "create",
    module: "contas",
    entity: "conta",
    entityId: result.insertId,
    details: { nome: input.nome, tipo: input.tipo },
  });

  return result.insertId;
}

export async function updateContaNome(input: {
  gestaoId: number;
  contaId: number;
  nome: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE contas
      SET nome = ?
      WHERE id = ?
        AND gestao_id = ?
        AND ativa = 1
    `,
    [input.nome, input.contaId, input.gestaoId],
  );

  if (result.affectedRows > 0) {
    await registerAudit({
      userId: undefined,
      gestaoId: input.gestaoId,
      action: "update",
      module: "contas",
      entity: "conta",
      entityId: input.contaId,
      details: { nome: input.nome },
    });
  }

  return result.affectedRows > 0;
}

export async function updateGestaoPercentualReserva(input: {
  gestaoId: number;
  userId: number;
  percentualReserva: number;
}) {
  void input;
  return false;
}

export async function updateContaSaldoInicial(input: {
  gestaoId: number;
  contaId: number;
  saldoInicial: number;
  saldoInicialEm?: string | null;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE contas
      SET saldo_inicial = ?
      WHERE id = ?
        AND gestao_id = ?
        AND ativa = 1
    `,
    [input.saldoInicial, input.contaId, input.gestaoId],
  );

  if (result.affectedRows > 0) {
    await registerAudit({
      userId: undefined,
      gestaoId: input.gestaoId,
      action: "update",
      module: "contas",
      entity: "conta",
      entityId: input.contaId,
      details: { saldoInicial: input.saldoInicial, saldoInicialEm: input.saldoInicialEm ?? null },
    });
  }

  return result.affectedRows > 0;
}

export async function deactivateContasExcept(input: {
  gestaoId: number;
  keepContaIds: number[];
}) {
  if (input.keepContaIds.length === 0) {
    return 0;
  }

  const placeholders = input.keepContaIds.map(() => "?").join(", ");
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE contas
      SET ativa = 0
      WHERE gestao_id = ?
        AND ativa = 1
        AND id NOT IN (${placeholders})
    `,
    [input.gestaoId, ...input.keepContaIds],
  );

  if (result.affectedRows > 0) {
    await registerAudit({
      userId: undefined,
      gestaoId: input.gestaoId,
      action: "deactivate",
      module: "contas",
      entity: "conta",
      details: { keepContaIds: input.keepContaIds, affectedRows: result.affectedRows },
    });
  }

  return result.affectedRows;
}

export async function createCategoria(input: {
  gestaoId: number;
  userId: number;
  nome: string;
  natureza: "receita" | "despesa" | "ambos";
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO categorias (gestao_id, criada_por_usuario_id, nome, natureza)
      VALUES (?, ?, ?, ?)
    `,
    [input.gestaoId, input.userId, input.nome, input.natureza],
  );

  await registerAudit({
    userId: input.userId,
    gestaoId: input.gestaoId,
    action: "create",
    module: "categorias",
    entity: "categoria",
    entityId: result.insertId,
    details: { nome: input.nome, natureza: input.natureza },
  });

  return result.insertId;
}

export async function updateCategoria(input: {
  gestaoId: number;
  userId: number;
  categoriaId: number;
  nome: string;
  natureza: "receita" | "despesa" | "ambos";
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE categorias
      SET nome = ?, natureza = ?
      WHERE id = ?
        AND gestao_id = ?
        AND ativa = 1
    `,
    [input.nome, input.natureza, input.categoriaId, input.gestaoId],
  );

  if (result.affectedRows > 0) {
    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "update",
      module: "categorias",
      entity: "categoria",
      entityId: input.categoriaId,
      details: { nome: input.nome, natureza: input.natureza },
    });
  }

  return result.affectedRows > 0;
}

export { computeFaturaCompetenciaParaCompra } from "@ltcashflow/finance-core";

export async function createLancamento(input: {
  gestaoId: number;
  contaId: number;
  contaDestinoId?: number | null;
  categoriaId?: number | null;
  userId: number;
  tipo: "receita" | "despesa" | "ajuste" | "transferencia";
  status: "previsto" | "pendente" | "liquidado";
  meio?: LancamentoMeio;
  descricao: string;
  valorTotal: number;
  competenciaData: string;
  faturaCompetenciaData?: string;
  competenciaHora?: string;
  vencimentoData?: string;
}) {
  const contaId = await resolveContaIdForLancamento({
    gestaoId: input.gestaoId,
    contaId: input.contaId,
    tipo: input.tipo,
    meio: input.meio,
  });

  await ensureFinancialRefsInGestao({
    gestaoId: input.gestaoId,
    contaId,
    categoriaId: input.categoriaId ?? null,
    contaDestinoId: input.contaDestinoId ?? null,
  });

  if (input.tipo === "transferencia") {
    if (!input.contaDestinoId) {
      throw new Error("Conta destino obrigatoria para transferencia.");
    }

    return createTransferencia({
      gestaoId: input.gestaoId,
      contaOrigemId: input.contaId,
      contaDestinoId: input.contaDestinoId,
      userId: input.userId,
      status: input.status,
      descricao: input.descricao,
      valorTotal: input.valorTotal,
      competenciaData: input.competenciaData,
      competenciaHora: input.competenciaHora,
      vencimentoData: input.vencimentoData,
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Se for compra no cartão e a `fatura_competencia_data` não foi informada,
    // calcula automaticamente baseado no fechamento_dia da conta — assim a
    // compra entra na fatura correta mesmo quando criada pela IA / quick-add.
    let faturaCompetenciaResolved = input.faturaCompetenciaData || null;
    if (!faturaCompetenciaResolved && input.tipo === "despesa") {
      const [contaRows] = await connection.query<Array<RowDataPacket & { tipo: string; fechamento_dia: number | null }>>(
        `SELECT tipo, fechamento_dia FROM contas WHERE id = ? AND gestao_id = ? LIMIT 1`,
        [contaId, input.gestaoId],
      );
      const contaInfo = contaRows[0];
      if (contaInfo && contaInfo.tipo === "cartao_credito") {
        const fechamentoDia = Number(contaInfo.fechamento_dia ?? 1);
        if (fechamentoDia >= 1 && fechamentoDia <= 31) {
          faturaCompetenciaResolved = computeFaturaCompetenciaParaCompra(
            input.competenciaData,
            fechamentoDia,
          );
        }
      }
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO lancamentos (
          gestao_id,
          conta_id,
          categoria_id,
          criado_por_usuario_id,
          tipo,
          status,
          meio,
          descricao,
          valor_total,
          competencia_data,
          fatura_competencia_data,
          competencia_hora,
          vencimento_data,
          liquidado_em
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.gestaoId,
        contaId,
        input.categoriaId ?? null,
        input.userId,
        input.tipo,
        input.status,
        input.meio ?? null,
        input.descricao,
        input.valorTotal,
        input.competenciaData,
        faturaCompetenciaResolved,
        input.competenciaHora ?? null,
        input.vencimentoData || null,
        input.status === "liquidado" ? new Date() : null,
      ],
    );

    await connection.query(
      `
        INSERT INTO lancamento_rateios (lancamento_id, usuario_id, valor, percentual)
        VALUES (?, ?, ?, 100)
      `,
      [result.insertId, input.userId, input.valorTotal],
    );

    await syncGestaoInicioEm(connection, input.gestaoId);

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "create",
      module: "lancamentos",
      entity: "lancamento",
      entityId: result.insertId,
      details: { tipo: input.tipo, status: input.status, valorTotal: input.valorTotal },
    });

    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Cria N despesas no cartão (uma por parcela), competência e fatura avançando mês a mês.
 * A primeira fatura segue `computeFaturaCompetenciaParaCompra` a partir da primeira competência.
 */
export async function createParcelamentoNoCartao(input: {
  gestaoId: number;
  userId: number;
  contaId: number;
  categoriaId: number;
  status: "previsto" | "pendente" | "liquidado";
  descricaoBase: string;
  valorParcela: number;
  totalParcelas: number;
  primeiraCompetenciaData: string;
  competenciaHora?: string | null;
}): Promise<{ ids: number[] }> {
  await ensureFinancialRefsInGestao({
    gestaoId: input.gestaoId,
    contaId: input.contaId,
    categoriaId: input.categoriaId,
  });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [contaRows] = await connection.query<Array<RowDataPacket & { tipo: string; fechamento_dia: number | null }>>(
      `
        SELECT tipo, fechamento_dia
        FROM contas
        WHERE id = ?
          AND gestao_id = ?
        LIMIT 1
      `,
      [input.contaId, input.gestaoId],
    );
    const conta = contaRows[0];
    if (!conta || conta.tipo !== "cartao_credito") {
      throw new Error("Conta invalida para parcelamento.");
    }

    const fechamentoDia = Number(conta.fechamento_dia ?? 1);
    const fechamentoSeguro = fechamentoDia >= 1 && fechamentoDia <= 31 ? fechamentoDia : 1;
    const faturaPrimeiraParcela = computeFaturaCompetenciaParaCompra(
      input.primeiraCompetenciaData,
      fechamentoSeguro,
    );

    const base = input.descricaoBase.trim();
    const ids: number[] = [];
    const competenciaHora = input.competenciaHora ?? null;
    const liquidadoEm = input.status === "liquidado" ? new Date() : null;

    for (let k = 1; k <= input.totalParcelas; k++) {
      const competencia = addCalendarMonths(input.primeiraCompetenciaData, k - 1);
      const faturaCompetencia = addCalendarMonths(faturaPrimeiraParcela, k - 1);
      const descricao = `${base} (Parcela ${k} de ${input.totalParcelas})`;

      const [result] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO lancamentos (
            gestao_id,
            conta_id,
            categoria_id,
            criado_por_usuario_id,
            tipo,
            status,
            meio,
            descricao,
            valor_total,
            competencia_data,
            fatura_competencia_data,
            competencia_hora,
            vencimento_data,
            liquidado_em
          )
          VALUES (?, ?, ?, ?, 'despesa', ?, 'credito', ?, ?, ?, ?, ?, NULL, ?)
        `,
        [
          input.gestaoId,
          input.contaId,
          input.categoriaId,
          input.userId,
          input.status,
          descricao,
          input.valorParcela,
          competencia,
          faturaCompetencia,
          competenciaHora,
          liquidadoEm,
        ],
      );

      await connection.query(
        `
          INSERT INTO lancamento_rateios (lancamento_id, usuario_id, valor, percentual)
          VALUES (?, ?, ?, 100)
        `,
        [result.insertId, input.userId, input.valorParcela],
      );

      ids.push(result.insertId);
    }

    await syncGestaoInicioEm(connection, input.gestaoId);

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "create",
      module: "lancamentos",
      entity: "lancamento",
      entityId: ids[0] ?? 0,
      details: {
        parcelamento_cartao: true,
        quantidade: input.totalParcelas,
        ids: ids.slice(0, 40),
      },
    });

    return { ids };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function ensureGastoFixoLancamentoMes(input: {
  gastoFixoId: number;
  gestaoId: number;
  userId: number;
  anoMes: string;
}) {
  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        id: number;
        conta_id: number;
        categoria_id: number;
        nome: string;
        descricao: string | null;
        valor_estimado: string;
        dia_vencimento: number;
        meio: LancamentoMeio | null;
      }
    >
  >(
    `
      SELECT id, conta_id, categoria_id, nome, descricao, valor_estimado, dia_vencimento, meio
      FROM gastos_fixos
      WHERE id = ?
        AND gestao_id = ?
        AND status = 'ativo'
      LIMIT 1
    `,
    [input.gastoFixoId, input.gestaoId],
  );

  const gasto = rows[0];
  if (!gasto) {
    return null;
  }

  const [existing] = await pool.query<Array<RowDataPacket & { id: number }>>(
    `
      SELECT id
      FROM lancamentos
      WHERE gestao_id = ?
        AND JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.gasto_fixo_id')) = ?
        AND JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.ano_mes')) = ?
      LIMIT 1
    `,
    [input.gestaoId, String(input.gastoFixoId), input.anoMes],
  );

  if (existing[0]?.id) {
    return Number(existing[0].id);
  }

  /** Despesa já registrada no mês: reutiliza em vez de criar outro previsto sintético. */
  const nomeAlvo = String(gasto.nome ?? "").trim();
  const descAlvo = String(gasto.descricao ?? "").trim();
  const [alreadyInMonth] = await pool.query<Array<RowDataPacket & { id: number }>>(
    `
      SELECT l.id
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.conta_id = ?
        AND l.categoria_id = ?
        AND l.tipo = 'despesa'
        AND l.status IN ('pendente', 'liquidado', 'previsto')
        AND DATE_FORMAT(${SQL_L_DATA_RECORTE_GESTAO}, '%Y-%m') = ?
        AND (
          l.metadados IS NULL
          OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(l.metadados, '$.gasto_fixo_id')), '') = ''
        )
        AND (
          LOWER(TRIM(l.descricao)) = LOWER(?)
          OR (NULLIF(?, '') IS NOT NULL AND LOWER(TRIM(l.descricao)) = LOWER(?))
        )
      ORDER BY ${SQL_L_DATA_RECORTE_GESTAO} DESC, l.id DESC
      LIMIT 1
    `,
    [
      input.gestaoId,
      gasto.conta_id,
      gasto.categoria_id,
      input.anoMes,
      nomeAlvo,
      descAlvo,
      descAlvo,
    ],
  );

  const reuseId = alreadyInMonth[0]?.id;
  if (reuseId) {
    await pool.query(
      `
        UPDATE lancamentos
        SET recorrente = 1,
            metadados = ?
        WHERE id = ?
      `,
      [
        JSON.stringify({
          gasto_fixo_id: input.gastoFixoId,
          ano_mes: input.anoMes,
          origem: "gasto_fixo_vinculo",
        }),
        reuseId,
      ],
    );
    return Number(reuseId);
  }

  const data = buildMonthCalendarDate(input.anoMes, Number(gasto.dia_vencimento));
  const id = await createLancamento({
    gestaoId: input.gestaoId,
    userId: input.userId,
    contaId: Number(gasto.conta_id),
    categoriaId: Number(gasto.categoria_id),
    tipo: "despesa",
    status: "previsto",
    meio: gasto.meio ?? undefined,
    descricao: gasto.descricao || `${gasto.nome} - previsto`,
    valorTotal: Number(gasto.valor_estimado),
    competenciaData: data,
    vencimentoData: data,
  });

  await pool.query(
    `
      UPDATE lancamentos
      SET recorrente = 1,
          metadados = ?
      WHERE id = ?
    `,
    [
      JSON.stringify({
        gasto_fixo_id: input.gastoFixoId,
        ano_mes: input.anoMes,
        origem: "gasto_fixo",
      }),
      id,
    ],
  );

  return id;
}

export async function ensureGastosFixosLancamentosMes(input: {
  gestaoId: number;
  userId: number;
  anoMes: string;
}) {
  const [rows] = await pool.query<Array<RowDataPacket & { id: number }>>(
    `
      SELECT id
      FROM gastos_fixos
      WHERE gestao_id = ?
        AND status = 'ativo'
      ORDER BY dia_vencimento ASC, nome ASC
    `,
    [input.gestaoId],
  );

  const ids: number[] = [];
  for (const row of rows) {
    const lancamentoId = await ensureGastoFixoLancamentoMes({
      gastoFixoId: Number(row.id),
      gestaoId: input.gestaoId,
      userId: input.userId,
      anoMes: input.anoMes,
    });
    if (lancamentoId) {
      ids.push(lancamentoId);
    }
  }

  return ids;
}

export async function createGastoFixo(input: {
  gestaoId: number;
  userId: number;
  contaId: number;
  categoriaId: number;
  nome: string;
  descricao?: string;
  valorEstimado: number;
  diaVencimento: number;
  meio?: LancamentoMeio;
  anoMes: string;
}) {
  await ensureFinancialRefsInGestao({
    gestaoId: input.gestaoId,
    contaId: input.contaId,
    categoriaId: input.categoriaId,
  });

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO gastos_fixos (
        gestao_id, criado_por_usuario_id, conta_id, categoria_id,
        nome, descricao, valor_estimado, dia_vencimento, meio
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.gestaoId,
      input.userId,
      input.contaId,
      input.categoriaId,
      input.nome,
      input.descricao || null,
      input.valorEstimado,
      input.diaVencimento,
      input.meio ?? null,
    ],
  );

  const gastoFixoId = result.insertId;
  await ensureGastoFixoLancamentoMes({
    gastoFixoId,
    gestaoId: input.gestaoId,
    userId: input.userId,
    anoMes: input.anoMes,
  });

  await registerAudit({
    userId: input.userId,
    gestaoId: input.gestaoId,
    action: "create",
    module: "gastos_fixos",
    entity: "gasto_fixo",
    entityId: gastoFixoId,
    details: { nome: input.nome, valorEstimado: input.valorEstimado },
  });

  return gastoFixoId;
}

export async function listGastosFixos(input: { gestaoId: number; anoMes: string }) {
  const [rows] = await pool.query<GastoFixoRow[]>(
    `
      SELECT
        gf.id,
        gf.gestao_id,
        gf.conta_id,
        gf.categoria_id,
        gf.nome,
        gf.descricao,
        gf.valor_estimado,
        gf.dia_vencimento,
        gf.meio,
        gf.status,
        ct.nome AS conta_nome,
        c.nome AS categoria_nome,
        l.id AS lancamento_mes_id,
        l.status AS lancamento_mes_status
      FROM gastos_fixos gf
      INNER JOIN contas ct
        ON ct.id = gf.conta_id
      INNER JOIN categorias c
        ON c.id = gf.categoria_id
      LEFT JOIN lancamentos l
        ON l.gestao_id = gf.gestao_id
       AND JSON_UNQUOTE(JSON_EXTRACT(l.metadados, '$.gasto_fixo_id')) = CAST(gf.id AS CHAR)
       AND JSON_UNQUOTE(JSON_EXTRACT(l.metadados, '$.ano_mes')) = ?
      WHERE gf.gestao_id = ?
        AND gf.status = 'ativo'
      ORDER BY gf.dia_vencimento ASC, gf.nome ASC
    `,
    [input.anoMes, input.gestaoId],
  );

  return rows;
}

export async function listGastoFixoSugestoes(input: { gestaoId: number; anoMes: string }) {
  const { from, to } = boundsForCalendarMonth(input.anoMes);
  const start = addCalendarMonths(from, -5);
  const [rows] = await pool.query<GastoFixoSugestaoRow[]>(
    `
      SELECT
        base.descricao,
        base.conta_id,
        base.categoria_id,
        base.conta_nome,
        base.categoria_nome,
        base.meio,
        ROUND(AVG(base.valor_total), 2) AS valor_medio,
        COUNT(DISTINCT base.ano_mes) AS meses,
        COUNT(*) AS ocorrencias,
        DAY(MAX(base.data_recorte)) AS ultimo_dia
      FROM (
        SELECT
          l.descricao,
          l.conta_id,
          l.categoria_id,
          ct.nome AS conta_nome,
          c.nome AS categoria_nome,
          l.meio,
          l.valor_total,
          ${SQL_L_DATA_RECORTE_GESTAO} AS data_recorte,
          DATE_FORMAT(${SQL_L_DATA_RECORTE_GESTAO}, '%Y-%m') AS ano_mes
        FROM lancamentos l
        INNER JOIN contas ct
          ON ct.id = l.conta_id
        INNER JOIN categorias c
          ON c.id = l.categoria_id
        LEFT JOIN gastos_fixos gf
          ON gf.gestao_id = l.gestao_id
         AND gf.status = 'ativo'
         AND gf.conta_id = l.conta_id
         AND gf.categoria_id = l.categoria_id
         AND LOWER(TRIM(gf.nome)) = LOWER(TRIM(l.descricao))
        WHERE l.gestao_id = ?
          AND l.tipo = 'despesa'
          AND l.status <> 'cancelado'
          AND COALESCE(c.nome, '') <> 'Saida da conta'
          AND JSON_EXTRACT(l.metadados, '$.gasto_fixo_id') IS NULL
          AND gf.id IS NULL
          AND ${SQL_L_DATA_RECORTE_GESTAO} >= ?
          AND ${SQL_L_DATA_RECORTE_GESTAO} <= ?
      ) base
      GROUP BY
        LOWER(TRIM(base.descricao)),
        base.descricao,
        base.conta_id,
        base.categoria_id,
        base.conta_nome,
        base.categoria_nome,
        base.meio
      HAVING COUNT(DISTINCT base.ano_mes) >= 2
      ORDER BY meses DESC, valor_medio DESC
      LIMIT 8
    `,
    [input.gestaoId, start, to],
  );

  return rows;
}

function isErNoSuchTableFor(error: unknown, table: string): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; errno?: number; sqlMessage?: string };
  if (e.code !== "ER_NO_SUCH_TABLE" && e.errno !== 1146) return false;
  return String(e.sqlMessage ?? "").includes(table);
}

/**
 * Carrega bloco de gastos fixos no dashboard. Se a tabela ainda não existir no MySQL
 * (migration pendente em produção), devolve listas vazias em vez de derrubar a página.
 */
export async function fetchGastosFixosDashboardSlice(input: {
  gestaoId: number;
  userId: number;
  anoMes: string;
}): Promise<{
  gastosFixos: Awaited<ReturnType<typeof listGastosFixos>>;
  sugestoesFixos: Awaited<ReturnType<typeof listGastoFixoSugestoes>>;
}> {
  try {
    await ensureGastosFixosLancamentosMes(input);
    const [gastosFixos, sugestoesFixos] = await Promise.all([
      listGastosFixos({ gestaoId: input.gestaoId, anoMes: input.anoMes }),
      listGastoFixoSugestoes({ gestaoId: input.gestaoId, anoMes: input.anoMes }),
    ]);
    return { gastosFixos, sugestoesFixos };
  } catch (error) {
    if (isErNoSuchTableFor(error, "gastos_fixos")) {
      return { gastosFixos: [], sugestoesFixos: [] };
    }
    throw error;
  }
}

function parsePlanoFixosMesItensFromDb(raw: unknown): PlanoFixosMesItem[] {
  if (raw == null) {
    return [];
  }
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  const parsed = z.array(planoFixosMesItemSchema).safeParse(data);
  return parsed.success ? parsed.data : [];
}

export async function getPlanoFixosMesItens(gestaoId: number, anoMes: string): Promise<PlanoFixosMesItem[]> {
  try {
    const [rows] = await pool.query<Array<RowDataPacket & { itens: unknown }>>(
      `
        SELECT itens
        FROM gestao_planos_fixos_mes
        WHERE gestao_id = ?
          AND ano_mes = ?
        LIMIT 1
      `,
      [gestaoId, anoMes],
    );
    return parsePlanoFixosMesItensFromDb(rows[0]?.itens);
  } catch (error) {
    if (isErNoSuchTableFor(error, "gestao_planos_fixos_mes")) {
      return [];
    }
    throw error;
  }
}

export async function upsertPlanoFixosMes(input: {
  gestaoId: number;
  userId: number;
  anoMes: string;
  itens: PlanoFixosMesItem[];
}) {
  await pool.query(
    `
      INSERT INTO gestao_planos_fixos_mes (gestao_id, ano_mes, itens, atualizado_por_usuario_id)
      VALUES (?, ?, CAST(? AS JSON), ?)
      ON DUPLICATE KEY UPDATE
        itens = VALUES(itens),
        atualizado_por_usuario_id = VALUES(atualizado_por_usuario_id)
    `,
    [input.gestaoId, input.anoMes, JSON.stringify(input.itens), input.userId],
  );

  await registerAudit({
    userId: input.userId,
    gestaoId: input.gestaoId,
    action: "upsert",
    module: "gestao_planos_fixos_mes",
    entity: "plano_fixos_mes",
    entityId: 0,
    details: { anoMes: input.anoMes, linhas: input.itens.length },
  });
}

/**
 * Modelo (macro) por gestão: não gera lançamento até `syncLancamentosPrevistosFromPlanoFixosMes`.
 * Se a tabela nova ainda não existir ou estiver vazia, tenta o último plano salvo em `gestao_planos_fixos_mes`.
 */
export async function getPlanoFixosTemplateItens(gestaoId: number): Promise<PlanoFixosMesItem[]> {
  try {
    const [rows] = await pool.query<Array<RowDataPacket & { itens: unknown }>>(
      `
        SELECT itens
        FROM gestao_planos_fixos_template
        WHERE gestao_id = ?
        LIMIT 1
      `,
      [gestaoId],
    );
    const parsed = parsePlanoFixosMesItensFromDb(rows[0]?.itens);
    if (parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    if (!isErNoSuchTableFor(error, "gestao_planos_fixos_template")) {
      throw error;
    }
  }

  try {
    const [rows] = await pool.query<Array<RowDataPacket & { itens: unknown }>>(
      `
        SELECT itens
        FROM gestao_planos_fixos_mes
        WHERE gestao_id = ?
        ORDER BY atualizado_em DESC
        LIMIT 1
      `,
      [gestaoId],
    );
    return parsePlanoFixosMesItensFromDb(rows[0]?.itens);
  } catch (error) {
    if (isErNoSuchTableFor(error, "gestao_planos_fixos_mes")) {
      return [];
    }
    throw error;
  }
}

export async function upsertPlanoFixosTemplate(input: {
  gestaoId: number;
  userId: number;
  itens: PlanoFixosMesItem[];
}) {
  try {
    await pool.query(
      `
      INSERT INTO gestao_planos_fixos_template (gestao_id, itens, atualizado_por_usuario_id)
      VALUES (?, CAST(? AS JSON), ?)
      ON DUPLICATE KEY UPDATE
        itens = VALUES(itens),
        atualizado_por_usuario_id = VALUES(atualizado_por_usuario_id)
    `,
      [input.gestaoId, JSON.stringify(input.itens), input.userId],
    );
  } catch (error) {
    if (isErNoSuchTableFor(error, "gestao_planos_fixos_template")) {
      throw Object.assign(new Error("gestao_planos_fixos_template ausente"), { code: "PLANO_FIXOS_TEMPLATE_TABLE" });
    }
    throw error;
  }

  await registerAudit({
    userId: input.userId,
    gestaoId: input.gestaoId,
    action: "upsert",
    module: "gestao_planos_fixos_template",
    entity: "plano_fixos_template",
    entityId: 0,
    details: { linhas: input.itens.length },
  });
}

async function resolveFaturaCompetenciaDespesa(
  gestaoId: number,
  contaId: number,
  competenciaData: string,
): Promise<string | null> {
  const [contaRows] = await pool.query<Array<RowDataPacket & { tipo: string; fechamento_dia: number | null }>>(
    `SELECT tipo, fechamento_dia FROM contas WHERE id = ? AND gestao_id = ? LIMIT 1`,
    [contaId, gestaoId],
  );
  const contaInfo = contaRows[0];
  if (contaInfo?.tipo === "cartao_credito") {
    const fechamentoDia = Number(contaInfo.fechamento_dia ?? 1);
    if (fechamentoDia >= 1 && fechamentoDia <= 31) {
      return computeFaturaCompetenciaParaCompra(competenciaData, fechamentoDia);
    }
  }
  return null;
}

async function findLancamentoPlanoFixoIdx(
  gestaoId: number,
  anoMes: string,
  planoIdx: number,
): Promise<{ id: number; status: string; competencia_hora: string | null } | null> {
  const [rows] = await pool.query<
    Array<RowDataPacket & { id: number; status: string; competencia_hora: string | null }>
  >(
    `
      SELECT id, status, TIME_FORMAT(competencia_hora, '%H:%i') AS competencia_hora
      FROM lancamentos
      WHERE gestao_id = ?
        AND tipo = 'despesa'
        AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.origem')), '') = 'plano_fixos_mes'
        AND JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.ano_mes')) = ?
        AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.plano_idx')) AS UNSIGNED) = ?
      LIMIT 1
    `,
    [gestaoId, anoMes, planoIdx],
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  return { id: Number(row.id), status: String(row.status), competencia_hora: row.competencia_hora };
}

async function assertContaCategoriaNaGestao(gestaoId: number, contaId: number, categoriaId: number): Promise<boolean> {
  const [[c], [g]] = await Promise.all([
    pool.query<Array<RowDataPacket & { ok: number }>>(
      `SELECT 1 AS ok FROM contas WHERE id = ? AND gestao_id = ? LIMIT 1`,
      [contaId, gestaoId],
    ),
    pool.query<Array<RowDataPacket & { ok: number }>>(
      `SELECT 1 AS ok FROM categorias WHERE id = ? AND gestao_id = ? LIMIT 1`,
      [categoriaId, gestaoId],
    ),
  ]);
  return Boolean(c[0]?.ok && g[0]?.ok);
}

export async function syncLancamentosPrevistosFromPlanoFixosMes(input: {
  gestaoId: number;
  userId: number;
  /** Mês de competência dos lançamentos (AAAA-MM). */
  anoMes: string;
  /** Quando informado, todos os itens são lançados nesta data. */
  competenciaData?: string;
  /** Quando informado, lança só esta seleção em vez do modelo salvo inteiro. */
  itens?: PlanoFixosMesItem[];
}): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const itens = input.itens ?? (await getPlanoFixosTemplateItens(input.gestaoId));
  if (itens.length === 0) {
    return { created, updated, skipped };
  }

  for (const [idx, item] of itens.entries()) {
    const okRefs = await assertContaCategoriaNaGestao(input.gestaoId, item.contaId, item.categoriaId);
    if (!okRefs) {
      skipped += 1;
      continue;
    }

    const competenciaData =
      input.competenciaData && /^\d{4}-\d{2}-\d{2}$/.test(input.competenciaData)
        ? input.competenciaData
        : buildMonthCalendarDate(input.anoMes, item.dia);

    const anoMesChave = competenciaData.slice(0, 7);
    const vencimentoData = competenciaData;
    const descricao = item.nome.trim();
    const meio = item.meio ?? undefined;
    const metadados = JSON.stringify({
      origem: "plano_fixos_mes",
      ano_mes: anoMesChave,
      plano_idx: idx,
    });

    const existing = await findLancamentoPlanoFixoIdx(input.gestaoId, anoMesChave, idx);

    if (existing) {
      if (existing.status !== "previsto") {
        skipped += 1;
        continue;
      }

      const faturaCompetenciaData = await resolveFaturaCompetenciaDespesa(
        input.gestaoId,
        item.contaId,
        competenciaData,
      );

      const ok = await updateLancamento({
        gestaoId: input.gestaoId,
        userId: input.userId,
        lancamentoId: existing.id,
        contaId: item.contaId,
        categoriaId: item.categoriaId,
        tipo: "despesa",
        status: "previsto",
        meio,
        descricao,
        valorTotal: item.valor,
        competenciaData,
        faturaCompetenciaData: faturaCompetenciaData ?? undefined,
        competenciaHora: existing.competencia_hora ?? undefined,
        vencimentoData,
      });
      if (ok) {
        await pool.query(`UPDATE lancamentos SET metadados = ? WHERE id = ? AND gestao_id = ?`, [
          metadados,
          existing.id,
          input.gestaoId,
        ]);
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const id = await createLancamento({
      gestaoId: input.gestaoId,
      userId: input.userId,
      contaId: item.contaId,
      categoriaId: item.categoriaId,
      tipo: "despesa",
      status: "previsto",
      meio,
      descricao,
      valorTotal: item.valor,
      competenciaData,
      vencimentoData,
    });

    await pool.query(
      `
        UPDATE lancamentos
        SET recorrente = 0,
            metadados = ?
        WHERE id = ?
          AND gestao_id = ?
      `,
      [metadados, id, input.gestaoId],
    );
    created += 1;
  }

  return { created, updated, skipped };
}

export type RepairGastosFixoPrevistosResult = {
  /** Lançamentos reais que receberam vínculo ao gasto fixo. */
  linked: number;
  /** Previstos sintéticos (`origem=gasto_fixo`) removidos após o vínculo. */
  removedSynthetic: number;
  /** Sintéticos mantidos (sem despesa real correspondente no mês) ou ignorados. */
  skipped: number;
};

function parseMetadadosLancamento(raw: unknown): Record<string, unknown> | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && !Buffer.isBuffer(raw)) {
    return raw as Record<string, unknown>;
  }
  const s = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
  if (!s) return null;
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Marca lançamentos reais para não entrarem no fechamento semanal (contas fixas). */
export async function setLancamentosExcluirFechamentoSemanal(input: {
  gestaoId: number;
  lancamentoIds: number[];
  excluir: boolean;
}): Promise<number> {
  const ids = [...new Set(input.lancamentoIds.map((id) => Math.floor(id)).filter((id) => id > 0))];
  if (ids.length === 0) {
    return 0;
  }

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await pool.query<Array<RowDataPacket & { id: number; metadados: unknown }>>(
    `
      SELECT id, metadados
      FROM lancamentos
      WHERE gestao_id = ?
        AND id IN (${placeholders})
    `,
    [input.gestaoId, ...ids],
  );

  let updated = 0;
  for (const row of rows) {
    const meta = parseMetadadosLancamento(row.metadados) ?? {};
    if (input.excluir) {
      meta.excluir_fechamento_semanal = true;
    } else {
      delete meta.excluir_fechamento_semanal;
    }
    await pool.query(`UPDATE lancamentos SET metadados = ? WHERE id = ? AND gestao_id = ?`, [
      JSON.stringify(meta),
      row.id,
      input.gestaoId,
    ]);
    updated += 1;
  }

  return updated;
}

/**
 * Conserta histórico: previsto sintético do gasto fixo + despesa real no mesmo mês.
 * Idempotente e por `gestaoId` (multi-tenant). Com BD vazio ou sem duplicatas, devolve zeros.
 * Não altera gestões de outros usuários.
 */
export async function repairGestaoGastosFixoPrevistosDuplicados(
  gestaoId: number,
): Promise<RepairGastosFixoPrevistosResult> {
  let linked = 0;
  let removedSynthetic = 0;
  let skipped = 0;

  try {
    const [synthRows] = await pool.query<
      Array<RowDataPacket & { id: number; metadados: unknown; gestao_id: number }>
    >(
      `
        SELECT l.id, l.metadados, l.gestao_id
        FROM lancamentos l
        WHERE l.gestao_id = ?
          AND l.tipo = 'despesa'
          AND l.status = 'previsto'
          AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(l.metadados, '$.origem')), '') = 'gasto_fixo'
        ORDER BY l.id ASC
      `,
      [gestaoId],
    );

    for (const row of synthRows) {
      const meta = parseMetadadosLancamento(row.metadados);
      const gfId = Number(meta?.gasto_fixo_id);
      const anoMes = typeof meta?.ano_mes === "string" ? meta.ano_mes.trim() : "";
      if (!Number.isFinite(gfId) || gfId <= 0 || !/^\d{4}-\d{2}$/.test(anoMes)) {
        skipped += 1;
        continue;
      }

      const [gfRows] = await pool.query<
        Array<
          RowDataPacket & {
            id: number;
            nome: string;
            descricao: string | null;
            conta_id: number;
            categoria_id: number;
          }
        >
      >(
        `
          SELECT id, nome, descricao, conta_id, categoria_id
          FROM gastos_fixos
          WHERE id = ?
            AND gestao_id = ?
            AND status = 'ativo'
          LIMIT 1
        `,
        [gfId, gestaoId],
      );

      const gf = gfRows[0];
      if (!gf) {
        skipped += 1;
        continue;
      }

      const nomeAlvo = String(gf.nome ?? "").trim();
      const descAlvo = String(gf.descricao ?? "").trim();

      const [candidates] = await pool.query<Array<RowDataPacket & { id: number }>>(
        `
          SELECT l.id
          FROM lancamentos l
          WHERE l.gestao_id = ?
            AND l.conta_id = ?
            AND l.categoria_id = ?
            AND l.tipo = 'despesa'
            AND l.status IN ('pendente', 'liquidado', 'previsto')
            AND DATE_FORMAT(${SQL_L_DATA_RECORTE_GESTAO}, '%Y-%m') = ?
            AND (
              l.metadados IS NULL
              OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(l.metadados, '$.gasto_fixo_id')), '') = ''
            )
            AND l.id <> ?
            AND (
              LOWER(TRIM(l.descricao)) = LOWER(?)
              OR (NULLIF(?, '') IS NOT NULL AND LOWER(TRIM(l.descricao)) = LOWER(?))
            )
          ORDER BY ${SQL_L_DATA_RECORTE_GESTAO} DESC, l.id DESC
          LIMIT 1
        `,
        [gestaoId, gf.conta_id, gf.categoria_id, anoMes, row.id, nomeAlvo, descAlvo, descAlvo],
      );

      const reuseId = candidates[0]?.id;
      if (!reuseId) {
        skipped += 1;
        continue;
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          `
            UPDATE lancamentos
            SET recorrente = 1,
                metadados = ?
            WHERE id = ?
              AND gestao_id = ?
          `,
          [
            JSON.stringify({
              gasto_fixo_id: gfId,
              ano_mes: anoMes,
              origem: "gasto_fixo_vinculo",
            }),
            reuseId,
            gestaoId,
          ],
        );
        await connection.query(
          `
            DELETE lr
            FROM lancamento_rateios lr
            INNER JOIN lancamentos l ON l.id = lr.lancamento_id
            WHERE l.gestao_id = ? AND l.id = ?
          `,
          [gestaoId, row.id],
        );
        const [del] = await connection.query<ResultSetHeader>(
          `DELETE FROM lancamentos WHERE gestao_id = ? AND id = ?`,
          [gestaoId, row.id],
        );
        await connection.commit();
        if (del.affectedRows > 0) {
          linked += 1;
          removedSynthetic += 1;
        } else {
          skipped += 1;
        }
      } catch {
        await connection.rollback();
        skipped += 1;
      } finally {
        connection.release();
      }
    }
  } catch (error) {
    if (isErNoSuchTableFor(error, "gastos_fixos")) {
      return { linked: 0, removedSynthetic: 0, skipped: 0 };
    }
    throw error;
  }

  return { linked, removedSynthetic, skipped };
}

export async function createTransferencia(input: {
  gestaoId: number;
  contaOrigemId: number;
  contaDestinoId: number;
  userId: number;
  status: "previsto" | "pendente" | "liquidado";
  descricao: string;
  valorTotal: number;
  competenciaData: string;
  faturaCompetenciaData?: string;
  competenciaHora?: string;
  vencimentoData?: string;
}) {
  await ensureFinancialRefsInGestao({
    gestaoId: input.gestaoId,
    contaId: input.contaOrigemId,
    contaDestinoId: input.contaDestinoId,
  });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO lancamentos (
          gestao_id,
          conta_id,
          conta_destino_id,
          categoria_id,
          criado_por_usuario_id,
          tipo,
          status,
          meio,
          descricao,
          valor_total,
          competencia_data,
          competencia_hora,
          vencimento_data,
          liquidado_em
        )
        VALUES (?, ?, ?, NULL, ?, 'transferencia', ?, 'transferencia', ?, ?, ?, ?, ?, ?)
      `,
      [
        input.gestaoId,
        input.contaOrigemId,
        input.contaDestinoId,
        input.userId,
        input.status,
        input.descricao,
        input.valorTotal,
        input.competenciaData,
        input.competenciaHora ?? null,
        input.vencimentoData || null,
        input.status === "liquidado" ? new Date() : null,
      ],
    );

    await syncGestaoInicioEm(connection, input.gestaoId);

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "create",
      module: "lancamentos",
      entity: "transferencia",
      entityId: result.insertId,
      details: { status: input.status, valorTotal: input.valorTotal },
    });

    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSummary(gestaoId: number) {
  const [rows] = await pool.query<SummaryRow[]>(
    `
      SELECT
        SUM(CASE WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total ELSE 0 END) AS receitas,
        SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END) AS despesas,
        SUM(
          CASE
            WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total
            WHEN tipo = 'despesa' AND status <> 'cancelado' THEN -valor_total
            ELSE 0
          END
        ) AS saldo
      FROM lancamentos
      WHERE gestao_id = ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare()}
    `,
    [gestaoId],
  );

  return rows[0] ?? { receitas: "0", despesas: "0", saldo: "0" };
}

export async function getCashOverview(gestaoId: number) {
  const [rows] = await pool.query<CashOverviewRow[]>(
    `
      SELECT
        COALESCE(SUM(saldos.entradas_em_conta), 0) AS entradas_em_conta,
        COALESCE(SUM(saldos.despesas), 0) AS despesas,
        COALESCE(SUM(saldos.saidas_da_conta), 0) AS saidas_da_conta
      FROM (
        SELECT
          ct.id,
          COALESCE(SUM(${CASE_ENTRADA_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS entradas_em_conta,
          COALESCE(SUM(${CASE_DESPESA_SEM_SAIDA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS despesas,
          COALESCE(SUM(${CASE_SAIDA_DA_CONTA_AGREGADA.replace(/\s+/g, " ").trim()}), 0) AS saidas_da_conta
        FROM contas ct
        ${JOIN_LANCAMENTOS_NA_CONTA}
        LEFT JOIN categorias c
          ON c.id = l.categoria_id
        WHERE ct.gestao_id = ?
          AND ct.ativa = 1
          AND ct.tipo <> 'cartao_credito'
          AND ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
        GROUP BY ct.id
      ) AS saldos
    `,
    [gestaoId],
  );

  return rows[0] ?? {
    entradas_em_conta: "0",
    despesas: "0",
    saidas_da_conta: "0",
  };
}

export async function getGestaoSaldosPorBucket(gestaoId: number): Promise<GestaoSaldosPorBucket> {
  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        disponivel: string | null;
        poupanca: string | null;
        investimento: string | null;
      }
    >
  >(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN x.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
              THEN x.saldo_conta
              ELSE 0
            END
          ),
          0
        ) AS disponivel,
        COALESCE(SUM(CASE WHEN x.tipo = 'poupanca' THEN x.saldo_conta ELSE 0 END), 0) AS poupanca,
        COALESCE(SUM(CASE WHEN x.tipo = 'investimento' THEN x.saldo_conta ELSE 0 END), 0) AS investimento
      FROM (
        SELECT
          ct.id,
          ct.tipo,
          COALESCE(ct.saldo_inicial, 0) +
            COALESCE(
              SUM(${CASE_DELTA_SALDO_NA_CONTA.replace(/\s+/g, " ").trim()}),
              0
            ) AS saldo_conta
        FROM contas ct
        ${JOIN_LANCAMENTOS_NA_CONTA}
        WHERE ct.gestao_id = ?
          AND ct.ativa = 1
          AND ct.tipo <> 'cartao_credito'
        GROUP BY ct.id, ct.tipo, ct.saldo_inicial
      ) AS x
    `,
    [gestaoId],
  );

  const row = rows[0];
  return {
    disponivel: row?.disponivel ?? "0",
    poupanca: row?.poupanca ?? "0",
    investimento: row?.investimento ?? "0",
  };
}

export async function getAvailableBalance(gestaoId: number) {
  const buckets = await getGestaoSaldosPorBucket(gestaoId);
  return buckets.disponivel;
}

export async function listCashAccountBreakdown(gestaoId: number) {
  const [rows] = await pool.query<CashAccountBreakdownRow[]>(
    `
      SELECT
        ct.id,
        ct.nome,
        ct.tipo,
        COALESCE(ct.saldo_inicial, 0) AS saldo_inicial,
        COALESCE(SUM(${CASE_ENTRADA_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS entradas_em_conta,
        COALESCE(SUM(${CASE_DESPESA_SEM_SAIDA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS despesas,
        COALESCE(SUM(${CASE_SAIDA_DA_CONTA_AGREGADA.replace(/\s+/g, " ").trim()}), 0) AS saidas_da_conta,
        COALESCE(ct.saldo_inicial, 0) +
          COALESCE(SUM(${CASE_DELTA_SALDO_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS saldo_atual,
        COUNT(
          CASE
            WHEN l.status <> 'cancelado' THEN 1
            ELSE NULL
          END
        ) AS quantidade_movimentos
      FROM contas ct
      ${JOIN_LANCAMENTOS_NA_CONTA}
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ct.gestao_id = ?
        AND ct.ativa = 1
        AND ct.tipo <> 'cartao_credito'
      GROUP BY ct.id, ct.nome, ct.tipo, ct.saldo_inicial
      ORDER BY saldo_atual DESC, ct.criado_em ASC
    `,
    [gestaoId],
  );

  return rows;
}

export async function listLancamentosBaseSaldoContas(gestaoId: number): Promise<LancamentoListItem[]> {
  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        ct.id AS conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.criado_por_usuario_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-%d') AS fatura_competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM contas ct
      ${JOIN_LANCAMENTOS_NA_CONTA}
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ct.gestao_id = ?
        AND ct.ativa = 1
        AND ct.tipo <> 'cartao_credito'
        AND l.id IS NOT NULL
        AND l.status = 'liquidado'
      ORDER BY l.competencia_data DESC, COALESCE(l.competencia_hora, TIME(l.criado_em)) DESC, l.criado_em DESC
    `,
    [gestaoId],
  );

  return rows.map((row) => ({ ...row })) satisfies LancamentoListItem[];
}

export async function listCreditCardBreakdown(gestaoId: number) {
  const [rows] = await pool.query<CashAccountBreakdownRow[]>(
    `
      SELECT
        ct.id,
        ct.nome,
        ct.tipo,
        COALESCE(ct.saldo_inicial, 0) AS saldo_inicial,
        COALESCE(SUM(${CASE_ENTRADA_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS entradas_em_conta,
        COALESCE(SUM(${CASE_DESPESA_SEM_SAIDA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS despesas,
        COALESCE(SUM(${CASE_SAIDA_DA_CONTA_AGREGADA.replace(/\s+/g, " ").trim()}), 0) AS saidas_da_conta,
        COALESCE(ct.saldo_inicial, 0) +
          COALESCE(SUM(${CASE_DELTA_SALDO_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS saldo_atual,
        COUNT(
          CASE
            WHEN l.status <> 'cancelado' THEN 1
            ELSE NULL
          END
        ) AS quantidade_movimentos
      FROM contas ct
      ${JOIN_LANCAMENTOS_NA_CONTA}
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ct.gestao_id = ?
        AND ct.ativa = 1
        AND ct.tipo = 'cartao_credito'
      GROUP BY ct.id, ct.nome, ct.tipo, ct.saldo_inicial
      ORDER BY saldo_atual DESC, ct.criado_em ASC
    `,
    [gestaoId],
  );

  return rows;
}

export async function listCreditCardStatementData(gestaoId: number) {
  const cards = await pool.query<CreditCardAccountRow[]>(
    `
      SELECT
        ct.id,
        ct.nome,
        ct.tipo,
        ct.limite_credito,
        ct.fechamento_dia,
        ct.vencimento_dia
      FROM contas ct
      WHERE ct.gestao_id = ?
        AND ct.ativa = 1
        AND ct.tipo = 'cartao_credito'
      ORDER BY ct.criado_em ASC
    `,
    [gestaoId],
  );

  const cardRows = cards[0];

  if (cardRows.length === 0) {
    return [];
  }

  const cardIds = cardRows.map((card) => card.id);
  const placeholders = cardIds.map(() => "?").join(", ");

  const [movements] = await pool.query<CreditCardStatementMovementRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        l.tipo,
        l.status,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-%d') AS fatura_competencia_data
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND (l.conta_id IN (${placeholders}) OR l.conta_destino_id IN (${placeholders}))
      ORDER BY ${ORDER_BY_LANCAMENTO_FATURA_DESC}
      LIMIT 2000
    `,
    [gestaoId, ...cardIds, ...cardIds],
  );

  return cardRows.map((card) => ({
    ...card,
    movimentos: movements.filter(
      (movement) => movement.conta_id === card.id || movement.conta_destino_id === card.id,
    ),
  }));
}

export type PossivelRecorrenciaRow = RowDataPacket & {
  descricao: string;
  valor_total: string;
  ocorrencias: number;
  primeira_data: string;
  ultima_data: string;
  total_periodo: string;
};

export async function listPossiveisRecorrencias(
  gestaoId: number,
  input?: { diasLookback?: number; minOcorrencias?: number; limite?: number },
) {
  const dias = input?.diasLookback ?? 120;
  const minOc = input?.minOcorrencias ?? 2;
  const limite = input?.limite ?? 20;

  const [rows] = await pool.query<PossivelRecorrenciaRow[]>(
    `
      SELECT
        l.descricao AS descricao,
        FORMAT(l.valor_total, 2, 'de_DE') AS valor_total,
        COUNT(*) AS ocorrencias,
        DATE_FORMAT(MIN(l.competencia_data), '%Y-%m-%d') AS primeira_data,
        DATE_FORMAT(MAX(l.competencia_data), '%Y-%m-%d') AS ultima_data,
        FORMAT(SUM(l.valor_total), 2, 'de_DE') AS total_periodo
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.tipo = 'despesa'
        AND l.status <> 'cancelado'
        AND l.competencia_data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY l.descricao, l.valor_total
      HAVING COUNT(*) >= ?
      ORDER BY COUNT(*) DESC, SUM(l.valor_total) DESC
      LIMIT ?
    `,
    [gestaoId, dias, minOc, limite],
  );

  return rows;
}

export async function listRecentLancamentosForConta(input: {
  gestaoId: number;
  contaId: number;
  limit?: number;
}) {
  const lim = Math.min(Math.max(input.limit ?? 12, 1), 100);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-%d') AS fatura_competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND (l.conta_id = ? OR l.conta_destino_id = ?)
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
      LIMIT ${lim}
    `,
    [input.gestaoId, input.contaId, input.contaId],
  );

  const contas = await listContas(input.gestaoId);
  const openingRows = buildOpeningLancamentos(contas, { contaId: input.contaId });
  const normalizedRows = rows.map((row) => ({ ...row })) satisfies LancamentoListItem[];

  return [...normalizedRows, ...openingRows].sort(compareLancamentosDesc).slice(0, lim);
}

export async function listRecentLancamentos(gestaoId: number) {
  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.criado_por_usuario_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-%d') AS fatura_competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
    `,
    [gestaoId],
  );

  const contas = await listContas(gestaoId);
  const openingRows = buildOpeningLancamentos(contas);
  const normalizedRows = rows.map((row) => ({ ...row })) satisfies LancamentoListItem[];

  return [...normalizedRows, ...openingRows].sort(compareLancamentosDesc);
}

export async function listLancamentosPorPeriodo(input: {
  gestaoId: number;
  dateFrom: string;
  dateTo: string;
  dateMode?: "gestao" | "competencia";
}) {
  const dataRecorte =
    input.dateMode === "competencia" ? "l.competencia_data" : SQL_L_DATA_RECORTE_GESTAO;
  const orderBy =
    input.dateMode === "competencia" ? ORDER_BY_LANCAMENTO_RECIENTE_DESC : ORDER_BY_LANCAMENTO_FATURA_DESC;

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.criado_por_usuario_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-%d') AS fatura_competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND ${dataRecorte} >= ?
        AND ${dataRecorte} <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
      ORDER BY ${orderBy}
    `,
    [input.gestaoId, input.dateFrom, input.dateTo],
  );

  const contas = await listContas(input.gestaoId);
  const openingRows = buildOpeningLancamentos(contas, {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });
  const normalizedRows = rows.map((row) => ({ ...row })) satisfies LancamentoListItem[];

  return [...normalizedRows, ...openingRows].sort(compareLancamentosDesc);
}

export async function getGestaoPeriodoResumo(input: {
  gestaoId: number;
  dateFrom: string;
  dateTo: string;
}) {
  const [rows] = await pool.query<PeriodResumoRow[]>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) AS receitas,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'despesa' AND COALESCE(c.nome, '') <> 'Saida da conta' THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS despesas,
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND ctd.tipo IN ('poupanca', 'investimento') THEN l.valor_total ELSE 0 END), 0) AS guardado,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'credito' THEN l.valor_total ELSE 0 END), 0) AS credito,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'debito' THEN l.valor_total ELSE 0 END), 0) AS debito,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'pix' THEN l.valor_total ELSE 0 END), 0) AS pix,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'receita' THEN l.valor_total
              WHEN l.tipo = 'despesa' AND COALESCE(c.nome, '') <> 'Saida da conta' THEN -l.valor_total
              WHEN l.tipo = 'transferencia' AND ctd.tipo IN ('poupanca', 'investimento') THEN -l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS total
      FROM lancamentos l
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND ${SQL_L_DATA_RECORTE_GESTAO} >= ?
        AND ${SQL_L_DATA_RECORTE_GESTAO} <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
    `,
    [input.gestaoId, input.dateFrom, input.dateTo],
  );

  const opening = { receitas: "0", despesas: "0", total: "0" };
  const base = rows[0] ?? {
    receitas: "0",
    despesas: "0",
    guardado: "0",
    credito: "0",
    debito: "0",
    pix: "0",
    total: "0",
    abertura: "0",
  };

  return {
    receitas: base.receitas ?? "0",
    despesas: base.despesas ?? "0",
    guardado: base.guardado ?? "0",
    credito: base.credito ?? "0",
    debito: base.debito ?? "0",
    pix: base.pix ?? "0",
    total: base.total ?? "0",
    abertura: String(Number(opening.total ?? 0)),
  };
}

export async function getContaCorrentePeriodoResumo(input: {
  gestaoId: number;
  dateFrom: string;
  dateTo: string;
}) {
  const [rows] = await pool.query<ContaCorrentePeriodoResumoRow[]>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) AS entradas,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'despesa'
               AND l.descricao NOT LIKE 'Pagamento efetuado - Fatura Cartão Inter%'
              THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS saidas,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'despesa'
               AND l.descricao LIKE 'Pagamento efetuado - Fatura Cartão Inter%'
              THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS pagamentos_fatura,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END), 0) AS saidas_total,
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND ctd.tipo IN ('poupanca', 'investimento') THEN l.valor_total ELSE 0 END), 0) AS guardado,
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND ct.tipo IN ('poupanca', 'investimento') AND ctd.tipo IN ('corrente', 'carteira', 'caixa', 'outro') THEN l.valor_total ELSE 0 END), 0) AS resgatado,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'debito' THEN l.valor_total ELSE 0 END), 0) AS debito,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'pix' THEN l.valor_total ELSE 0 END), 0) AS pix,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'credito' THEN l.valor_total ELSE 0 END), 0) AS credito,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'receita' THEN l.valor_total
              WHEN l.tipo = 'despesa' AND l.descricao NOT LIKE 'Pagamento efetuado - Fatura Cartão Inter%' THEN -l.valor_total
              WHEN l.tipo = 'despesa' AND l.descricao LIKE 'Pagamento efetuado - Fatura Cartão Inter%' THEN -l.valor_total
              WHEN l.tipo = 'transferencia' AND ctd.tipo IN ('poupanca', 'investimento') THEN -l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS saldo,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'receita' THEN l.valor_total
              WHEN l.tipo = 'despesa' THEN -l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS sobra
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
        AND (
          ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
          OR (l.tipo = 'transferencia' AND ctd.tipo IN ('corrente', 'carteira', 'caixa', 'outro'))
        )
    `,
    [input.gestaoId, input.dateFrom, input.dateTo],
  );

  const base = rows[0] ?? {
    entradas: "0",
    saidas: "0",
    pagamentos_fatura: "0",
    saidas_total: "0",
    guardado: "0",
    resgatado: "0",
    debito: "0",
    pix: "0",
    credito: "0",
    saldo: "0",
    sobra: "0",
  };

  return {
    entradas: base.entradas ?? "0",
    saidas: base.saidas ?? "0",
    pagamentos_fatura: base.pagamentos_fatura ?? "0",
    saidas_total: base.saidas_total ?? "0",
    guardado: base.guardado ?? "0",
    resgatado: base.resgatado ?? "0",
    debito: base.debito ?? "0",
    pix: base.pix ?? "0",
    credito: base.credito ?? "0",
    saldo: base.saldo ?? "0",
    sobra: base.sobra ?? "0",
  };
}

export async function listGestaoMembrosResumo(input: {
  gestaoId: number;
  dateFrom: string;
  dateTo: string;
}) {
  const [rows] = await pool.query<GestaoMembroResumoRow[]>(
    `
      SELECT
        gm.usuario_id,
        u.nome,
        u.email,
        gm.papel,
        gm.status,
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN lr.valor ELSE 0 END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN lr.valor ELSE 0 END), 0) AS despesas,
        COALESCE(SUM(lr.valor), 0) AS total,
        COUNT(DISTINCT CASE WHEN l.status <> 'cancelado' THEN l.id END) AS movimentos
      FROM gestao_membros gm
      INNER JOIN usuarios u
        ON u.id = gm.usuario_id
      LEFT JOIN lancamento_rateios lr
        ON lr.usuario_id = gm.usuario_id
      LEFT JOIN lancamentos l
        ON l.id = lr.lancamento_id
        AND l.gestao_id = gm.gestao_id
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
      WHERE gm.gestao_id = ?
        AND gm.status = 'ativo'
      GROUP BY gm.usuario_id, u.nome, u.email, gm.papel, gm.status
      ORDER BY
        CASE gm.papel
          WHEN 'proprietario' THEN 1
          WHEN 'administrador' THEN 2
          WHEN 'editor' THEN 3
          ELSE 4
        END,
        u.nome ASC
    `,
    [input.dateFrom, input.dateTo, input.gestaoId],
  );

  return rows;
}

export async function updateLancamento(input: {
  gestaoId: number;
  userId: number;
  lancamentoId: number;
  contaId: number;
  contaDestinoId?: number | null;
  categoriaId?: number | null;
  tipo: "receita" | "despesa" | "ajuste" | "transferencia";
  status: "previsto" | "pendente" | "liquidado";
  meio?: LancamentoMeio;
  descricao: string;
  valorTotal: number;
  competenciaData: string;
  faturaCompetenciaData?: string;
  competenciaHora?: string;
  vencimentoData?: string;
}) {
  await ensureFinancialRefsInGestao({
    gestaoId: input.gestaoId,
    lancamentoId: input.lancamentoId,
    contaId: input.contaId,
    categoriaId: input.categoriaId ?? null,
    contaDestinoId: input.contaDestinoId ?? null,
  });

  const connection = await pool.getConnection();

  const isTransferencia = input.tipo === "transferencia";
  const categoriaId = isTransferencia ? null : input.categoriaId ?? null;
  const contaDestinoId = isTransferencia ? input.contaDestinoId ?? null : null;
  const meioFinal = isTransferencia ? ("transferencia" as LancamentoMeio) : (input.meio ?? null);

  try {
    await connection.beginTransaction();

    let faturaCompetenciaResolved: string | null = null;
    if (!isTransferencia && input.tipo === "despesa" && meioFinal === "credito") {
      const [contaRows] = await connection.query<Array<RowDataPacket & { tipo: string; fechamento_dia: number | null }>>(
        `SELECT tipo, fechamento_dia FROM contas WHERE id = ? AND gestao_id = ? LIMIT 1`,
        [input.contaId, input.gestaoId],
      );
      const contaInfo = contaRows[0];
      if (contaInfo?.tipo === "cartao_credito") {
        faturaCompetenciaResolved = input.faturaCompetenciaData || null;
        if (!faturaCompetenciaResolved) {
          const fechamentoDia = Number(contaInfo.fechamento_dia ?? 1);
          if (fechamentoDia >= 1 && fechamentoDia <= 31) {
            faturaCompetenciaResolved = computeFaturaCompetenciaParaCompra(
              input.competenciaData,
              fechamentoDia,
            );
          }
        }
      }
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        UPDATE lancamentos
        SET
          conta_id = ?,
          conta_destino_id = ?,
          categoria_id = ?,
          tipo = ?,
          status = ?,
          meio = ?,
          descricao = ?,
          valor_total = ?,
          competencia_data = ?,
          fatura_competencia_data = ?,
          competencia_hora = ?,
          vencimento_data = ?,
          liquidado_em = IF(? = 'liquidado', COALESCE(liquidado_em, NOW()), NULL)
        WHERE gestao_id = ?
          AND id = ?
      `,
      [
        input.contaId,
        contaDestinoId,
        categoriaId,
        input.tipo,
        input.status,
        meioFinal,
        input.descricao,
        input.valorTotal,
        input.competenciaData,
        faturaCompetenciaResolved,
        input.competenciaHora ?? null,
        input.vencimentoData || null,
        input.status,
        input.gestaoId,
        input.lancamentoId,
      ],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    if (isTransferencia) {
      await connection.query(`DELETE FROM lancamento_rateios WHERE lancamento_id = ?`, [
        input.lancamentoId,
      ]);
    } else {
      await connection.query(
        `
          UPDATE lancamento_rateios
          SET valor = ROUND((? * percentual) / 100, 2)
          WHERE lancamento_id = ?
        `,
        [input.valorTotal, input.lancamentoId],
      );

      const [rateios] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM lancamento_rateios WHERE lancamento_id = ? LIMIT 1`,
        [input.lancamentoId],
      );

      if (rateios.length === 0) {
        await connection.query(
          `
            INSERT INTO lancamento_rateios (lancamento_id, usuario_id, valor, percentual)
            VALUES (?, ?, ?, 100)
          `,
          [input.lancamentoId, input.userId, input.valorTotal],
        );
      }
    }

    await syncGestaoInicioEm(connection, input.gestaoId);

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "update",
      module: "lancamentos",
      entity: "lancamento",
      entityId: input.lancamentoId,
      details: { tipo: input.tipo, status: input.status, valorTotal: input.valorTotal },
    });

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function buildLancamentoFilters(filters: SearchLancamentosInput): SqlFilters {
  const conditions = ["l.gestao_id = ?"];
  const params: Array<string | number> = [filters.gestaoId];
  const dateExpression =
    filters.dateField === "fatura"
      ? "COALESCE(l.fatura_competencia_data, l.competencia_data)"
      : "l.competencia_data";

  if (filters.text) {
    conditions.push(
      "(l.descricao LIKE ? OR c.nome LIKE ? OR ct.nome LIKE ? OR ctd.nome LIKE ?)",
    );
    params.push(`%${filters.text}%`, `%${filters.text}%`, `%${filters.text}%`, `%${filters.text}%`);
  }

  if (filters.tipo) {
    conditions.push("l.tipo = ?");
    params.push(filters.tipo);
  }

  if (filters.meio) {
    conditions.push("l.meio = ?");
    params.push(filters.meio);
  }

  if (filters.contaId) {
    conditions.push(
      "(l.conta_id = ? OR (l.tipo = 'transferencia' AND l.conta_destino_id = ?))",
    );
    params.push(filters.contaId, filters.contaId);
  }

  if (filters.categoriaId) {
    conditions.push("l.categoria_id = ?");
    params.push(filters.categoriaId);
  }

  if (filters.minValor) {
    conditions.push("l.valor_total >= ?");
    params.push(filters.minValor);
  }

  if (filters.maxValor) {
    conditions.push("l.valor_total <= ?");
    params.push(filters.maxValor);
  }

  if (filters.dateFrom) {
    conditions.push(`${dateExpression} >= ?`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`${dateExpression} <= ?`);
    params.push(filters.dateTo);
  }

  conditions.push(sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l"));

  return { conditions, params };
}

export async function searchLancamentos(filters: SearchLancamentosInput) {
  const { conditions, params } = buildLancamentoFilters(filters);
  const orderBy =
    filters.order === "asc" ? ORDER_BY_LANCAMENTO_RECIENTE_ASC : ORDER_BY_LANCAMENTO_RECIENTE_DESC;

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-%d') AS fatura_competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT 50
    `,
    params,
  );

  return rows;
}

export async function listLancamentosForContaRange(input: {
  gestaoId: number;
  contaId: number;
  dateFrom?: string;
  dateTo?: string;
  dateField?: "competencia" | "fatura";
  /** Ordenação por competência (padrão asc). “desc” = mais recentes primeiro. */
  order?: "asc" | "desc";
  /** Limite de linhas (1–500). Útil quando a UI mostra só os últimos N. */
  limit?: number;
}) {
  const filters: SearchLancamentosInput = {
    gestaoId: input.gestaoId,
    contaId: input.contaId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    dateField: input.dateField,
  };
  const { conditions, params } = buildLancamentoFilters(filters);
  const competenciaOrder =
    input.order === "desc" ? ORDER_BY_LANCAMENTO_RECIENTE_DESC : ORDER_BY_LANCAMENTO_RECIENTE_ASC;
  const orderBy =
    input.dateField === "fatura" ? ORDER_BY_LANCAMENTO_FATURA_ASC : competenciaOrder;

  const limitN =
    input.limit != null && Number.isFinite(Number(input.limit))
      ? Math.min(500, Math.max(1, Math.floor(Number(input.limit))))
      : null;
  const limitSql = limitN != null ? ` LIMIT ${limitN}` : "";

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-%d') AS fatura_competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${orderBy}${limitSql}
    `,
    params,
  );

  return rows;
}

export async function findLatestLancamento(filters: SearchLancamentosInput) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-%d') AS fatura_competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
      LIMIT 1
    `,
    params,
  );

  return rows[0] ?? null;
}

export async function findLargestLancamento(
  filters: SearchLancamentosInput & { tipo: "receita" | "despesa" },
) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-%d') AS fatura_competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY l.valor_total DESC, ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
      LIMIT 1
    `,
    params,
  );

  return rows[0] ?? null;
}

export async function sumLancamentos(filters: SearchLancamentosInput) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<Array<RowDataPacket & { total: string | null; quantidade: number }>>(
    `
      SELECT
        COALESCE(SUM(l.valor_total), 0) AS total,
        COUNT(*) AS quantidade
      FROM lancamentos l
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE ${conditions.join(" AND ")}
    `,
    params,
  );

  return rows[0] ?? { total: "0", quantidade: 0 };
}

export async function summarizeLancamentos(filters: SearchLancamentosInput) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        receitas: string | null;
        despesas: string | null;
        saldo: string | null;
        quantidade: number;
      }
    >
  >(
    `
      SELECT
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END), 0) AS despesas,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'receita' THEN l.valor_total
              WHEN l.tipo = 'despesa' THEN -l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS saldo,
        COUNT(*) AS quantidade
      FROM lancamentos l
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE ${conditions.join(" AND ")}
    `,
    params,
  );

  return rows[0] ?? { receitas: "0", despesas: "0", saldo: "0", quantidade: 0 };
}

export async function summarizeLancamentosByCategoria(
  filters: SearchLancamentosInput & { tipo?: "receita" | "despesa" | "ajuste" },
) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        categoria_nome: string | null;
        total: string;
        quantidade: number;
      }
    >
  >(
    `
      SELECT
        c.nome AS categoria_nome,
        COALESCE(SUM(l.valor_total), 0) AS total,
        COUNT(*) AS quantidade
      FROM lancamentos l
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY c.nome
      ORDER BY total DESC, quantidade DESC
      LIMIT 10
    `,
    params,
  );

  return rows;
}

export async function summarizeLancamentosByConta(
  filters: SearchLancamentosInput & { tipo?: "receita" | "despesa" | "ajuste" },
) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        conta_nome: string;
        total: string;
        quantidade: number;
      }
    >
  >(
    `
      SELECT
        ct.nome AS conta_nome,
        COALESCE(SUM(l.valor_total), 0) AS total,
        COUNT(*) AS quantidade
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY ct.nome
      ORDER BY total DESC, quantidade DESC
      LIMIT 10
    `,
    params,
  );

  return rows;
}

export async function summarizeLancamentosByDia(
  filters: SearchLancamentosInput & { tipo?: "receita" | "despesa" | "ajuste" },
) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        competencia_data: string;
        total: string;
        quantidade: number;
      }
    >
  >(
    `
      SELECT
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        COALESCE(SUM(l.valor_total), 0) AS total,
        COUNT(*) AS quantidade
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY DATE(l.competencia_data)
      ORDER BY total DESC, competencia_data DESC
      LIMIT 10
    `,
    params,
  );

  return rows;
}

export type GestaoInsights = {
  receitasMesAtual: string;
  despesasMesAtual: string;
  receitasMesAnterior: string;
  despesasMesAnterior: string;
  despesasAteHojeMesAtual: string;
  diaDoMes: number;
  diasNoMesAtual: number;
  projecaoDespesaFimMes: string;
  margemFluxoPct: string | null;
  variacaoDespesaVsMesAnteriorPct: string | null;
  topCategorias: Array<{ nome: string; total: string }>;
};

export async function getGestaoInsights(gestaoId: number): Promise<GestaoInsights> {
  const [mesAtual] = await pool.query<
    Array<RowDataPacket & { receitas: string | null; despesas: string | null }>
  >(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS despesas
      FROM lancamentos
      WHERE gestao_id = ?
        AND ${SQL_DATA_RECORTE_GESTAO} >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND ${SQL_DATA_RECORTE_GESTAO} <= LAST_DAY(CURDATE())
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare()}
    `,
    [gestaoId],
  );

  const [mesAnterior] = await pool.query<
    Array<RowDataPacket & { receitas: string | null; despesas: string | null }>
  >(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS despesas
      FROM lancamentos
      WHERE gestao_id = ?
        AND ${SQL_DATA_RECORTE_GESTAO} >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND ${SQL_DATA_RECORTE_GESTAO} <= LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare()}
    `,
    [gestaoId],
  );

  const [ateHoje] = await pool.query<Array<RowDataPacket & { despesas: string | null }>>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS despesas
      FROM lancamentos
      WHERE gestao_id = ?
        AND ${SQL_DATA_RECORTE_GESTAO} >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND ${SQL_DATA_RECORTE_GESTAO} <= CURDATE()
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare()}
    `,
    [gestaoId],
  );

  const [dims] = await pool.query<Array<RowDataPacket & { dia: number; dias_mes: number }>>(
    `
      SELECT DAY(CURDATE()) AS dia, DAY(LAST_DAY(CURDATE())) AS dias_mes
    `,
  );

  const [topCats] = await pool.query<Array<RowDataPacket & { nome: string | null; total: string | null }>>(
    `
      SELECT c.nome AS nome, COALESCE(SUM(l.valor_total), 0) AS total
      FROM lancamentos l
      INNER JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND l.tipo = 'despesa'
        AND l.status <> 'cancelado'
        AND ${SQL_L_DATA_RECORTE_GESTAO} >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND ${SQL_L_DATA_RECORTE_GESTAO} <= LAST_DAY(CURDATE())
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
      GROUP BY c.id, c.nome
      ORDER BY total DESC
      LIMIT 5
    `,
    [gestaoId],
  );

  const receitasMA = Number(mesAtual[0]?.receitas ?? 0);
  const despesasMA = Number(mesAtual[0]?.despesas ?? 0);
  const despesasAnt = Number(mesAnterior[0]?.despesas ?? 0);
  const despesasAteHoje = Number(ateHoje[0]?.despesas ?? 0);
  const diaDoMes = Number(dims[0]?.dia ?? 1);
  const diasNoMesAtual = Number(dims[0]?.dias_mes ?? 30);

  const mediaDiaria = diaDoMes > 0 ? despesasAteHoje / diaDoMes : 0;
  const projecao = mediaDiaria * diasNoMesAtual;

  let margemFluxoPct: string | null = null;
  if (receitasMA > 0) {
    margemFluxoPct = (((receitasMA - despesasMA) / receitasMA) * 100).toFixed(1);
  }

  let variacaoDespesaVsMesAnteriorPct: string | null = null;
  if (despesasAnt > 0) {
    variacaoDespesaVsMesAnteriorPct = (((despesasMA - despesasAnt) / despesasAnt) * 100).toFixed(1);
  }

  return {
    receitasMesAtual: mesAtual[0]?.receitas ?? "0",
    despesasMesAtual: mesAtual[0]?.despesas ?? "0",
    receitasMesAnterior: mesAnterior[0]?.receitas ?? "0",
    despesasMesAnterior: mesAnterior[0]?.despesas ?? "0",
    despesasAteHojeMesAtual: ateHoje[0]?.despesas ?? "0",
    diaDoMes,
    diasNoMesAtual,
    projecaoDespesaFimMes: projecao.toFixed(2),
    margemFluxoPct,
    variacaoDespesaVsMesAnteriorPct,
    topCategorias: topCats.map((row) => ({
      nome: row.nome ?? "(sem nome)",
      total: row.total ?? "0",
    })),
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Primeiro e último dia (YYYY-MM-DD) do mês civil `anoMes` (YYYY-MM). */
export function boundsForCalendarMonth(anoMes: string): { from: string; to: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(anoMes.trim());
  if (!m) {
    throw new Error(`anoMes invalido: ${anoMes}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12) {
    throw new Error(`anoMes invalido: ${anoMes}`);
  }
  const to = new Date(y, mo, 0);
  return {
    from: `${y}-${pad2(mo)}-01`,
    to: `${y}-${pad2(mo)}-${pad2(to.getDate())}`,
  };
}

function defaultAnoMesLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Meses civil `anoMes` (YYYY-MM) e mês anterior. */
function prevCalendarMonth(anoMes: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(anoMes.trim());
  if (!m) {
    return defaultAnoMesLocal();
  }
  let y = Number(m[1]);
  let mo = Number(m[2]) - 1;
  if (mo < 1) {
    mo = 12;
    y -= 1;
  }
  return `${y}-${pad2(mo)}`;
}

export type MesResumoFluxo = {
  mes: string;
  receitas: string;
  despesas: string;
  guardado?: string;
  resgatado?: string;
};

/** Últimos `count` meses civis (incluindo o mês corrente), com totais por mês. */
export async function listGestaoFluxoUltimosMeses(
  gestaoId: number,
  count: number,
): Promise<MesResumoFluxo[]> {
  const n = Math.min(Math.max(count, 1), 24);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  const from = `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`;
  const to = `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`;

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        ym: string;
        receitas: string | null;
        despesas: string | null;
        guardado: string | null;
        resgatado: string | null;
      }
    >
  >(
    `
      SELECT
        DATE_FORMAT(${SQL_L_DATA_RECORTE_GESTAO}, '%Y-%m') AS ym,
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' AND l.status <> 'cancelado' THEN l.valor_total ELSE 0 END), 0)
          AS receitas,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.status <> 'cancelado' THEN l.valor_total ELSE 0 END), 0)
          AS despesas,
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND l.status <> 'cancelado' AND ctd.tipo IN ('poupanca', 'investimento') THEN l.valor_total ELSE 0 END), 0)
          AS guardado,
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND l.status <> 'cancelado' AND ct.tipo IN ('poupanca', 'investimento') AND ctd.tipo IN ('corrente', 'carteira', 'caixa', 'outro') THEN l.valor_total ELSE 0 END), 0)
          AS resgatado
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE l.gestao_id = ?
        AND ${SQL_L_DATA_RECORTE_GESTAO} >= ?
        AND ${SQL_L_DATA_RECORTE_GESTAO} <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
      GROUP BY DATE_FORMAT(${SQL_L_DATA_RECORTE_GESTAO}, '%Y-%m')
      ORDER BY ym ASC
    `,
    [gestaoId, from, to],
  );

  const byYm = new Map(rows.map((r) => [r.ym, r]));
  const out: MesResumoFluxo[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const row = byYm.get(ym);
    out.push({
      mes: ym,
      receitas: row?.receitas ?? "0",
      despesas: row?.despesas ?? "0",
      guardado: row?.guardado ?? "0",
      resgatado: row?.resgatado ?? "0",
    });
  }
  return out;
}

/** Meses civis dentro de um período real, sem puxar meses anteriores ao recorte. */
export async function listGestaoFluxoMesesPeriodo(input: {
  gestaoId: number;
  dateFrom: string;
  dateTo: string;
}): Promise<MesResumoFluxo[]> {
  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        ym: string;
        receitas: string | null;
        despesas: string | null;
        guardado: string | null;
        resgatado: string | null;
      }
    >
  >(
    `
      SELECT
        DATE_FORMAT(${SQL_L_DATA_RECORTE_GESTAO}, '%Y-%m') AS ym,
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' AND l.status <> 'cancelado' THEN l.valor_total ELSE 0 END), 0)
          AS receitas,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.status <> 'cancelado' THEN l.valor_total ELSE 0 END), 0)
          AS despesas,
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND l.status <> 'cancelado' AND ctd.tipo IN ('poupanca', 'investimento') THEN l.valor_total ELSE 0 END), 0)
          AS guardado,
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND l.status <> 'cancelado' AND ct.tipo IN ('poupanca', 'investimento') AND ctd.tipo IN ('corrente', 'carteira', 'caixa', 'outro') THEN l.valor_total ELSE 0 END), 0)
          AS resgatado
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE l.gestao_id = ?
        AND ${SQL_L_DATA_RECORTE_GESTAO} >= ?
        AND ${SQL_L_DATA_RECORTE_GESTAO} <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
      GROUP BY DATE_FORMAT(${SQL_L_DATA_RECORTE_GESTAO}, '%Y-%m')
      ORDER BY ym ASC
    `,
    [input.gestaoId, input.dateFrom, input.dateTo],
  );

  const byYm = new Map(rows.map((r) => [r.ym, r]));
  const start = new Date(`${input.dateFrom}T12:00:00Z`);
  const end = new Date(`${input.dateTo}T12:00:00Z`);
  const out: MesResumoFluxo[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 12));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1, 12));

  while (cursor <= last) {
    const ym = `${cursor.getUTCFullYear()}-${pad2(cursor.getUTCMonth() + 1)}`;
    const row = byYm.get(ym);
    out.push({
      mes: ym,
      receitas: row?.receitas ?? "0",
      despesas: row?.despesas ?? "0",
      guardado: row?.guardado ?? "0",
      resgatado: row?.resgatado ?? "0",
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1, 12));
  }

  return out;
}

/** Insights do mês civil `anoMes` (YYYY-MM). Projeção só faz sentido no mês corrente. */
export async function getGestaoInsightsParaMes(
  gestaoId: number,
  anoMes: string,
): Promise<GestaoInsights> {
  const { from, to } = boundsForCalendarMonth(anoMes);
  const prev = prevCalendarMonth(anoMes);
  const { from: prevFrom, to: prevTo } = boundsForCalendarMonth(prev);

  const now = new Date();
  const curYm = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const isCurrentMonth = anoMes === curYm;
  const todayIso = now.toISOString().slice(0, 10);
  const ateHojeEnd = isCurrentMonth && todayIso <= to ? todayIso : to;

  const [mesAtual] = await pool.query<
    Array<RowDataPacket & { receitas: string | null; despesas: string | null }>
  >(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS despesas
      FROM lancamentos
      WHERE gestao_id = ?
        AND ${SQL_DATA_RECORTE_GESTAO} >= ?
        AND ${SQL_DATA_RECORTE_GESTAO} <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare()}
    `,
    [gestaoId, from, to],
  );

  const [mesAnterior] = await pool.query<
    Array<RowDataPacket & { receitas: string | null; despesas: string | null }>
  >(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS despesas
      FROM lancamentos
      WHERE gestao_id = ?
        AND ${SQL_DATA_RECORTE_GESTAO} >= ?
        AND ${SQL_DATA_RECORTE_GESTAO} <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare()}
    `,
    [gestaoId, prevFrom, prevTo],
  );

  const [ateHoje] = await pool.query<Array<RowDataPacket & { despesas: string | null }>>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS despesas
      FROM lancamentos
      WHERE gestao_id = ?
        AND ${SQL_DATA_RECORTE_GESTAO} >= ?
        AND ${SQL_DATA_RECORTE_GESTAO} <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare()}
    `,
    [gestaoId, from, ateHojeEnd],
  );

  const diasNoMesAtual = new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)), 0).getDate();
  const diaDoMes = isCurrentMonth
    ? Math.min(Number(todayIso.slice(8, 10)), diasNoMesAtual)
    : diasNoMesAtual;

  const [topCats] = await pool.query<Array<RowDataPacket & { nome: string | null; total: string | null }>>(
    `
      SELECT c.nome AS nome, COALESCE(SUM(l.valor_total), 0) AS total
      FROM lancamentos l
      INNER JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND l.tipo = 'despesa'
        AND l.status <> 'cancelado'
        AND ${SQL_L_DATA_RECORTE_GESTAO} >= ?
        AND ${SQL_L_DATA_RECORTE_GESTAO} <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
      GROUP BY c.id, c.nome
      ORDER BY total DESC
      LIMIT 5
    `,
    [gestaoId, from, to],
  );

  const receitasMA = Number(mesAtual[0]?.receitas ?? 0);
  const despesasMA = Number(mesAtual[0]?.despesas ?? 0);
  const despesasAnt = Number(mesAnterior[0]?.despesas ?? 0);
  const despesasAteHoje = Number(ateHoje[0]?.despesas ?? 0);

  const mediaDiaria = diaDoMes > 0 ? despesasAteHoje / diaDoMes : 0;
  const projecao = mediaDiaria * diasNoMesAtual;

  let margemFluxoPct: string | null = null;
  if (receitasMA > 0) {
    margemFluxoPct = (((receitasMA - despesasMA) / receitasMA) * 100).toFixed(1);
  }

  let variacaoDespesaVsMesAnteriorPct: string | null = null;
  if (despesasAnt > 0) {
    variacaoDespesaVsMesAnteriorPct = (((despesasMA - despesasAnt) / despesasAnt) * 100).toFixed(1);
  }

  return {
    receitasMesAtual: mesAtual[0]?.receitas ?? "0",
    despesasMesAtual: mesAtual[0]?.despesas ?? "0",
    receitasMesAnterior: mesAnterior[0]?.receitas ?? "0",
    despesasMesAnterior: mesAnterior[0]?.despesas ?? "0",
    despesasAteHojeMesAtual: ateHoje[0]?.despesas ?? "0",
    diaDoMes,
    diasNoMesAtual,
    projecaoDespesaFimMes: projecao.toFixed(2),
    margemFluxoPct,
    variacaoDespesaVsMesAnteriorPct,
    topCategorias: topCats.map((row) => ({
      nome: row.nome ?? "(sem nome)",
      total: row.total ?? "0",
    })),
  };
}

export type RevisarDuplicidadeRow = RowDataPacket & {
  descricao: string;
  valor_total: string;
  vezes: number;
  ids: string;
  primeira: string;
  ultima: string;
};

export async function listRevisarDuplicidadesMes(gestaoId: number, anoMes?: string) {
  const mes = anoMes ?? defaultAnoMesLocal();
  const { from, to } = boundsForCalendarMonth(mes);
  const [rows] = await pool.query<RevisarDuplicidadeRow[]>(
    `
      SELECT
        l.descricao AS descricao,
        FORMAT(l.valor_total, 2, 'de_DE') AS valor_total,
        COUNT(*) AS vezes,
        GROUP_CONCAT(l.id ORDER BY ${SQL_L_DATA_RECORTE_GESTAO} SEPARATOR ',') AS ids,
        DATE_FORMAT(MIN(${SQL_L_DATA_RECORTE_GESTAO}), '%Y-%m-%d') AS primeira,
        DATE_FORMAT(MAX(${SQL_L_DATA_RECORTE_GESTAO}), '%Y-%m-%d') AS ultima
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.tipo = 'despesa'
        AND ${SQL_L_DATA_RECORTE_GESTAO} >= ?
        AND ${SQL_L_DATA_RECORTE_GESTAO} <= ?
      GROUP BY l.descricao, l.valor_total
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC, SUM(l.valor_total) DESC
      LIMIT 40
    `,
    [gestaoId, from, to],
  );

  return rows;
}

export type RevisarMicrovalorRow = RowDataPacket & {
  id: number;
  descricao: string;
  valor_total: string;
  competencia_data: string;
};

export async function listRevisarMicrovaloresMes(gestaoId: number, anoMes?: string) {
  const mes = anoMes ?? defaultAnoMesLocal();
  const { from, to } = boundsForCalendarMonth(mes);
  const [rows] = await pool.query<RevisarMicrovalorRow[]>(
    `
      SELECT
        l.id,
        l.descricao,
        FORMAT(l.valor_total, 2, 'de_DE') AS valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.tipo = 'despesa'
        AND ${SQL_L_DATA_RECORTE_GESTAO} >= ?
        AND ${SQL_L_DATA_RECORTE_GESTAO} <= ?
        AND l.valor_total > 0
        AND l.valor_total < 5
      ORDER BY ${SQL_L_DATA_RECORTE_GESTAO} DESC, l.id DESC
      LIMIT 40
    `,
    [gestaoId, from, to],
  );

  return rows;
}

export async function countSimilarLancamentosRecent(input: {
  gestaoId: number;
  contaId: number;
  valorTotal: number;
  descricao: string;
  dias?: number;
}) {
  const dias = input.dias ?? 30;

  const [rows] = await pool.query<Array<RowDataPacket & { c: number }>>(
    `
      SELECT COUNT(*) AS c
      FROM lancamentos
      WHERE gestao_id = ?
        AND conta_id = ?
        AND status <> 'cancelado'
        AND tipo <> 'transferencia'
        AND ABS(valor_total - ?) < 0.009
        AND LOWER(TRIM(descricao)) = LOWER(TRIM(?))
        AND competencia_data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `,
    [input.gestaoId, input.contaId, input.valorTotal, input.descricao, dias],
  );

  return Number(rows[0]?.c ?? 0);
}

/**
 * Busca um lançamento "gêmeo" criado nos últimos N segundos (default 120s) — usado
 * para idempotência em fluxos de criação automática (assistente IA) que podem disparar
 * dois INSERT por loops de tool calling ou cliques duplicados.
 */
export async function findRecentDuplicateLancamentoId(input: {
  gestaoId: number;
  contaId: number;
  valorTotal: number;
  descricao: string;
  competenciaData: string;
  competenciaHora?: string;
  segundos?: number;
}): Promise<number | null> {
  const segundos = input.segundos ?? 120;
  const hasHora = Boolean(input.competenciaHora);

  const [rows] = await pool.query<Array<RowDataPacket & { id: number }>>(
    `
      SELECT id
      FROM lancamentos
      WHERE gestao_id = ?
        AND conta_id = ?
        AND status <> 'cancelado'
        AND tipo <> 'transferencia'
        AND ABS(valor_total - ?) < 0.009
        AND LOWER(TRIM(descricao)) = LOWER(TRIM(?))
        AND competencia_data = ?
        AND (? = 0 OR TIME_FORMAT(competencia_hora, '%H:%i') = ?)
        AND criado_em >= DATE_SUB(NOW(), INTERVAL ? SECOND)
      ORDER BY id DESC
      LIMIT 1
    `,
    [
      input.gestaoId,
      input.contaId,
      input.valorTotal,
      input.descricao,
      input.competenciaData,
      hasHora ? 1 : 0,
      input.competenciaHora ?? null,
      segundos,
    ],
  );

  return rows[0]?.id != null ? Number(rows[0].id) : null;
}

export async function updateLancamentosMeio(input: {
  gestaoId: number;
  lancamentoIds: number[];
  meio: LancamentoMeio;
}) {
  if (input.lancamentoIds.length === 0) {
    return 0;
  }

  await assertLancamentoIdsInGestao(input.lancamentoIds, input.gestaoId);

  const placeholders = input.lancamentoIds.map(() => "?").join(", ");
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE lancamentos
      SET meio = ?
      WHERE gestao_id = ?
        AND id IN (${placeholders})
    `,
    [input.meio, input.gestaoId, ...input.lancamentoIds],
  );

  return result.affectedRows;
}

export async function updateLancamentosCompetenciaData(input: {
  gestaoId: number;
  lancamentoIds: number[];
  competenciaData: string;
}) {
  if (input.lancamentoIds.length === 0) {
    return 0;
  }

  await assertLancamentoIdsInGestao(input.lancamentoIds, input.gestaoId);

  const placeholders = input.lancamentoIds.map(() => "?").join(", ");
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE lancamentos
      SET competencia_data = ?
      WHERE gestao_id = ?
        AND id IN (${placeholders})
    `,
    [input.competenciaData, input.gestaoId, ...input.lancamentoIds],
  );

  if (result.affectedRows > 0) {
    const connection = await pool.getConnection();
    try {
      await syncGestaoInicioEm(connection, input.gestaoId);
    } finally {
      connection.release();
    }
  }

  return result.affectedRows;
}

// ============================================================
// Fechamentos de periodo (semanal / mensal)
// ============================================================

export type FechamentoPeriodoRow = RowDataPacket & {
  id: number;
  gestao_id: number;
  tipo: "semanal" | "mensal";
  periodo_inicio: string;
  periodo_fim: string;
  fechado_em: string;
  fechado_por_usuario_id: number;
  entradas: string;
  saidas_corrente: string;
  compras_cartao: string;
  sobra: string;
  reservado: string;
  pagamento_fatura: string;
  ajuste_dia_a_dia_tipo: "nenhum" | "aporte" | "resgate";
  ajuste_dia_a_dia_valor: string;
  apenas_snapshot: number;
  lancamento_reserva_id: number | null;
  /** JSON: [{ contaId, nome, valor }] — quanto foi para cada reserva neste fechamento. */
  reservas_por_conta: unknown;
  observacoes: string | null;
  fechado_por_nome?: string | null;
};

export type SemanaMetricas = {
  entradas: number;
  saidasCorrente: number;
  comprasCartao: number;
  sobra: number;
};

export type SemanaResumoDia = {
  data: string;
  entradas: number;
  /** Débito, Pix etc. na corrente (sem pagamento de fatura). */
  saidasCorrente: number;
  /** Pagamento de fatura na corrente naquele dia. */
  pagamentoFatura: number;
  /** Transferência saindo da corrente (ex.: aplicação CDB). */
  transferenciaSaida: number;
  /** Transferência entrando na corrente (ex.: resgate). */
  transferenciaEntrada: number;
  comprasCartao: number;
};

const SQL_NOT_PAGAMENTO_FATURA = `
  NOT (
    l.descricao LIKE 'Pagamento efetuado - Fatura Cartão Inter%'
    OR l.descricao LIKE 'Pagamento efetuado - Fatura Cartao Inter%'
    OR l.descricao LIKE 'Pagamento Fatura -%'
    OR l.descricao LIKE 'Pagamento efetuado - Fatura Cart%'
    OR (COALESCE(c.nome, '') = 'Saida da conta' AND (
      l.descricao LIKE '%Fatura Cartão%'
      OR l.descricao LIKE '%Fatura Cartao%'
    ))
  )
`;

/** Despesa na corrente que é pagamento de fatura (extrato / categoria Saida da conta). */
const SQL_PAGAMENTO_FATURA = `
  (
    l.descricao LIKE 'Pagamento efetuado - Fatura Cartão Inter%'
    OR l.descricao LIKE 'Pagamento efetuado - Fatura Cartao Inter%'
    OR l.descricao LIKE 'Pagamento Fatura -%'
    OR l.descricao LIKE 'Pagamento efetuado - Fatura Cart%'
    OR (COALESCE(c.nome, '') = 'Saida da conta' AND (
      l.descricao LIKE '%Fatura Cartão%'
      OR l.descricao LIKE '%Fatura Cartao%'
    ))
  )
`;

export type ResumoFaturaCartao = {
  contaCartaoId: number;
  nome: string;
  faturaCompetenciaData: string;
  comprasFatura: number;
  pagamentosCorrente: number;
  creditosNoCartao: number;
  saldoFatura: number;
  pagamentosConfiaveis: boolean;
};

export type ResumoFaturasCartaoGestao = {
  cartoes: ResumoFaturaCartao[];
  totalComprasFatura: number;
  totalPagamentosCorrente: number;
  totalSaldoFatura: number;
};

export type SemanaConferenciaLancamento = {
  grupo: "entradas" | "debito_pix" | "cartao";
  id: number;
  data: string;
  hora: string | null;
  descricao: string;
  valor: number;
  tipo: string;
  meio: LancamentoMeio | null;
  conta_nome: string;
  conta_tipo: string;
  categoria_nome: string | null;
};

/** Calcula as metricas chave de uma semana (sem persistir). */
export async function getSemanaMetricas(input: {
  gestaoId: number;
  inicio: string;
  fim: string;
}): Promise<SemanaMetricas> {
  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        entradas: string | null;
        saidas_corrente: string | null;
        compras_cartao: string | null;
      }
    >
  >(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'receita' AND ct.tipo IN ('corrente','carteira','caixa','outro')
              THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS entradas,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'despesa'
                AND ct.tipo IN ('corrente','carteira','caixa','outro')
                AND ${SQL_NOT_PAGAMENTO_FATURA}
              THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS saidas_corrente,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'despesa' AND ct.tipo = 'cartao_credito'
              THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS compras_cartao
      FROM lancamentos l
      INNER JOIN contas ct ON ct.id = l.conta_id
      LEFT JOIN categorias c ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
        AND ${sqlLancamentoEntraFechamentoSemanal("l")}
    `,
    [input.gestaoId, input.inicio, input.fim],
  );

  const row = rows[0];
  const entradas = Number(row?.entradas ?? 0);
  const saidas = Number(row?.saidas_corrente ?? 0);
  const cartao = Number(row?.compras_cartao ?? 0);

  return {
    entradas,
    saidasCorrente: saidas,
    comprasCartao: cartao,
    sobra: entradas - saidas,
  };
}

/** Pagamentos de fatura na corrente atribuídos à fatura `YYYY-MM-01` (sem janela de datas). */
export async function getPagamentosFaturaPorFaturaCompetencia(input: {
  gestaoId: number;
  faturaCompetenciaData: string;
}): Promise<number> {
  const faturaKey = normalizeFaturaMesKey(input.faturaCompetenciaData);

  const [rows] = await pool.query<Array<RowDataPacket & { total: string | null }>>(
    `
      SELECT COALESCE(SUM(l.valor_total), 0) AS total
      FROM lancamentos l
      INNER JOIN contas ct ON ct.id = l.conta_id
      LEFT JOIN categorias c ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.tipo = 'despesa'
        AND ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
        AND ${SQL_PAGAMENTO_FATURA}
        AND l.fatura_competencia_data IS NOT NULL
        AND DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-01') = ?
    `,
    [input.gestaoId, faturaKey],
  );

  return Number(rows[0]?.total ?? 0);
}

export type MovimentoFaturaCartao = {
  tipo: "compra" | "pagamento";
  id: number;
  conta_id: number;
  categoria_id: number | null;
  status: string;
  meio: string | null;
  competencia_data: string;
  competencia_hora: string | null;
  fatura_competencia_data: string | null;
  vencimento_data: string | null;
  descricao: string | null;
  categoria_nome: string;
  conta_nome: string;
  valor_total: number;
};

/** Meses de fatura (YYYY-MM-01) que têm compras neste cartão ou pagamentos de fatura na gestão. */
export async function listFaturaMesKeysParaCartaoConta(input: {
  gestaoId: number;
  contaCartaoId: number;
  /** Quantidade máxima de meses distintos (mais recentes). Evita varrer histórico extenso. */
  maxMeses?: number;
}): Promise<string[]> {
  const maxMeses = Math.min(120, Math.max(1, Math.floor(input.maxMeses ?? 36)));

  const [rows] = await pool.query<Array<RowDataPacket & { fk: string | Date }>>(
    `
      SELECT fk
      FROM (
        SELECT DISTINCT fk
        FROM (
          SELECT DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-01') AS fk
          FROM lancamentos l
          WHERE l.gestao_id = ?
            AND l.conta_id = ?
            AND l.tipo = 'despesa'
            AND l.status <> 'cancelado'
            AND l.fatura_competencia_data IS NOT NULL
            AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare()}
          UNION ALL
          SELECT DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-01') AS fk
          FROM lancamentos l
          INNER JOIN contas ct ON ct.id = l.conta_id
          LEFT JOIN categorias c ON c.id = l.categoria_id
          WHERE l.gestao_id = ?
            AND l.tipo = 'despesa'
            AND l.status <> 'cancelado'
            AND l.fatura_competencia_data IS NOT NULL
            AND ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
            AND ${SQL_PAGAMENTO_FATURA}
        ) t
        WHERE fk IS NOT NULL
      ) d
      ORDER BY fk DESC
      LIMIT ?
    `,
    [input.gestaoId, input.contaCartaoId, input.gestaoId, maxMeses],
  );

  return rows.map((row) => normalizeFaturaMesKey(String(row.fk)));
}

/** Compras no cartão e pagamentos na corrente atribuídos à mesma fatura (YYYY-MM-01). */
export async function listMovimentosFaturaCartaoConta(input: {
  gestaoId: number;
  contaCartaoId: number;
  faturaCompetenciaData: string;
  limit?: number;
  offset?: number;
}): Promise<MovimentoFaturaCartao[]> {
  const faturaKey = normalizeFaturaMesKey(input.faturaCompetenciaData);
  const limit = input.limit ? Math.min(100, Math.max(1, Math.floor(input.limit))) : null;
  const offset = Math.max(0, Math.floor(input.offset ?? 0));

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        mov_tipo: string;
        id: number;
        conta_id: number;
        categoria_id: number | null;
        status: string;
        meio: string | null;
        competencia_data: string | Date;
        competencia_hora: string | null;
        fatura_competencia_data: string | Date | null;
        vencimento_data: string | Date | null;
        descricao: string | null;
        categoria_nome: string | null;
        conta_nome: string | null;
        valor_total: string | null;
      }
    >
  >(
    `
      SELECT *
      FROM (
        (
          SELECT
            'compra' AS mov_tipo,
            l.id,
            l.conta_id,
            l.categoria_id,
            l.status,
            l.meio,
            l.competencia_data,
            l.competencia_hora,
            l.fatura_competencia_data,
            l.vencimento_data,
            l.descricao,
            COALESCE(c.nome, '') AS categoria_nome,
            ct.nome AS conta_nome,
            l.valor_total
          FROM lancamentos l
          INNER JOIN contas ct ON ct.id = l.conta_id
          LEFT JOIN categorias c ON c.id = l.categoria_id
          WHERE l.gestao_id = ?
            AND l.conta_id = ?
            AND l.tipo = 'despesa'
            AND l.status <> 'cancelado'
            AND l.fatura_competencia_data IS NOT NULL
            AND DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-01') = ?
            AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
        )
        UNION ALL
        (
          SELECT
            'pagamento' AS mov_tipo,
            l.id,
            l.conta_id,
            l.categoria_id,
            l.status,
            l.meio,
            l.competencia_data,
            l.competencia_hora,
            l.fatura_competencia_data,
            l.vencimento_data,
            l.descricao,
            COALESCE(c.nome, '') AS categoria_nome,
            ct.nome AS conta_nome,
            l.valor_total
          FROM lancamentos l
          INNER JOIN contas ct ON ct.id = l.conta_id
          LEFT JOIN categorias c ON c.id = l.categoria_id
          WHERE l.gestao_id = ?
            AND l.tipo = 'despesa'
            AND l.status <> 'cancelado'
            AND ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
            AND ${SQL_PAGAMENTO_FATURA}
            AND l.fatura_competencia_data IS NOT NULL
            AND DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-01') = ?
        )
      ) movimentos
      ORDER BY competencia_data DESC, competencia_hora DESC, mov_tipo ASC, id DESC
      ${limit ? "LIMIT ? OFFSET ?" : ""}
    `,
    limit
      ? [input.gestaoId, input.contaCartaoId, faturaKey, input.gestaoId, faturaKey, limit, offset]
      : [input.gestaoId, input.contaCartaoId, faturaKey, input.gestaoId, faturaKey],
  );

  return rows.map((row) => ({
    tipo: row.mov_tipo === "pagamento" ? "pagamento" : "compra",
    id: row.id,
    conta_id: row.conta_id,
    categoria_id: row.categoria_id,
    status: row.status,
    meio: row.meio,
    competencia_data:
      row.competencia_data instanceof Date
        ? row.competencia_data.toISOString().slice(0, 10)
        : String(row.competencia_data).slice(0, 10),
    competencia_hora: row.competencia_hora,
    fatura_competencia_data:
      row.fatura_competencia_data instanceof Date
        ? row.fatura_competencia_data.toISOString().slice(0, 10)
        : row.fatura_competencia_data
          ? String(row.fatura_competencia_data).slice(0, 10)
          : null,
    vencimento_data:
      row.vencimento_data instanceof Date
        ? row.vencimento_data.toISOString().slice(0, 10)
        : row.vencimento_data
          ? String(row.vencimento_data).slice(0, 10)
          : null,
    descricao: row.descricao,
    categoria_nome: row.categoria_nome ?? "",
    conta_nome: row.conta_nome ?? "",
    valor_total: Number(row.valor_total ?? 0),
  }));
}

export async function countMovimentosFaturaCartaoConta(input: {
  gestaoId: number;
  contaCartaoId: number;
  faturaCompetenciaData: string;
}): Promise<number> {
  const faturaKey = normalizeFaturaMesKey(input.faturaCompetenciaData);

  const [rows] = await pool.query<Array<RowDataPacket & { total: string | number }>>(
    `
      SELECT COUNT(*) AS total
      FROM (
        SELECT l.id
        FROM lancamentos l
        WHERE l.gestao_id = ?
          AND l.conta_id = ?
          AND l.tipo = 'despesa'
          AND l.status <> 'cancelado'
          AND l.fatura_competencia_data IS NOT NULL
          AND DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-01') = ?
          AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
        UNION ALL
        SELECT l.id
        FROM lancamentos l
        INNER JOIN contas ct ON ct.id = l.conta_id
        LEFT JOIN categorias c ON c.id = l.categoria_id
        WHERE l.gestao_id = ?
          AND l.tipo = 'despesa'
          AND l.status <> 'cancelado'
          AND ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
          AND ${SQL_PAGAMENTO_FATURA}
          AND l.fatura_competencia_data IS NOT NULL
          AND DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-01') = ?
      ) movimentos
    `,
    [input.gestaoId, input.contaCartaoId, faturaKey, input.gestaoId, faturaKey],
  );

  return Number(rows[0]?.total ?? 0);
}

/** @deprecated Use getPagamentosFaturaPorFaturaCompetencia — mantido por compatibilidade. */
export async function getPagamentosFaturaParaCiclo(input: {
  gestaoId: number;
  faturaCompetenciaData: string;
}): Promise<number> {
  return getPagamentosFaturaPorFaturaCompetencia({
    gestaoId: input.gestaoId,
    faturaCompetenciaData: input.faturaCompetenciaData,
  });
}

async function sumComprasFaturaCartao(input: {
  gestaoId: number;
  contaCartaoId: number;
  faturaCompetenciaData: string;
}): Promise<number> {
  const faturaKey = normalizeFaturaMesKey(input.faturaCompetenciaData);

  const [rows] = await pool.query<Array<RowDataPacket & { total: string | null }>>(
    `
      SELECT COALESCE(SUM(l.valor_total), 0) AS total
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.conta_id = ?
        AND l.tipo = 'despesa'
        AND l.status <> 'cancelado'
        AND l.fatura_competencia_data IS NOT NULL
        AND DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-01') = ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixoBare()}
    `,
    [input.gestaoId, input.contaCartaoId, faturaKey],
  );

  return Number(rows[0]?.total ?? 0);
}

async function sumCreditosFaturaCartao(input: {
  gestaoId: number;
  contaCartaoId: number;
  faturaCompetenciaData: string;
}): Promise<number> {
  const faturaKey = normalizeFaturaMesKey(input.faturaCompetenciaData);

  const [rows] = await pool.query<Array<RowDataPacket & { total: string | null }>>(
    `
      SELECT COALESCE(SUM(l.valor_total), 0) AS total
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.conta_destino_id = ?
        AND l.tipo IN ('receita', 'transferencia')
        AND l.status <> 'cancelado'
        AND l.fatura_competencia_data IS NOT NULL
        AND DATE_FORMAT(l.fatura_competencia_data, '%Y-%m-01') = ?
    `,
    [input.gestaoId, input.contaCartaoId, faturaKey],
  );

  return Number(rows[0]?.total ?? 0);
}

export async function getResumoFaturaCartaoConta(input: {
  gestaoId: number;
  contaCartaoId: number;
  referenceDate?: string;
  /** YYYY-MM-01; quando informado, ignora referenceDate ao escolher a fatura. */
  faturaCompetenciaData?: string;
  /**
   * Quando false, o saldo exibido fica apenas compras − pagamentos na corrente (sem créditos no cartão).
   * Padrão true, compatível com o resumo da home/dashboard.
   */
  aplicarCreditosNoSaldo?: boolean;
}): Promise<ResumoFaturaCartao | null> {
  const [contaRows] = await pool.query<
    Array<RowDataPacket & { id: number; nome: string; fechamento_dia: number | null }>
  >(
    `
      SELECT id, nome, fechamento_dia
      FROM contas
      WHERE gestao_id = ? AND id = ? AND tipo = 'cartao_credito' AND ativa = 1
      LIMIT 1
    `,
    [input.gestaoId, input.contaCartaoId],
  );

  const conta = contaRows[0];
  if (!conta) {
    return null;
  }

  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const fechamentoDia = conta.fechamento_dia ?? 30;
  const faturaCompetenciaData = input.faturaCompetenciaData
    ? normalizeFaturaMesKey(input.faturaCompetenciaData)
    : resolveFaturaCompetenciaAberta(referenceDate, fechamentoDia);

  const usarCreditos = input.aplicarCreditosNoSaldo !== false;

  const [comprasFatura, pagamentosCorrente, creditosNoCartao] = await Promise.all([
    sumComprasFaturaCartao({
      gestaoId: input.gestaoId,
      contaCartaoId: conta.id,
      faturaCompetenciaData,
    }),
    getPagamentosFaturaPorFaturaCompetencia({
      gestaoId: input.gestaoId,
      faturaCompetenciaData,
    }),
    sumCreditosFaturaCartao({
      gestaoId: input.gestaoId,
      contaCartaoId: conta.id,
      faturaCompetenciaData,
    }),
  ]);

  const saldo = computeSaldoFaturaCartao({
    comprasFatura,
    pagamentosCorrente,
    creditosNoCartao: usarCreditos ? creditosNoCartao : 0,
  });

  return {
    contaCartaoId: conta.id,
    nome: conta.nome,
    faturaCompetenciaData,
    comprasFatura,
    pagamentosCorrente,
    creditosNoCartao,
    saldoFatura: saldo.saldoFatura,
    pagamentosConfiaveis: saldo.pagamentosConfiaveis,
  };
}

/** Lançamentos que compõem as colunas Entradas, Débito/Pix e Cartão do fechamento semanal. */
export async function listSemanaConferenciaLancamentos(input: {
  gestaoId: number;
  inicio: string;
  fim: string;
}): Promise<SemanaConferenciaLancamento[]> {
  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        grupo: "entradas" | "debito_pix" | "cartao" | null;
        id: number;
        data: string | Date;
        hora: string | null;
        descricao: string;
        valor: string | null;
        tipo: string;
        meio: LancamentoMeio | null;
        conta_nome: string;
        conta_tipo: string;
        categoria_nome: string | null;
      }
    >
  >(
    `
      SELECT *
      FROM (
        SELECT
          CASE
            WHEN l.tipo = 'receita' AND ct.tipo IN ('corrente','carteira','caixa','outro')
              THEN 'entradas'
            WHEN l.tipo = 'despesa'
              AND ct.tipo IN ('corrente','carteira','caixa','outro')
              AND ${SQL_NOT_PAGAMENTO_FATURA}
              THEN 'debito_pix'
            WHEN l.tipo = 'despesa' AND ct.tipo = 'cartao_credito'
              THEN 'cartao'
            ELSE NULL
          END AS grupo,
          l.id,
          DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS data,
          TIME_FORMAT(l.competencia_hora, '%H:%i') AS hora,
          l.descricao,
          l.valor_total AS valor,
          l.tipo,
          l.meio,
          ct.nome AS conta_nome,
          ct.tipo AS conta_tipo,
          c.nome AS categoria_nome
        FROM lancamentos l
        INNER JOIN contas ct ON ct.id = l.conta_id
        LEFT JOIN categorias c ON c.id = l.categoria_id
        WHERE l.gestao_id = ?
          AND l.status <> 'cancelado'
          AND l.competencia_data >= ?
          AND l.competencia_data <= ?
          AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
          AND ${sqlLancamentoEntraFechamentoSemanal("l")}
      ) base
      WHERE grupo IS NOT NULL
      ORDER BY data ASC, COALESCE(hora, '00:00') ASC, id ASC
    `,
    [input.gestaoId, input.inicio, input.fim],
  );

  return rows
    .filter((row): row is typeof row & { grupo: "entradas" | "debito_pix" | "cartao" } => row.grupo !== null)
    .map((row) => ({
      grupo: row.grupo,
      id: row.id,
      data: row.data instanceof Date ? row.data.toISOString().slice(0, 10) : String(row.data).slice(0, 10),
      hora: row.hora,
      descricao: row.descricao,
      valor: Number(row.valor ?? 0),
      tipo: row.tipo,
      meio: row.meio,
      conta_nome: row.conta_nome,
      conta_tipo: row.conta_tipo,
      categoria_nome: row.categoria_nome,
    }));
}

export async function getResumoFaturasCartaoGestao(
  gestaoId: number,
  referenceDate?: string,
): Promise<ResumoFaturasCartaoGestao> {
  const [cards] = await pool.query<Array<RowDataPacket & { id: number }>>(
    `
      SELECT id FROM contas
      WHERE gestao_id = ? AND tipo = 'cartao_credito' AND ativa = 1
      ORDER BY criado_em ASC
    `,
    [gestaoId],
  );

  const cartoes: ResumoFaturaCartao[] = [];
  for (const card of cards) {
    const resumo = await getResumoFaturaCartaoConta({
      gestaoId,
      contaCartaoId: card.id,
      referenceDate,
    });
    if (resumo) {
      cartoes.push(resumo);
    }
  }

  return {
    cartoes,
    totalComprasFatura: cartoes.reduce((acc, item) => acc + item.comprasFatura, 0),
    totalPagamentosCorrente: cartoes.reduce((acc, item) => acc + item.pagamentosCorrente, 0),
    totalSaldoFatura: cartoes.reduce((acc, item) => acc + item.saldoFatura, 0),
  };
}

/** Soma dos pagamentos de fatura do cartão na corrente (já lançados no extrato). */
export async function getSemanaPagamentosFatura(input: {
  gestaoId: number;
  inicio: string;
  fim: string;
}): Promise<number> {
  const [rows] = await pool.query<Array<RowDataPacket & { total: string | null }>>(
    `
      SELECT COALESCE(SUM(l.valor_total), 0) AS total
      FROM lancamentos l
      INNER JOIN contas ct ON ct.id = l.conta_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.tipo = 'despesa'
        AND ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
        AND ${sqlLancamentoEntraFechamentoSemanal("l")}
        AND (
          l.descricao LIKE 'Pagamento efetuado - Fatura Cartão Inter%'
          OR l.descricao LIKE '%Fatura Cartão%'
          OR l.descricao LIKE '%Fatura Cartao%'
        )
    `,
    [input.gestaoId, input.inicio, input.fim],
  );

  return Number(rows[0]?.total ?? 0);
}

/** Metricas dia a dia (segunda → domingo) para o detalhe da semana. */
export async function getSemanaResumoPorDia(input: {
  gestaoId: number;
  inicio: string;
  fim: string;
}): Promise<SemanaResumoDia[]> {
  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        data: string;
        entradas: string | null;
        saidas_corrente: string | null;
        pagamento_fatura: string | null;
        transferencia_saida: string | null;
        transferencia_entrada: string | null;
        compras_cartao: string | null;
      }
    >
  >(
    `
      SELECT
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS data,
        COALESCE(
          SUM(CASE WHEN l.tipo='receita' AND c_orig.tipo IN ('corrente','carteira','caixa','outro')
                   THEN l.valor_total ELSE 0 END),
          0
        ) AS entradas,
        COALESCE(
          SUM(CASE WHEN l.tipo='despesa' AND c_orig.tipo IN ('corrente','carteira','caixa','outro')
                    AND ${SQL_NOT_PAGAMENTO_FATURA}
                   THEN l.valor_total ELSE 0 END),
          0
        ) AS saidas_corrente,
        COALESCE(
          SUM(CASE WHEN l.tipo='despesa' AND c_orig.tipo IN ('corrente','carteira','caixa','outro')
                    AND ${SQL_PAGAMENTO_FATURA}
                   THEN l.valor_total ELSE 0 END),
          0
        ) AS pagamento_fatura,
        COALESCE(
          SUM(CASE WHEN l.tipo='transferencia' AND c_orig.tipo IN ('corrente','carteira','caixa','outro')
                   THEN l.valor_total ELSE 0 END),
          0
        ) AS transferencia_saida,
        COALESCE(
          SUM(CASE WHEN l.tipo='transferencia' AND c_dest.tipo IN ('corrente','carteira','caixa','outro')
                   THEN l.valor_total ELSE 0 END),
          0
        ) AS transferencia_entrada,
        COALESCE(
          SUM(CASE WHEN l.tipo='despesa' AND c_orig.tipo='cartao_credito'
                   THEN l.valor_total ELSE 0 END),
          0
        ) AS compras_cartao
      FROM lancamentos l
      INNER JOIN contas c_orig ON c_orig.id = l.conta_id
      LEFT JOIN contas c_dest ON c_dest.id = l.conta_destino_id
      LEFT JOIN categorias c ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
        AND ${sqlLancamentoNaoEhPrevistoSinteticoGastoFixo("l")}
        AND ${sqlLancamentoEntraFechamentoSemanal("l")}
      GROUP BY DATE_FORMAT(l.competencia_data, '%Y-%m-%d')
      ORDER BY data ASC
    `,
    [input.gestaoId, input.inicio, input.fim],
  );

  return rows.map((row) => ({
    data: row.data,
    entradas: Number(row.entradas ?? 0),
    saidasCorrente: Number(row.saidas_corrente ?? 0),
    pagamentoFatura: Number(row.pagamento_fatura ?? 0),
    transferenciaSaida: Number(row.transferencia_saida ?? 0),
    transferenciaEntrada: Number(row.transferencia_entrada ?? 0),
    comprasCartao: Number(row.compras_cartao ?? 0),
  }));
}

export async function findFechamentoPeriodo(input: {
  gestaoId: number;
  tipo: "semanal" | "mensal";
  inicio: string;
}) {
  const [rows] = await pool.query<FechamentoPeriodoRow[]>(
    `
      SELECT
        f.id, f.gestao_id, f.tipo,
        DATE_FORMAT(f.periodo_inicio, '%Y-%m-%d') AS periodo_inicio,
        DATE_FORMAT(f.periodo_fim, '%Y-%m-%d') AS periodo_fim,
        f.fechado_em, f.fechado_por_usuario_id,
        f.entradas, f.saidas_corrente, f.compras_cartao,
        f.sobra, f.reservado, f.reservas_por_conta, f.pagamento_fatura,
        f.ajuste_dia_a_dia_tipo, f.ajuste_dia_a_dia_valor,
        f.apenas_snapshot,
        f.lancamento_reserva_id, f.observacoes,
        u.nome AS fechado_por_nome
      FROM fechamentos_periodo f
      LEFT JOIN usuarios u ON u.id = f.fechado_por_usuario_id
      WHERE f.gestao_id = ?
        AND f.tipo = ?
        AND f.periodo_inicio = ?
      LIMIT 1
    `,
    [input.gestaoId, input.tipo, input.inicio],
  );

  return rows[0] ?? null;
}

export async function listFechamentosPeriodo(input: {
  gestaoId: number;
  tipo: "semanal" | "mensal";
  limit?: number;
}) {
  const lim = Math.min(Math.max(input.limit ?? 26, 1), 200);

  const [rows] = await pool.query<FechamentoPeriodoRow[]>(
    `
      SELECT
        f.id, f.gestao_id, f.tipo,
        DATE_FORMAT(f.periodo_inicio, '%Y-%m-%d') AS periodo_inicio,
        DATE_FORMAT(f.periodo_fim, '%Y-%m-%d') AS periodo_fim,
        f.fechado_em, f.fechado_por_usuario_id,
        f.entradas, f.saidas_corrente, f.compras_cartao,
        f.sobra, f.reservado, f.reservas_por_conta, f.pagamento_fatura,
        f.ajuste_dia_a_dia_tipo, f.ajuste_dia_a_dia_valor,
        f.apenas_snapshot,
        f.lancamento_reserva_id, f.observacoes,
        u.nome AS fechado_por_nome
      FROM fechamentos_periodo f
      LEFT JOIN usuarios u ON u.id = f.fechado_por_usuario_id
      WHERE f.gestao_id = ?
        AND f.tipo = ?
      ORDER BY f.periodo_inicio DESC
      LIMIT ${lim}
    `,
    [input.gestaoId, input.tipo],
  );

  return rows;
}

function buildMetadadosFechamentoSemanal(input: {
  inicio: string;
  fim: string;
  movimento: "pagamento_fatura" | "reserva";
  contaDestinoId?: number;
}) {
  return JSON.stringify({
    origem: "fechamento_semanal",
    fechamento_inicio: input.inicio,
    fechamento_fim: input.fim,
    movimento: input.movimento,
    ...(input.contaDestinoId ? { conta_destino_id: input.contaDestinoId } : {}),
  });
}

async function findLancamentoFechamentoSemanal(
  connection: PoolConnection,
  input: {
    gestaoId: number;
    inicio: string;
    fim: string;
    movimento: "pagamento_fatura" | "reserva";
    contaDestinoId?: number;
  },
): Promise<number | null> {
  const [rows] = await connection.query<Array<RowDataPacket & { id: number }>>(
    `
      SELECT id
      FROM lancamentos
      WHERE gestao_id = ?
        AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.origem')), '') = 'fechamento_semanal'
        AND JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.fechamento_inicio')) = ?
        AND JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.fechamento_fim')) = ?
        AND JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.movimento')) = ?
        AND (
          ? IS NULL
          OR CAST(JSON_UNQUOTE(JSON_EXTRACT(metadados, '$.conta_destino_id')) AS UNSIGNED) = ?
        )
      LIMIT 1
    `,
    [
      input.gestaoId,
      input.inicio,
      input.fim,
      input.movimento,
      input.contaDestinoId ?? null,
      input.contaDestinoId ?? null,
    ],
  );

  return rows[0]?.id ? Number(rows[0].id) : null;
}

async function resolveCategoriaSaidaContaId(
  connection: PoolConnection,
  gestaoId: number,
): Promise<number | null> {
  const [rows] = await connection.query<Array<RowDataPacket & { id: number }>>(
    `
      SELECT id
      FROM categorias
      WHERE gestao_id = ?
        AND nome = 'Saida da conta'
      LIMIT 1
    `,
    [gestaoId],
  );
  return rows[0]?.id ? Number(rows[0].id) : null;
}

async function resolveFaturaCompetenciaPagamentoFechamento(
  connection: PoolConnection,
  gestaoId: number,
  referenceDate: string,
): Promise<string | null> {
  const [contaRows] = await connection.query<
    Array<RowDataPacket & { fechamento_dia: number | null }>
  >(
    `
      SELECT fechamento_dia
      FROM contas
      WHERE gestao_id = ?
        AND tipo = 'cartao_credito'
        AND ativa = 1
      ORDER BY id ASC
      LIMIT 1
    `,
    [gestaoId],
  );
  const fechamentoDia = Number(contaRows[0]?.fechamento_dia ?? 30);
  return resolveFaturaCompetenciaAberta(referenceDate, fechamentoDia);
}

/** Persiste o fechamento da semana e registra pagamento de fatura + reservas no extrato. */
export async function createFechamentoSemanal(input: {
  gestaoId: number;
  userId: number;
  inicio: string;
  fim: string;
  entradas: number;
  saidasCorrente: number;
  comprasCartao: number;
  /** Valor que você associa ao "guardei na reserva neste fechamento" (sempre vai no snapshot). */
  reservadoNoFechamento: number;
  /** Quanto saiu da corrente para pagar a fatura neste fechamento. */
  pagamentoFatura: number;
  /** Conta corrente de origem do pagamento e das reservas. */
  contaCorrenteId: number;
  /** Aporte/resgate usado para zerar a semana no Porquinho Dia a Dia (snapshot). */
  ajusteDiaADiaTipo?: "nenhum" | "aporte" | "resgate";
  ajusteDiaADiaValor?: number;
  /**
   * Marca que você já tinha executado no banco antes de fechar no LT.
   * Os lançamentos são criados mesmo assim para a Liquidez bater.
   */
  apenasSnapshot: boolean;
  transferenciasReserva: Array<{ valor: number; contaOrigemId: number; contaDestinoId: number }>;
  reservasPorConta: Array<{ contaId: number; nome: string; valor: number }> | null;
  observacoes?: string | null;
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const reservado = Math.max(0, Number(input.reservadoNoFechamento) || 0);
    const pagamentoFaturaValor = Math.max(0, Number(input.pagamentoFatura) || 0);

    const transferenciasValidas = (input.transferenciasReserva ?? []).filter(
      (tr) =>
        tr &&
        tr.valor > 0 &&
        tr.contaOrigemId > 0 &&
        tr.contaDestinoId > 0 &&
        tr.contaOrigemId !== tr.contaDestinoId,
    );

    const lancamentoIds: number[] = [];

    if (pagamentoFaturaValor > 0.004 && input.contaCorrenteId > 0) {
      const existenteFatura = await findLancamentoFechamentoSemanal(connection, {
        gestaoId: input.gestaoId,
        inicio: input.inicio,
        fim: input.fim,
        movimento: "pagamento_fatura",
      });

      if (!existenteFatura) {
        const categoriaId = await resolveCategoriaSaidaContaId(connection, input.gestaoId);
        const faturaCompetenciaData = await resolveFaturaCompetenciaPagamentoFechamento(
          connection,
          input.gestaoId,
          input.fim,
        );
        const metadados = buildMetadadosFechamentoSemanal({
          inicio: input.inicio,
          fim: input.fim,
          movimento: "pagamento_fatura",
        });

        const [faturaResult] = await connection.query<ResultSetHeader>(
          `
            INSERT INTO lancamentos (
              gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id,
              tipo, status, meio, descricao, valor_total, competencia_data,
              fatura_competencia_data, liquidado_em, metadados
            )
            VALUES (?, ?, NULL, ?, ?, 'despesa', 'liquidado', 'pix', ?, ?, ?, ?, NOW(), ?)
          `,
          [
            input.gestaoId,
            input.contaCorrenteId,
            categoriaId,
            input.userId,
            `Pagamento efetuado - Fatura Cartão Inter (fechamento ${input.inicio} a ${input.fim})`,
            pagamentoFaturaValor,
            input.fim,
            faturaCompetenciaData,
            metadados,
          ],
        );
        lancamentoIds.push(faturaResult.insertId);
      } else {
        lancamentoIds.push(existenteFatura);
      }
    }

    let lancamentoReservaId: number | null = null;

    for (const tr of transferenciasValidas) {
      const existenteReserva = await findLancamentoFechamentoSemanal(connection, {
        gestaoId: input.gestaoId,
        inicio: input.inicio,
        fim: input.fim,
        movimento: "reserva",
        contaDestinoId: tr.contaDestinoId,
      });

      if (existenteReserva) {
        lancamentoIds.push(existenteReserva);
        lancamentoReservaId ??= existenteReserva;
        continue;
      }

      const reservaNome =
        input.reservasPorConta?.find((r) => r.contaId === tr.contaDestinoId)?.nome ?? "reserva";

      const metadados = buildMetadadosFechamentoSemanal({
        inicio: input.inicio,
        fim: input.fim,
        movimento: "reserva",
        contaDestinoId: tr.contaDestinoId,
      });

      const [transferenciaResult] = await connection.query<ResultSetHeader>(
        `
          INSERT INTO lancamentos (
            gestao_id, conta_id, conta_destino_id, categoria_id, criado_por_usuario_id,
            tipo, status, meio, descricao, valor_total, competencia_data, liquidado_em, metadados
          )
          VALUES (?, ?, ?, NULL, ?, 'transferencia', 'liquidado', 'transferencia', ?, ?, ?, NOW(), ?)
        `,
        [
          input.gestaoId,
          tr.contaOrigemId,
          tr.contaDestinoId,
          input.userId,
          `Aplicação - ${reservaNome} (fechamento ${input.inicio} a ${input.fim})`,
          tr.valor,
          input.fim,
          metadados,
        ],
      );

      lancamentoIds.push(transferenciaResult.insertId);
      lancamentoReservaId ??= transferenciaResult.insertId;
    }

    const sobra = input.entradas - input.saidasCorrente;
    const pagamentoFatura = Math.max(0, Number(input.pagamentoFatura) || 0);
    const ajusteDiaADiaTipo = input.ajusteDiaADiaTipo ?? "nenhum";
    const ajusteDiaADiaValor = Math.max(0, Number(input.ajusteDiaADiaValor) || 0);
    const apenasSnapshot = input.apenasSnapshot ? 1 : 0;

    const reservasPorContaJson =
      input.reservasPorConta && input.reservasPorConta.length > 0
        ? JSON.stringify(input.reservasPorConta)
        : null;

    await connection.query<ResultSetHeader>(
      `
        INSERT INTO fechamentos_periodo (
          gestao_id, tipo, periodo_inicio, periodo_fim,
          fechado_em, fechado_por_usuario_id,
          entradas, saidas_corrente, compras_cartao,
          sobra, reservado, reservas_por_conta, pagamento_fatura,
          ajuste_dia_a_dia_tipo, ajuste_dia_a_dia_valor,
          apenas_snapshot,
          lancamento_reserva_id, observacoes
        )
        VALUES (
          ?, 'semanal', ?, ?,
          NOW(), ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?,
          ?,
          ?, ?
        )
        ON DUPLICATE KEY UPDATE
          fechado_em = NOW(),
          fechado_por_usuario_id = VALUES(fechado_por_usuario_id),
          entradas = VALUES(entradas),
          saidas_corrente = VALUES(saidas_corrente),
          compras_cartao = VALUES(compras_cartao),
          sobra = VALUES(sobra),
          reservado = VALUES(reservado),
          reservas_por_conta = VALUES(reservas_por_conta),
          pagamento_fatura = VALUES(pagamento_fatura),
          ajuste_dia_a_dia_tipo = VALUES(ajuste_dia_a_dia_tipo),
          ajuste_dia_a_dia_valor = VALUES(ajuste_dia_a_dia_valor),
          apenas_snapshot = VALUES(apenas_snapshot),
          lancamento_reserva_id = COALESCE(VALUES(lancamento_reserva_id), lancamento_reserva_id),
          observacoes = VALUES(observacoes)
      `,
      [
        input.gestaoId,
        input.inicio,
        input.fim,
        input.userId,
        input.entradas,
        input.saidasCorrente,
        input.comprasCartao,
        sobra,
        reservado,
        reservasPorContaJson,
        pagamentoFatura,
        ajusteDiaADiaTipo,
        ajusteDiaADiaValor,
        apenasSnapshot,
        lancamentoReservaId,
        input.observacoes ?? null,
      ],
    );

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "create",
      module: "fechamentos",
      entity: "fechamento_semanal",
      details: {
        inicio: input.inicio,
        fim: input.fim,
        sobra,
        reservado,
        pagamentoFatura,
        ajusteDiaADiaTipo,
        ajusteDiaADiaValor,
        apenasSnapshot: input.apenasSnapshot,
        lancamentoIds,
      },
    });

    return { ok: true, lancamentoReservaId, lancamentoIds };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** Total de aportes e resgates nas poupancas no periodo. */
export async function getReservasResumoPeriodo(input: {
  gestaoId: number;
  inicio: string;
  fim: string;
}) {
  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        aportado: string | null;
        resgatado: string | null;
        rendimentos: string | null;
      }
    >
  >(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo='transferencia' AND ctd.tipo IN ('poupanca','investimento')
              THEN l.valor_total ELSE 0 END
          ),
          0
        ) AS aportado,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo='transferencia' AND cto.tipo IN ('poupanca','investimento')
                AND ctd.tipo IN ('corrente','carteira','caixa','outro')
              THEN l.valor_total ELSE 0 END
          ),
          0
        ) AS resgatado,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo='receita' AND cto.tipo IN ('poupanca','investimento')
              THEN l.valor_total ELSE 0 END
          ),
          0
        ) AS rendimentos
      FROM lancamentos l
      INNER JOIN contas cto ON cto.id = l.conta_id
      LEFT JOIN contas ctd ON ctd.id = l.conta_destino_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
    `,
    [input.gestaoId, input.inicio, input.fim],
  );

  const row = rows[0];

  return {
    aportado: Number(row?.aportado ?? 0),
    resgatado: Number(row?.resgatado ?? 0),
    rendimentos: Number(row?.rendimentos ?? 0),
  };
}

export async function deleteLancamentos(input: {
  gestaoId: number;
  lancamentoIds: number[];
}) {
  if (input.lancamentoIds.length === 0) {
    return 0;
  }

  const placeholders = input.lancamentoIds.map(() => "?").join(", ");
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        DELETE lr
        FROM lancamento_rateios lr
        INNER JOIN lancamentos l
          ON l.id = lr.lancamento_id
        WHERE l.gestao_id = ?
          AND l.id IN (${placeholders})
      `,
      [input.gestaoId, ...input.lancamentoIds],
    );

    const [result] = await connection.query<ResultSetHeader>(
      `
        DELETE FROM lancamentos
        WHERE gestao_id = ?
          AND id IN (${placeholders})
      `,
      [input.gestaoId, ...input.lancamentoIds],
    );

    if (result.affectedRows > 0) {
      await syncGestaoInicioEm(connection, input.gestaoId);
    }

    await connection.commit();

    if (result.affectedRows > 0) {
      await registerAudit({
        userId: undefined,
        gestaoId: input.gestaoId,
        action: "delete",
        module: "lancamentos",
        entity: "lancamento",
        details: { lancamentoIds: input.lancamentoIds, affectedRows: result.affectedRows },
      });
    }

    return result.affectedRows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
