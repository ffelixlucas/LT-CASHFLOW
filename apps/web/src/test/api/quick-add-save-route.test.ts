import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as quickAddSavePost } from "@/app/api/ai/quick-add/save/route";
import {
  createGestaoDbMockHandler,
  defaultMockDbState,
} from "@/test/helpers/mock-gestao-db";
import { expectStatus, mockSession, postJson } from "@/test/helpers/http-route-test";
import {
  quickAddSuggestionWithForeignCategoria,
  quickAddSuggestionWithForeignConta,
  validQuickAddSuggestion,
} from "@/test/helpers/route-payloads";
import { TENANT_A, USER_EDITOR, USER_VIEWER } from "@/test/helpers/tenant-fixtures";

const apiMocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  auth: vi.fn(),
}));

vi.mock("@ltcashflow/db", () => ({
  pool: {
    query: (...args: unknown[]) => apiMocks.poolQuery(...args),
  },
}));

vi.mock("@/lib/server/auth", () => ({
  auth: () => apiMocks.auth(),
}));

const createLancamento = vi.fn();
const listContas = vi.fn();
const listCategorias = vi.fn();

vi.mock("@/lib/server/repository", () => ({
  createLancamento: (...args: unknown[]) => createLancamento(...args),
  createTransferencia: vi.fn(),
  countSimilarLancamentosRecent: vi.fn().mockResolvedValue(0),
  findRecentDuplicateLancamentoId: vi.fn().mockResolvedValue(null),
  listContas: (...args: unknown[]) => listContas(...args),
  listCategorias: (...args: unknown[]) => listCategorias(...args),
}));

describe("POST /api/ai/quick-add/save", () => {
  beforeEach(() => {
    apiMocks.poolQuery.mockReset();
    apiMocks.poolQuery.mockImplementation(createGestaoDbMockHandler(defaultMockDbState));
    createLancamento.mockReset();
    listContas.mockReset();
    listCategorias.mockReset();
  });

  it("retorna 401 sem sessao", async () => {
    mockSession(apiMocks.auth, null);

    const response = await quickAddSavePost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: validQuickAddSuggestion,
      }),
    );

    await expectStatus(response, 401);
    expect(createLancamento).not.toHaveBeenCalled();
  });

  it("retorna 400 sem gestaoId", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await quickAddSavePost(
      postJson({
        suggestion: validQuickAddSuggestion,
      }),
    );

    await expectStatus(response, 400);
    expect(createLancamento).not.toHaveBeenCalled();
  });

  it("retorna 403 quando visualizador tenta salvar", async () => {
    mockSession(apiMocks.auth, USER_VIEWER);

    const response = await quickAddSavePost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: validQuickAddSuggestion,
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/gestao|permissao/i);
    expect(createLancamento).not.toHaveBeenCalled();
    expect(listContas).not.toHaveBeenCalled();
  });

  it("retorna 403 quando contaId pertence a outra gestao", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await quickAddSavePost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: quickAddSuggestionWithForeignConta(),
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/conta|categoria|gestao/i);
    expect(createLancamento).not.toHaveBeenCalled();
  });

  it("retorna 403 quando categoriaId pertence a outra gestao", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await quickAddSavePost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: quickAddSuggestionWithForeignCategoria(),
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/categoria|conta|gestao/i);
    expect(createLancamento).not.toHaveBeenCalled();
  });
});
