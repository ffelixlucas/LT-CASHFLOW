import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as deleteLancamentosPost } from "@/app/api/assistant/delete-lancamentos/route";
import { POST as updateLancamentosPost } from "@/app/api/assistant/update-lancamentos/route";
import {
  createGestaoDbMockHandler,
  defaultMockDbState,
} from "@/test/helpers/mock-gestao-db";
import { expectStatus, mockSession, postJson } from "@/test/helpers/http-route-test";
import {
  deleteSuggestionWithForeignLancamento,
  validDeleteLancamentosSuggestion,
  validUpdateLancamentosMeioSuggestion,
} from "@/test/helpers/route-payloads";
import { TENANT_A, USER_EDITOR, USER_OUTSIDER, USER_VIEWER } from "@/test/helpers/tenant-fixtures";

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

const deleteLancamentos = vi.fn();
const updateLancamentosMeio = vi.fn();

vi.mock("@/lib/server/repository", () => ({
  deleteLancamentos: (...args: unknown[]) => deleteLancamentos(...args),
  updateLancamentosMeio: (...args: unknown[]) => updateLancamentosMeio(...args),
}));

describe("POST /api/assistant/delete-lancamentos", () => {
  beforeEach(() => {
    apiMocks.poolQuery.mockReset();
    apiMocks.poolQuery.mockImplementation(createGestaoDbMockHandler(defaultMockDbState));
    deleteLancamentos.mockReset();
    deleteLancamentos.mockResolvedValue(1);
  });

  it("retorna 401 sem sessao", async () => {
    mockSession(apiMocks.auth, null);

    const response = await deleteLancamentosPost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: validDeleteLancamentosSuggestion,
      }),
    );

    await expectStatus(response, 401);
    expect(deleteLancamentos).not.toHaveBeenCalled();
  });

  it("retorna 400 com sugestao invalida", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await deleteLancamentosPost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: { lancamentoIds: [] },
      }),
    );

    await expectStatus(response, 400);
    expect(deleteLancamentos).not.toHaveBeenCalled();
  });

  it("retorna 403 quando visualizador tenta excluir", async () => {
    mockSession(apiMocks.auth, USER_VIEWER);

    const response = await deleteLancamentosPost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: validDeleteLancamentosSuggestion,
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/permissao/i);
    expect(deleteLancamentos).not.toHaveBeenCalled();
  });

  it("retorna 403 quando usuario nao pertence a gestao", async () => {
    mockSession(apiMocks.auth, USER_OUTSIDER);

    const response = await deleteLancamentosPost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: validDeleteLancamentosSuggestion,
      }),
    );

    await expectStatus(response, 403);
    expect(deleteLancamentos).not.toHaveBeenCalled();
  });

  it("retorna 403 quando lancamentoIds inclui id de outra gestao", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await deleteLancamentosPost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: deleteSuggestionWithForeignLancamento(),
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/lancamento/i);
    expect(deleteLancamentos).not.toHaveBeenCalled();
  });
});

describe("POST /api/assistant/update-lancamentos", () => {
  beforeEach(() => {
    apiMocks.poolQuery.mockReset();
    apiMocks.poolQuery.mockImplementation(createGestaoDbMockHandler(defaultMockDbState));
    updateLancamentosMeio.mockReset();
    updateLancamentosMeio.mockResolvedValue(1);
  });

  it("retorna 403 quando visualizador tenta atualizar meio", async () => {
    mockSession(apiMocks.auth, USER_VIEWER);

    const response = await updateLancamentosPost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: validUpdateLancamentosMeioSuggestion,
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/permissao/i);
    expect(updateLancamentosMeio).not.toHaveBeenCalled();
  });

  it("retorna 403 quando lancamentoIds inclui id de outra gestao", async () => {
    mockSession(apiMocks.auth, USER_EDITOR);

    const response = await updateLancamentosPost(
      postJson({
        gestaoId: TENANT_A,
        suggestion: {
          ...validUpdateLancamentosMeioSuggestion,
          lancamentoIds: [61],
        },
      }),
    );

    const body = await expectStatus(response, 403);
    expect(body.data.error).toMatch(/lancamento/i);
    expect(updateLancamentosMeio).not.toHaveBeenCalled();
  });
});
