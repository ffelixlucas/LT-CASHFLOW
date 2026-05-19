import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createGestaoDbMockHandler,
  defaultMockDbState,
} from "@/test/helpers/mock-gestao-db";
import {
  TENANT_A,
  USER_EDITOR,
  USER_MEMBER,
  USER_OUTSIDER,
  USER_VIEWER,
} from "@/test/helpers/tenant-fixtures";

const mockQuery = vi.fn();

vi.mock("@ltcashflow/db", () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

import {
  assertCanMutateGestao,
  assertCanReadGestao,
  assertCategoriaInGestao,
  assertContaInGestao,
  assertFinancialRefsInGestao,
  assertLancamentoIdsInGestao,
  assertLancamentoInGestao,
  canMutateGestao,
  GestaoAccessDeniedError,
} from "./gestao-access";

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockImplementation(createGestaoDbMockHandler(defaultMockDbState));
});

describe("canMutateGestao", () => {
  it("permite proprietario, administrador e editor", () => {
    expect(canMutateGestao("proprietario")).toBe(true);
    expect(canMutateGestao("administrador")).toBe(true);
    expect(canMutateGestao("editor")).toBe(true);
  });

  it("bloqueia visualizador e ausencia de papel", () => {
    expect(canMutateGestao("visualizador")).toBe(false);
    expect(canMutateGestao(null)).toBe(false);
  });
});

describe("assertCanReadGestao", () => {
  it("permite membro ativo da gestao", async () => {
    await expect(assertCanReadGestao(USER_MEMBER, TENANT_A)).resolves.toBeUndefined();
  });

  it("bloqueia usuario fora da gestao", async () => {
    await expect(assertCanReadGestao(USER_OUTSIDER, TENANT_A)).rejects.toMatchObject({
      reason: "read_denied",
    });
  });
});

describe("assertCanMutateGestao", () => {
  it("permite editor", async () => {
    await expect(assertCanMutateGestao(USER_EDITOR, TENANT_A)).resolves.toBeUndefined();
  });

  it("bloqueia visualizador", async () => {
    await expect(assertCanMutateGestao(USER_VIEWER, TENANT_A)).rejects.toMatchObject({
      reason: "mutate_denied",
    });
  });

  it("bloqueia usuario fora da gestao", async () => {
    await expect(assertCanMutateGestao(USER_OUTSIDER, TENANT_A)).rejects.toMatchObject({
      reason: "mutate_denied",
    });
  });
});

describe("assertContaInGestao", () => {
  it("aceita conta da mesma gestao", async () => {
    await expect(assertContaInGestao(11, TENANT_A)).resolves.toBeUndefined();
  });

  it("bloqueia conta de outra gestao", async () => {
    await expect(assertContaInGestao(21, TENANT_A)).rejects.toMatchObject({
      reason: "conta_not_in_gestao",
    });
  });
});

describe("assertCategoriaInGestao", () => {
  it("aceita categoria da mesma gestao", async () => {
    await expect(assertCategoriaInGestao(31, TENANT_A)).resolves.toBeUndefined();
  });

  it("bloqueia categoria de outra gestao", async () => {
    await expect(assertCategoriaInGestao(41, TENANT_A)).rejects.toMatchObject({
      reason: "categoria_not_in_gestao",
    });
  });
});

describe("assertLancamentoInGestao", () => {
  it("aceita lancamento da mesma gestao", async () => {
    await expect(assertLancamentoInGestao(51, TENANT_A)).resolves.toBeUndefined();
  });

  it("bloqueia lancamento de outra gestao", async () => {
    await expect(assertLancamentoInGestao(61, TENANT_A)).rejects.toMatchObject({
      reason: "lancamento_not_in_gestao",
    });
  });
});

describe("assertLancamentoIdsInGestao", () => {
  it("aceita lote inteiro da gestao", async () => {
    await expect(assertLancamentoIdsInGestao([51, 52], TENANT_A)).resolves.toBeUndefined();
  });

  it("bloqueia lote com qualquer id externo", async () => {
    await expect(assertLancamentoIdsInGestao([51, 61], TENANT_A)).rejects.toMatchObject({
      reason: "lancamento_not_in_gestao",
    });
  });

  it("ignora lista vazia", async () => {
    await expect(assertLancamentoIdsInGestao([], TENANT_A)).resolves.toBeUndefined();
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("assertFinancialRefsInGestao", () => {
  it("valida conta, categoria e conta destino na mesma gestao", async () => {
    await expect(
      assertFinancialRefsInGestao({
        gestaoId: TENANT_A,
        contaId: 11,
        categoriaId: 31,
        contaDestinoId: 12,
      }),
    ).resolves.toBeUndefined();
  });

  it("falha se categoria pertence a outra gestao", async () => {
    await expect(
      assertFinancialRefsInGestao({
        gestaoId: TENANT_A,
        contaId: 11,
        categoriaId: 41,
      }),
    ).rejects.toMatchObject({
      reason: "categoria_not_in_gestao",
    });
  });

  it("falha se conta destino pertence a outra gestao", async () => {
    await expect(
      assertFinancialRefsInGestao({
        gestaoId: TENANT_A,
        contaId: 11,
        contaDestinoId: 21,
      }),
    ).rejects.toMatchObject({
      reason: "conta_not_in_gestao",
    });
  });
});

describe("GestaoAccessDeniedError", () => {
  it("expoe reason tipado", () => {
    const error = new GestaoAccessDeniedError("read_denied");
    expect(error).toBeInstanceOf(Error);
    expect(error.reason).toBe("read_denied");
    expect(error.name).toBe("GestaoAccessDeniedError");
  });
});
