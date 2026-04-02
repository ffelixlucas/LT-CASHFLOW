import "server-only";

import type { LancamentoMeio } from "@ltcashflow/validation";
import { pool } from "@ltcashflow/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

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
};

export type ContaRow = RowDataPacket & {
  id: number;
  nome: string;
  tipo: string;
  instituicao: string | null;
};

export type CategoriaRow = RowDataPacket & {
  id: number;
  nome: string;
  natureza: "receita" | "despesa" | "ambos";
};

export type LancamentoRow = RowDataPacket & {
  id: number;
  conta_id: number;
  categoria_id: number;
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
  conta_tipo: string;
};

export type SearchLancamentosInput = {
  gestaoId: number;
  text?: string;
  tipo?: "receita" | "despesa" | "ajuste";
  meio?: "pix" | "debito" | "credito" | "dinheiro" | "boleto" | "ted_doc" | "transferencia" | "outro";
  contaId?: number;
  categoriaId?: number;
  minValor?: number;
  maxValor?: number;
  dateFrom?: string;
  dateTo?: string;
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

type SqlFilters = {
  conditions: string[];
  params: Array<string | number>;
};

const ORDER_BY_LANCAMENTO_RECIENTE_DESC =
  "l.competencia_data DESC, COALESCE(l.competencia_hora, TIME(l.criado_em)) DESC, l.criado_em DESC";
const ORDER_BY_LANCAMENTO_RECIENTE_ASC =
  "l.competencia_data ASC, COALESCE(l.competencia_hora, TIME(l.criado_em)) ASC, l.criado_em ASC";

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
      SELECT g.id, g.nome, g.descricao, g.tipo
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

export async function createGestaoWithDefaults(input: {
  userId: number;
  nome: string;
  descricao?: string;
  tipo: "pessoal" | "familiar" | "profissional" | "projeto";
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
      SELECT id, nome, tipo, instituicao
      FROM contas
      WHERE gestao_id = ?
        AND ativa = 1
      ORDER BY criado_em ASC
    `,
    [gestaoId],
  );

  return rows;
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

  return result.insertId;
}

export async function createLancamento(input: {
  gestaoId: number;
  contaId: number;
  categoriaId: number;
  userId: number;
  tipo: "receita" | "despesa" | "ajuste";
  status: "previsto" | "pendente" | "liquidado";
  meio?: LancamentoMeio;
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
        input.categoriaId,
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

    await connection.commit();

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
          COALESCE(
            SUM(
              CASE
                WHEN l.tipo = 'receita' AND l.status <> 'cancelado' THEN l.valor_total
                ELSE 0
              END
            ),
            0
          ) AS entradas_em_conta,
          COALESCE(
            SUM(
              CASE
                WHEN l.tipo = 'despesa'
                  AND l.status <> 'cancelado'
                  AND COALESCE(c.nome, '') <> 'Saida da conta'
                THEN l.valor_total
                ELSE 0
              END
            ),
            0
          ) AS despesas,
          COALESCE(
            SUM(
              CASE
                WHEN l.tipo = 'despesa'
                  AND l.status <> 'cancelado'
                  AND c.nome = 'Saida da conta'
                THEN l.valor_total
                ELSE 0
              END
            ),
            0
          ) AS saidas_da_conta
        FROM contas ct
        LEFT JOIN lancamentos l
          ON l.conta_id = ct.id
        LEFT JOIN categorias c
          ON c.id = l.categoria_id
        WHERE ct.gestao_id = ?
          AND ct.ativa = 1
          AND ct.tipo <> 'cartao_credito'
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

export async function getAvailableBalance(gestaoId: number) {
  const [rows] = await pool.query<AvailableBalanceRow[]>(
    `
      SELECT
        COALESCE(SUM(saldos.saldo_conta), 0) AS saldo_disponivel
      FROM (
        SELECT
          ct.id,
          COALESCE(ct.saldo_inicial, 0) +
            COALESCE(
              SUM(
                CASE
                  WHEN l.tipo = 'receita' AND l.status <> 'cancelado' THEN l.valor_total
                  WHEN l.tipo = 'despesa' AND l.status <> 'cancelado' THEN -l.valor_total
                  ELSE 0
                END
              ),
              0
            ) AS saldo_conta
        FROM contas ct
        LEFT JOIN lancamentos l
          ON l.conta_id = ct.id
        WHERE ct.gestao_id = ?
          AND ct.ativa = 1
          AND ct.tipo <> 'cartao_credito'
        GROUP BY ct.id, ct.saldo_inicial
      ) AS saldos
    `,
    [gestaoId],
  );

  return rows[0]?.saldo_disponivel ?? "0";
}

export async function listCashAccountBreakdown(gestaoId: number) {
  const [rows] = await pool.query<CashAccountBreakdownRow[]>(
    `
      SELECT
        ct.id,
        ct.nome,
        ct.tipo,
        COALESCE(ct.saldo_inicial, 0) AS saldo_inicial,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'receita' AND l.status <> 'cancelado' THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS entradas_em_conta,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'despesa'
                AND l.status <> 'cancelado'
                AND COALESCE(c.nome, '') <> 'Saida da conta'
              THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS despesas,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'despesa'
                AND l.status <> 'cancelado'
                AND c.nome = 'Saida da conta'
              THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS saidas_da_conta,
        COALESCE(ct.saldo_inicial, 0) +
          COALESCE(
            SUM(
              CASE
                WHEN l.tipo = 'receita' AND l.status <> 'cancelado' THEN l.valor_total
                WHEN l.tipo = 'despesa' AND l.status <> 'cancelado' THEN -l.valor_total
                ELSE 0
              END
            ),
            0
          ) AS saldo_atual,
        COUNT(
          CASE
            WHEN l.status <> 'cancelado' THEN 1
            ELSE NULL
          END
        ) AS quantidade_movimentos
      FROM contas ct
      LEFT JOIN lancamentos l
        ON l.conta_id = ct.id
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

export async function listRecentLancamentos(gestaoId: number) {
  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
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
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
    `,
    [gestaoId],
  );

  return rows;
}

export async function updateLancamento(input: {
  gestaoId: number;
  lancamentoId: number;
  contaId: number;
  categoriaId: number;
  tipo: "receita" | "despesa" | "ajuste";
  status: "previsto" | "pendente" | "liquidado";
  meio?: LancamentoMeio;
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
        UPDATE lancamentos
        SET
          conta_id = ?,
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
        input.categoriaId,
        input.tipo,
        input.status,
        input.meio ?? null,
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

    await connection.query(
      `
        UPDATE lancamento_rateios
        SET valor = ROUND((? * percentual) / 100, 2)
        WHERE lancamento_id = ?
      `,
      [input.valorTotal, input.lancamentoId],
    );

    await connection.commit();

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

  if (filters.text) {
    conditions.push("(l.descricao LIKE ? OR c.nome LIKE ? OR ct.nome LIKE ?)");
    params.push(`%${filters.text}%`, `%${filters.text}%`, `%${filters.text}%`);
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
    conditions.push("l.conta_id = ?");
    params.push(filters.contaId);
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
    conditions.push("l.competencia_data >= ?");
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push("l.competencia_data <= ?");
    params.push(filters.dateTo);
  }

  return { conditions, params };
}

export async function searchLancamentos(filters: SearchLancamentosInput) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
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
}) {
  const filters: SearchLancamentosInput = {
    gestaoId: input.gestaoId,
    contaId: input.contaId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
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
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_ASC}
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
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
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
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
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

    await connection.commit();

    return result.affectedRows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
