import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GestaoAccessDeniedError } from "@/lib/server/gestao-access";

import {
  buildSecurityLogPayload,
  logFinancialAccessDenied,
  logGestaoAccessDeniedFromError,
  reasonToEntity,
  reasonToSecurityEvent,
  resetSecurityLogSink,
  setSecurityLogSink,
} from "./security-log";

describe("security-log", () => {
  const logSink = vi.fn();

  beforeEach(() => {
    logSink.mockReset();
    setSecurityLogSink(logSink);
  });

  afterEach(() => {
    resetSecurityLogSink();
  });

  it("mapeia read_denied para financial.read.denied", () => {
    expect(reasonToSecurityEvent("read_denied")).toBe("financial.read.denied");
  });

  it("mapeia mutate_denied para financial.mutation.denied", () => {
    expect(reasonToSecurityEvent("mutate_denied")).toBe("financial.mutation.denied");
  });

  it("mapeia entidade fora da gestao para financial.entity.denied", () => {
    expect(reasonToSecurityEvent("conta_not_in_gestao")).toBe("financial.entity.denied");
    expect(reasonToEntity("categoria_not_in_gestao")).toBe("categoria");
  });

  it("emite payload estruturado sem dados sensiveis", () => {
    logFinancialAccessDenied("lancamento_not_in_gestao", {
      userId: 1001,
      gestaoId: 101,
      entityCount: 3,
      route: "/api/assistant/delete-lancamentos",
    });

    expect(logSink).toHaveBeenCalledOnce();
    const payload = logSink.mock.calls[0]?.[0];

    expect(payload).toMatchObject({
      event: "financial.entity.denied",
      userId: 1001,
      gestaoId: 101,
      reason: "lancamento_not_in_gestao",
      entity: "lancamento",
      entityCount: 3,
      route: "/api/assistant/delete-lancamentos",
    });
    expect(payload?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(JSON.stringify(payload)).not.toMatch(/senha|token|extrato|descricao/i);
  });

  it("logGestaoAccessDeniedFromError reutiliza o reason do erro", () => {
    logGestaoAccessDeniedFromError(new GestaoAccessDeniedError("mutate_denied"), {
      userId: 1003,
      gestaoId: 101,
      action: "dashboard.createLancamento",
    });

    expect(logSink).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "financial.mutation.denied",
        reason: "mutate_denied",
        userId: 1003,
        action: "dashboard.createLancamento",
      }),
    );
  });

  it("buildSecurityLogPayload preenche entity a partir do reason", () => {
    const payload = buildSecurityLogPayload("conta_not_in_gestao", {
      gestaoId: 101,
      entityId: 21,
    });

    expect(payload.entity).toBe("conta");
    expect(payload.entityId).toBe(21);
    expect(payload.event).toBe("financial.entity.denied");
  });
});
