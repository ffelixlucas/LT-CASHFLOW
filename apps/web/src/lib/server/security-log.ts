import type { GestaoAccessDeniedError, GestaoAccessDeniedReason } from "@/lib/server/gestao-access";

export type SecurityDeniedEvent =
  | "financial.read.denied"
  | "financial.mutation.denied"
  | "financial.entity.denied";

export type SecurityLogContext = {
  userId?: number;
  gestaoId?: number;
  reason?: GestaoAccessDeniedReason;
  entity?: string;
  entityId?: number;
  entityCount?: number;
  route?: string;
  action?: string;
};

export type SecurityLogPayload = SecurityLogContext & {
  event: SecurityDeniedEvent;
  timestamp: string;
};

type SecurityLogSink = (payload: SecurityLogPayload) => void;

const REASON_TO_ENTITY: Partial<Record<GestaoAccessDeniedReason, string>> = {
  conta_not_in_gestao: "conta",
  categoria_not_in_gestao: "categoria",
  lancamento_not_in_gestao: "lancamento",
  gasto_fixo_not_in_gestao: "gasto_fixo",
  fatura_not_in_gestao: "fatura",
};

let sink: SecurityLogSink = (payload) => {
  console.warn(JSON.stringify(payload));
};

export function setSecurityLogSink(customSink: SecurityLogSink | null) {
  sink = customSink ?? ((payload) => {
    console.warn(JSON.stringify(payload));
  });
}

export function resetSecurityLogSink() {
  setSecurityLogSink(null);
}

export function reasonToSecurityEvent(reason: GestaoAccessDeniedReason): SecurityDeniedEvent {
  if (reason === "read_denied") {
    return "financial.read.denied";
  }

  if (reason === "mutate_denied") {
    return "financial.mutation.denied";
  }

  return "financial.entity.denied";
}

export function reasonToEntity(reason: GestaoAccessDeniedReason): string | undefined {
  return REASON_TO_ENTITY[reason];
}

export function buildSecurityLogPayload(
  reason: GestaoAccessDeniedReason,
  context: SecurityLogContext = {},
): SecurityLogPayload {
  const event = reasonToSecurityEvent(reason);

  return {
    event,
    timestamp: new Date().toISOString(),
    userId: context.userId,
    gestaoId: context.gestaoId,
    reason,
    entity: context.entity ?? reasonToEntity(reason),
    entityId: context.entityId,
    entityCount: context.entityCount,
    route: context.route,
    action: context.action,
  };
}

export function logFinancialAccessDenied(
  reason: GestaoAccessDeniedReason,
  context: SecurityLogContext = {},
) {
  sink(buildSecurityLogPayload(reason, context));
}

export function logGestaoAccessDeniedFromError(
  error: GestaoAccessDeniedError,
  context: SecurityLogContext = {},
) {
  logFinancialAccessDenied(error.reason, context);
}
