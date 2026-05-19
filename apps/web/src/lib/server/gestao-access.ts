import "server-only";

import { pool } from "@ltcashflow/db";
import type { RowDataPacket } from "mysql2/promise";

export type GestaoMemberRole = "proprietario" | "administrador" | "editor" | "visualizador";

export type GestaoAccessDeniedReason =
  | "read_denied"
  | "mutate_denied"
  | "conta_not_in_gestao"
  | "categoria_not_in_gestao"
  | "lancamento_not_in_gestao"
  | "gasto_fixo_not_in_gestao"
  | "fatura_not_in_gestao";

export class GestaoAccessDeniedError extends Error {
  readonly reason: GestaoAccessDeniedReason;

  constructor(reason: GestaoAccessDeniedReason, message?: string) {
    super(message ?? reason);
    this.name = "GestaoAccessDeniedError";
    this.reason = reason;
  }
}

export function canMutateGestao(role: GestaoMemberRole | null) {
  return role === "proprietario" || role === "administrador" || role === "editor";
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

export async function assertCanReadGestao(userId: number, gestaoId: number) {
  if (!(await userHasGestaoAccess(userId, gestaoId))) {
    throw new GestaoAccessDeniedError("read_denied");
  }
}

export async function assertCanMutateGestao(userId: number, gestaoId: number) {
  const role = await getUserGestaoRole(userId, gestaoId);
  if (!canMutateGestao(role)) {
    throw new GestaoAccessDeniedError("mutate_denied");
  }
}

export async function assertContaInGestao(contaId: number, gestaoId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM contas
      WHERE id = ?
        AND gestao_id = ?
      LIMIT 1
    `,
    [contaId, gestaoId],
  );

  if (rows.length === 0) {
    throw new GestaoAccessDeniedError("conta_not_in_gestao");
  }
}

export async function assertCategoriaInGestao(categoriaId: number, gestaoId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM categorias
      WHERE id = ?
        AND gestao_id = ?
      LIMIT 1
    `,
    [categoriaId, gestaoId],
  );

  if (rows.length === 0) {
    throw new GestaoAccessDeniedError("categoria_not_in_gestao");
  }
}

export async function assertLancamentoInGestao(lancamentoId: number, gestaoId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM lancamentos
      WHERE id = ?
        AND gestao_id = ?
      LIMIT 1
    `,
    [lancamentoId, gestaoId],
  );

  if (rows.length === 0) {
    throw new GestaoAccessDeniedError("lancamento_not_in_gestao");
  }
}

export async function assertLancamentoIdsInGestao(lancamentoIds: number[], gestaoId: number) {
  const uniqueIds = [...new Set(lancamentoIds.filter((id) => Number.isFinite(id) && id > 0))];

  if (uniqueIds.length === 0) {
    return;
  }

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id
      FROM lancamentos
      WHERE gestao_id = ?
        AND id IN (${placeholders})
    `,
    [gestaoId, ...uniqueIds],
  );

  if (rows.length !== uniqueIds.length) {
    throw new GestaoAccessDeniedError("lancamento_not_in_gestao");
  }
}

export async function assertContaIdsInGestao(contaIds: number[], gestaoId: number) {
  const uniqueIds = [...new Set(contaIds.filter((id) => Number.isFinite(id) && id > 0))];

  if (uniqueIds.length === 0) {
    return;
  }

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id
      FROM contas
      WHERE gestao_id = ?
        AND id IN (${placeholders})
    `,
    [gestaoId, ...uniqueIds],
  );

  if (rows.length !== uniqueIds.length) {
    throw new GestaoAccessDeniedError("conta_not_in_gestao");
  }
}

export async function assertGastoFixoInGestao(gastoFixoId: number, gestaoId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM gastos_fixos
      WHERE id = ?
        AND gestao_id = ?
      LIMIT 1
    `,
    [gastoFixoId, gestaoId],
  );

  if (rows.length === 0) {
    throw new GestaoAccessDeniedError("gasto_fixo_not_in_gestao");
  }
}

export async function assertFaturaInGestao(faturaId: number, gestaoId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM faturas
      WHERE id = ?
        AND gestao_id = ?
      LIMIT 1
    `,
    [faturaId, gestaoId],
  );

  if (rows.length === 0) {
    throw new GestaoAccessDeniedError("fatura_not_in_gestao");
  }
}

export type FinancialRefsInGestaoInput = {
  gestaoId: number;
  contaId?: number | null;
  categoriaId?: number | null;
  contaDestinoId?: number | null;
  lancamentoId?: number | null;
  gastoFixoId?: number | null;
  faturaId?: number | null;
};

export async function assertFinancialRefsInGestao(input: FinancialRefsInGestaoInput) {
  const checks: Promise<void>[] = [];

  if (input.contaId != null) {
    checks.push(assertContaInGestao(input.contaId, input.gestaoId));
  }

  if (input.categoriaId != null) {
    checks.push(assertCategoriaInGestao(input.categoriaId, input.gestaoId));
  }

  if (input.contaDestinoId != null) {
    checks.push(assertContaInGestao(input.contaDestinoId, input.gestaoId));
  }

  if (input.lancamentoId != null) {
    checks.push(assertLancamentoInGestao(input.lancamentoId, input.gestaoId));
  }

  if (input.gastoFixoId != null) {
    checks.push(assertGastoFixoInGestao(input.gastoFixoId, input.gestaoId));
  }

  if (input.faturaId != null) {
    checks.push(assertFaturaInGestao(input.faturaId, input.gestaoId));
  }

  await Promise.all(checks);
}

/** Alias para validação na camada repository (defesa em profundidade). */
export const ensureFinancialRefsInGestao = assertFinancialRefsInGestao;
