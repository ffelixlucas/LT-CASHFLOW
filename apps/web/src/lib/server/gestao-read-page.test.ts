import { beforeEach, describe, expect, it, vi } from "vitest";

import { GestaoAccessDeniedError } from "@/lib/server/gestao-access";

const redirectMock = vi.hoisted(() => vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const accessMocks = vi.hoisted(() => ({
  assertCanReadGestao: vi.fn(),
}));

vi.mock("@/lib/server/gestao-access", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/server/gestao-access")>();
  return {
    ...mod,
    assertCanReadGestao: (...args: unknown[]) => accessMocks.assertCanReadGestao(...args),
  };
});

const securityLogMocks = vi.hoisted(() => ({
  logGestaoAccessDeniedFromError: vi.fn(),
}));

vi.mock("@/lib/server/security-log", () => ({
  logGestaoAccessDeniedFromError: (...args: unknown[]) =>
    securityLogMocks.logGestaoAccessDeniedFromError(...args),
}));

import { parseRequestedGestaoId, resolveGestaoAtivaForRead } from "./gestao-read-page";

describe("gestao-read-page", () => {
  const gestoes = [
    { id: 101, nome: "A" },
    { id: 202, nome: "B" },
  ];

  beforeEach(() => {
    accessMocks.assertCanReadGestao.mockReset();
    redirectMock.mockClear();
    securityLogMocks.logGestaoAccessDeniedFromError.mockReset();
  });

  it("parseRequestedGestaoId ignora valores invalidos", () => {
    expect(parseRequestedGestaoId(undefined)).toBeUndefined();
    expect(parseRequestedGestaoId("abc")).toBeUndefined();
    expect(parseRequestedGestaoId("0")).toBeUndefined();
    expect(parseRequestedGestaoId("101")).toBe(101);
  });

  it("retorna null sem gestoes do usuario", async () => {
    await expect(resolveGestaoAtivaForRead(1001, [], undefined)).resolves.toBeNull();
  });

  it("usa primeira gestao quando param ausente", async () => {
    await expect(resolveGestaoAtivaForRead(1001, gestoes, undefined)).resolves.toEqual(gestoes[0]);
  });

  it("seleciona gestao da lista do usuario sem assert extra", async () => {
    await expect(resolveGestaoAtivaForRead(1001, gestoes, 202)).resolves.toEqual(gestoes[1]);
    expect(accessMocks.assertCanReadGestao).not.toHaveBeenCalled();
  });

  it("nega gestao externa com log e redirect", async () => {
    accessMocks.assertCanReadGestao.mockRejectedValue(new GestaoAccessDeniedError("read_denied"));

    await expect(resolveGestaoAtivaForRead(1001, gestoes, 999)).rejects.toThrow(
      "REDIRECT:/dashboard?status=acesso-negado",
    );

    expect(accessMocks.assertCanReadGestao).toHaveBeenCalledWith(1001, 999);
    expect(securityLogMocks.logGestaoAccessDeniedFromError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "read_denied" }),
      expect.objectContaining({ userId: 1001, gestaoId: 999, action: "dashboard.read" }),
    );
  });
});
