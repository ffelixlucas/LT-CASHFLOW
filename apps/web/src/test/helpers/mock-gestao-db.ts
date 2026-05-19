import type { GestaoMemberRole } from "@/lib/server/gestao-access";

import {
  CATEGORIA_A,
  CATEGORIA_B,
  CONTA_A,
  CONTA_B,
  LANCAMENTO_A,
  LANCAMENTO_B,
  TENANT_A,
  TENANT_B,
  USER_EDITOR,
  USER_MEMBER,
  USER_VIEWER,
} from "./tenant-fixtures";

export type MockDbState = {
  members: Array<{ userId: number; gestaoId: number; papel: GestaoMemberRole }>;
  contas: Record<number, number[]>;
  categorias: Record<number, number[]>;
  lancamentos: Record<number, number[]>;
};

export const defaultMockDbState: MockDbState = {
  members: [
    { userId: USER_MEMBER, gestaoId: TENANT_A, papel: "proprietario" },
    { userId: USER_VIEWER, gestaoId: TENANT_A, papel: "visualizador" },
    { userId: USER_EDITOR, gestaoId: TENANT_A, papel: "editor" },
  ],
  contas: {
    [TENANT_A]: [CONTA_A, 12],
    [TENANT_B]: [CONTA_B],
  },
  categorias: {
    [TENANT_A]: [CATEGORIA_A, 32],
    [TENANT_B]: [CATEGORIA_B],
  },
  lancamentos: {
    [TENANT_A]: [LANCAMENTO_A, 52, 53],
    [TENANT_B]: [LANCAMENTO_B],
  },
};

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

export function createGestaoDbMockHandler(state: MockDbState) {
  return async (sql: string, params: unknown[] = []) => {
    const q = normalizeSql(sql);

    if (q.includes("from gestao_membros") && q.includes("select 1")) {
      const [userId, gestaoId] = params as [number, number];
      const found = state.members.some(
        (m) => m.userId === userId && m.gestaoId === gestaoId,
      );
      return [found ? [{ ok: 1 }] : [], []];
    }

    if (q.includes("from gestao_membros") && q.includes("select papel")) {
      const [userId, gestaoId] = params as [number, number];
      const member = state.members.find(
        (m) => m.userId === userId && m.gestaoId === gestaoId,
      );
      return [member ? [{ papel: member.papel }] : [], []];
    }

    if (q.includes("from contas") && q.includes("select 1")) {
      const [contaId, gestaoId] = params as [number, number];
      const ids = state.contas[gestaoId] ?? [];
      return [ids.includes(contaId) ? [{ ok: 1 }] : [], []];
    }

    if (q.includes("from contas") && q.includes("select id")) {
      const gestaoId = params[0] as number;
      const contaIds = params.slice(1) as number[];
      const valid = new Set(state.contas[gestaoId] ?? []);
      const rows = contaIds.filter((id) => valid.has(id)).map((id) => ({ id }));
      return [rows, []];
    }

    if (q.includes("from categorias")) {
      const [categoriaId, gestaoId] = params as [number, number];
      const ids = state.categorias[gestaoId] ?? [];
      return [ids.includes(categoriaId) ? [{ ok: 1 }] : [], []];
    }

    if (q.includes("from lancamentos") && q.includes("select 1")) {
      const [lancamentoId, gestaoId] = params as [number, number];
      const ids = state.lancamentos[gestaoId] ?? [];
      return [ids.includes(lancamentoId) ? [{ ok: 1 }] : [], []];
    }

    if (q.includes("from lancamentos") && q.includes("select id")) {
      const gestaoId = params[0] as number;
      const lancamentoIds = params.slice(1) as number[];
      const valid = new Set(state.lancamentos[gestaoId] ?? []);
      const rows = lancamentoIds.filter((id) => valid.has(id)).map((id) => ({ id }));
      return [rows, []];
    }

    throw new Error(`SQL inesperado no mock de teste: ${q}`);
  };
}
