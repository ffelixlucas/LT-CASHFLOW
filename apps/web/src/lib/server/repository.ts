import "server-only";

import type { LancamentoMeio } from "@ltcashflow/validation";
import { pool } from "@ltcashflow/db";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

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

export type GestaoMemberRole = "proprietario" | "administrador" | "editor" | "visualizador";

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
  meio?: "pix" | "debito" | "credito" | "dinheiro" | "ted_doc" | "transferencia" | "outro";
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
  guardado: string | null;
  debito: string | null;
  pix: string | null;
  credito: string | null;
  saldo: string | null;
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
const ORDER_BY_LANCAMENTO_FATURA_ASC =
  "COALESCE(l.fatura_competencia_data, l.competencia_data) ASC, l.competencia_data ASC, COALESCE(l.competencia_hora, TIME(l.criado_em)) ASC, l.criado_em ASC";

/** Inclui lançamentos em que a conta aparece como origem ou destino (transferências). */
const JOIN_LANCAMENTOS_NA_CONTA =
  "LEFT JOIN lancamentos l ON (l.conta_id = ct.id OR l.conta_destino_id = ct.id)";

/** Variação de saldo por lançamento na conta `ct` após `JOIN_LANCAMENTOS_NA_CONTA`. */
const CASE_DELTA_SALDO_NA_CONTA = `
  CASE
    WHEN l.status = 'cancelado' THEN 0
    WHEN l.tipo = 'receita' THEN l.valor_total
    WHEN l.tipo = 'despesa' THEN -l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_id = ct.id THEN -l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_destino_id = ct.id THEN l.valor_total
    ELSE 0
  END
`;

const CASE_ENTRADA_NA_CONTA = `
  CASE
    WHEN l.status = 'cancelado' THEN 0
    WHEN l.tipo = 'receita' THEN l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_destino_id = ct.id THEN l.valor_total
    ELSE 0
  END
`;

const CASE_DESPESA_SEM_SAIDA_CONTA = `
  CASE
    WHEN l.status = 'cancelado' THEN 0
    WHEN l.tipo = 'despesa' AND COALESCE(c.nome, '') <> 'Saida da conta' THEN l.valor_total
    ELSE 0
  END
`;

const CASE_SAIDA_DA_CONTA_AGREGADA = `
  CASE
    WHEN l.status = 'cancelado' THEN 0
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
      SELECT
        g.id,
        g.nome,
        g.descricao,
        g.tipo,
        NULL AS inicio_em,
        10 AS percentual_reserva,
        gm.papel
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

export async function userHasGestaoAccess(userId: number, gestaoId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM gestao_membros
      WHERE usuario_id = ?
        AND gestao_id = ?
        AND status = 'ativo'
      LIMIT 1
    `,
    [userId, gestaoId],
  );

  return rows.length > 0;
}

export async function getUserGestaoRole(
  userId: number,
  gestaoId: number,
): Promise<GestaoMemberRole | null> {
  const [rows] = await pool.query<Array<RowDataPacket & { papel: GestaoMemberRole }>>(
    `
      SELECT papel
      FROM gestao_membros
      WHERE usuario_id = ?
        AND gestao_id = ?
        AND status = 'ativo'
      LIMIT 1
    `,
    [userId, gestaoId],
  );

  return rows[0]?.papel ?? null;
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
      ["Moradia", "despesa"],
      ["Alimentacao", "despesa"],
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
      ["Moradia", "despesa"],
      ["Alimentacao", "despesa"],
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
        NULL AS saldo_inicial_em,
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

function compareLancamentosDesc(a: LancamentoListItem, b: LancamentoListItem) {
  const dateDiff = b.competencia_data.localeCompare(a.competencia_data);

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
  competenciaHora?: string;
  vencimentoData?: string;
}) {
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
          competencia_hora,
          vencimento_data,
          liquidado_em
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.gestaoId,
        input.contaId,
        input.categoriaId ?? null,
        input.userId,
        input.tipo,
        input.status,
        input.meio ?? null,
        input.descricao,
        input.valorTotal,
        input.competenciaData,
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

export async function createTransferencia(input: {
  gestaoId: number;
  contaOrigemId: number;
  contaDestinoId: number;
  userId: number;
  status: "previsto" | "pendente" | "liquidado";
  descricao: string;
  valorTotal: number;
  competenciaData: string;
  competenciaHora?: string;
  vencimentoData?: string;
}) {
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
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND (l.conta_id IN (${placeholders}) OR l.conta_destino_id IN (${placeholders}))
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
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
}) {
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
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
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
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
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
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND ctd.tipo IN ('poupanca', 'investimento') THEN l.valor_total ELSE 0 END), 0) AS guardado,
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
        ) AS saldo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
        AND ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
    `,
    [input.gestaoId, input.dateFrom, input.dateTo],
  );

  const base = rows[0] ?? {
    entradas: "0",
    saidas: "0",
    pagamentos_fatura: "0",
    guardado: "0",
    debito: "0",
    pix: "0",
    credito: "0",
    saldo: "0",
  };

  return {
    entradas: base.entradas ?? "0",
    saidas: base.saidas ?? "0",
    pagamentos_fatura: base.pagamentos_fatura ?? "0",
    guardado: base.guardado ?? "0",
    debito: base.debito ?? "0",
    pix: base.pix ?? "0",
    credito: base.credito ?? "0",
    saldo: base.saldo ?? "0",
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
  competenciaHora?: string;
  vencimentoData?: string;
}) {
  const connection = await pool.getConnection();

  const isTransferencia = input.tipo === "transferencia";
  const categoriaId = isTransferencia ? null : input.categoriaId ?? null;
  const contaDestinoId = isTransferencia ? input.contaDestinoId ?? null : null;
  const meioFinal = isTransferencia ? ("transferencia" as LancamentoMeio) : (input.meio ?? null);

  try {
    await connection.beginTransaction();

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
}) {
  const filters: SearchLancamentosInput = {
    gestaoId: input.gestaoId,
    contaId: input.contaId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    dateField: input.dateField,
  };
  const { conditions, params } = buildLancamentoFilters(filters);
  const orderBy =
    input.dateField === "fatura" ? ORDER_BY_LANCAMENTO_FATURA_ASC : ORDER_BY_LANCAMENTO_RECIENTE_ASC;

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
        AND competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND competencia_data <= LAST_DAY(CURDATE())
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
        AND competencia_data >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND competencia_data <= LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
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
        AND competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND competencia_data <= CURDATE()
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
        AND l.competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND l.competencia_data <= LAST_DAY(CURDATE())
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

export type RevisarDuplicidadeRow = RowDataPacket & {
  descricao: string;
  valor_total: string;
  vezes: number;
  ids: string;
  primeira: string;
  ultima: string;
};

export async function listRevisarDuplicidadesMes(gestaoId: number) {
  const [rows] = await pool.query<RevisarDuplicidadeRow[]>(
    `
      SELECT
        l.descricao AS descricao,
        FORMAT(l.valor_total, 2, 'de_DE') AS valor_total,
        COUNT(*) AS vezes,
        GROUP_CONCAT(l.id ORDER BY l.competencia_data SEPARATOR ',') AS ids,
        DATE_FORMAT(MIN(l.competencia_data), '%Y-%m-%d') AS primeira,
        DATE_FORMAT(MAX(l.competencia_data), '%Y-%m-%d') AS ultima
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.tipo = 'despesa'
        AND l.competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      GROUP BY l.descricao, l.valor_total
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC, SUM(l.valor_total) DESC
      LIMIT 40
    `,
    [gestaoId],
  );

  return rows;
}

export type RevisarMicrovalorRow = RowDataPacket & {
  id: number;
  descricao: string;
  valor_total: string;
  competencia_data: string;
};

export async function listRevisarMicrovaloresMes(gestaoId: number) {
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
        AND l.competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND l.valor_total > 0
        AND l.valor_total < 5
      ORDER BY l.competencia_data DESC, l.id DESC
      LIMIT 40
    `,
    [gestaoId],
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

export async function findRecentDuplicateLancamentoId(input: {
  gestaoId: number;
  contaId: number;
  valorTotal: number;
  descricao: string;
  competenciaData: string;
  segundos?: number;
}): Promise<number | null> {
  const segundos = input.segundos ?? 120;

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
      segundos,
    ],
  );

  return rows[0]?.id != null ? Number(rows[0].id) : null;
}

const SQL_PAGAMENTO_FATURA = `
  (
    l.descricao LIKE 'Pagamento efetuado - Fatura Cartão Inter%'
    OR l.descricao LIKE 'Pagamento efetuado - Fatura Cartao Inter%'
    OR l.descricao LIKE '%Fatura Cartão%'
    OR l.descricao LIKE '%Fatura Cartao%'
  )
`;

export async function getPagamentosFaturaParaCiclo(input: {
  gestaoId: number;
  faturaCompetenciaData: string;
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
        AND ${SQL_PAGAMENTO_FATURA}
        AND l.competencia_data >= DATE_SUB(?, INTERVAL 7 DAY)
        AND l.competencia_data <= DATE_ADD(?, INTERVAL 14 DAY)
    `,
    [input.gestaoId, input.faturaCompetenciaData, input.faturaCompetenciaData],
  );

  return Number(rows[0]?.total ?? 0);
}

export async function updateLancamentosMeio(input: {
  gestaoId: number;
  lancamentoIds: number[];
  meio: LancamentoMeio;
}) {
  if (input.lancamentoIds.length === 0) {
    return 0;
  }

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
