import { beforeEach, describe, expect, it, vi } from "vitest";

import { GestaoAccessDeniedError } from "@/lib/server/gestao-access";
import { POST as previewPost } from "@/app/api/reconciliacao/preview/route";
import { POST as importPost } from "@/app/api/reconciliacao/import/route";
import {
  createGestaoDbMockHandler,
  defaultMockDbState,
} from "@/test/helpers/mock-gestao-db";
import { expectStatus, mockSession, postJson } from "@/test/helpers/http-route-test";
import {
  extratoTextoMinimo,
  validReconciliacaoImportItem,
} from "@/test/helpers/route-payloads";
import {
  CONTA_A,
  CONTA_B,
  TENANT_A,
  USER_EDITOR,
  USER_OUTSIDER,
  USER_VIEWER,
} from "@/test/helpers/tenant-fixtures";

const apiMocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  auth: vi.fn(),
}));

const securityLogMocks = vi.hoisted(() => ({
  logGestaoAccessDeniedFromError: vi.fn(),
}));

vi.mock("@ltcashflow/db", () => ({
  pool: {
    query: (...args: unknown[]) => apiMocks.poolQuery(...args),
  },
}));

vi.mock("@/lib/server/auth", () => ({
  auth: () => apiMocks.auth(),
}));

vi.mock("@/lib/server/security-log", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/server/security-log")>();
  return {
    ...mod,
    logGestaoAccessDeniedFromError: (...args: unknown[]) =>
      securityLogMocks.logGestaoAccessDeniedFromError(...args),
  };
});

const listContas = vi.fn();

vi.mock("@/lib/server/repository", () => ({
  listContas: (...args: unknown[]) => listContas(...args),
  listCategorias: vi.fn(),
  listLancamentosForContaRange: vi.fn(),
  createLancamento: vi.fn(),
  createTransferencia: vi.fn(),
}));

describe("POST /api/reconciliacao/preview", () => {
  beforeEach(() => {
    apiMocks.poolQuery.mockReset();
    apiMocks.poolQuery.mockImplementation(createGestaoDbMockHandler(defaultMockDbState));
    securityLogMocks.logGestaoAccessDeniedFromError.mockReset();
  });

  it("retorna 401 sem sessao", async () => {
    mockSession(apiMocks.auth, null);

    const response = await previewPost(
      postJson({
        gestaoId: TENANT_A,
        contaId: 11,
        text: extratoTextoMinimo,
      }),
    );

    await expectStatus(response, 401);
  });

  it("retorna 400 quando faltam campos obrigatorios", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await previewPost(
      postJson({
        gestaoId: TENANT_A,
        contaId: 11,
      }),
    );

    const body = await expectStatus(response, 400);
    expect(body.data.error).toMatch(/obrigatorios/i);
  });

  it("retorna 403 quando usuario nao pertence a gestao", async () => {
    mockSession(apiMocks.auth, USER_OUTSIDER);

    const response = await previewPost(
      postJson({
        gestaoId: TENANT_A,
        contaId: 11,
        text: extratoTextoMinimo,
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/gestao/i);
    expect(securityLogMocks.logGestaoAccessDeniedFromError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "read_denied" }),
      expect.objectContaining({
        userId: USER_OUTSIDER,
        gestaoId: TENANT_A,
        route: "/api/reconciliacao/preview",
      }),
    );
  });

  it("retorna 403 quando contaId pertence a outra gestao", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await previewPost(
      postJson({
        gestaoId: TENANT_A,
        contaId: CONTA_B,
        text: extratoTextoMinimo,
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/conta/i);
    expect(securityLogMocks.logGestaoAccessDeniedFromError).toHaveBeenCalledWith(
      expect.any(GestaoAccessDeniedError),
      expect.objectContaining({
        userId: USER_EDITOR,
        gestaoId: TENANT_A,
        route: "/api/reconciliacao/preview",
      }),
    );
  });
});

describe("POST /api/reconciliacao/import", () => {
  beforeEach(() => {
    apiMocks.poolQuery.mockReset();
    apiMocks.poolQuery.mockImplementation(createGestaoDbMockHandler(defaultMockDbState));
    securityLogMocks.logGestaoAccessDeniedFromError.mockReset();
    listContas.mockReset();
    listContas.mockResolvedValue([
      { id: CONTA_A, tipo: "corrente", nome: "Conta corrente teste" },
    ]);
  });

  it("retorna 401 sem sessao", async () => {
    mockSession(apiMocks.auth, null);

    const response = await importPost(
      postJson({
        gestaoId: TENANT_A,
        items: [validReconciliacaoImportItem],
      }),
    );

    await expectStatus(response, 401);
  });

  it("retorna 400 quando faltam itens", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await importPost(
      postJson({
        gestaoId: TENANT_A,
        items: [],
      }),
    );

    const body = await expectStatus(response, 400);
    expect(body.data.error).toMatch(/obrigatorios/i);
  });

  it("retorna 403 quando visualizador tenta importar", async () => {
    mockSession(apiMocks.auth, USER_VIEWER);

    const response = await importPost(
      postJson({
        gestaoId: TENANT_A,
        items: [validReconciliacaoImportItem],
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/permissao/i);
    expect(securityLogMocks.logGestaoAccessDeniedFromError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "mutate_denied" }),
      expect.objectContaining({
        userId: USER_VIEWER,
        gestaoId: TENANT_A,
        route: "/api/reconciliacao/import",
      }),
    );
  });

  it("retorna 403 quando categoriaId pertence a outra gestao", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await importPost(
      postJson({
        gestaoId: TENANT_A,
        items: [
          {
            ...validReconciliacaoImportItem,
            categoriaId: 41,
          },
        ],
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/categoria/i);
    expect(securityLogMocks.logGestaoAccessDeniedFromError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "categoria_not_in_gestao" }),
      expect.objectContaining({
        userId: USER_EDITOR,
        gestaoId: TENANT_A,
        route: "/api/reconciliacao/import",
      }),
    );
  });
});
