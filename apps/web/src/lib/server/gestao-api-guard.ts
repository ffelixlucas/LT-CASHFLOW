import "server-only";

import { NextResponse } from "next/server";

import {
  assertCanMutateGestao,
  assertCanReadGestao,
  assertFinancialRefsInGestao,
  GestaoAccessDeniedError,
  type FinancialRefsInGestaoInput,
  type GestaoAccessDeniedReason,
} from "@/lib/server/gestao-access";
import {
  logGestaoAccessDeniedFromError,
  type SecurityLogContext,
} from "@/lib/server/security-log";

export type { SecurityLogContext } from "@/lib/server/security-log";

const ACCESS_MESSAGES: Record<GestaoAccessDeniedReason, string> = {
  read_denied: "Sem acesso a essa gestao.",
  mutate_denied: "Sem permissao para alterar esta gestao.",
  conta_not_in_gestao: "Conta nao pertence a esta gestao.",
  categoria_not_in_gestao: "Categoria nao pertence a esta gestao.",
  lancamento_not_in_gestao: "Lancamento nao pertence a esta gestao.",
  gasto_fixo_not_in_gestao: "Gasto fixo nao pertence a esta gestao.",
  fatura_not_in_gestao: "Fatura nao pertence a esta gestao.",
};

export function gestaoAccessDeniedResponse(error: unknown, context: SecurityLogContext = {}) {
  if (error instanceof GestaoAccessDeniedError) {
    logGestaoAccessDeniedFromError(error, context);
    return NextResponse.json(
      { error: ACCESS_MESSAGES[error.reason] ?? "Sem acesso a esta gestao." },
      { status: 403 },
    );
  }

  return null;
}

export async function requireReadGestaoApi(userId: number, gestaoId: number) {
  await assertCanReadGestao(userId, gestaoId);
}

export async function requireMutateGestaoApi(userId: number, gestaoId: number) {
  await assertCanMutateGestao(userId, gestaoId);
}

export async function requireFinancialRefsInGestaoApi(input: FinancialRefsInGestaoInput) {
  await assertFinancialRefsInGestao(input);
}
