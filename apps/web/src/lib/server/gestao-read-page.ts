import "server-only";

import { redirect } from "next/navigation";

import { assertCanReadGestao, GestaoAccessDeniedError } from "@/lib/server/gestao-access";
import { logGestaoAccessDeniedFromError } from "@/lib/server/security-log";

export function parseRequestedGestaoId(
  raw: string | string[] | undefined,
): number | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }

  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) {
    return undefined;
  }

  return id;
}

/**
 * Resolve a gestão ativa para páginas server-only de leitura.
 * Só retorna gestões da lista do usuário, exceto quando ?gestao= é explícito:
 * aí valida com assertCanReadGestao antes de negar (evita IDOR por URL).
 */
export async function resolveGestaoAtivaForRead<T extends { id: number }>(
  userId: number,
  gestoes: T[],
  requestedGestaoId: number | undefined,
): Promise<T | null> {
  if (gestoes.length === 0) {
    return null;
  }

  if (!requestedGestaoId) {
    return gestoes[0] ?? null;
  }

  const fromList = gestoes.find((item) => item.id === requestedGestaoId);
  if (fromList) {
    return fromList;
  }

  try {
    await assertCanReadGestao(userId, requestedGestaoId);
  } catch (error) {
    if (error instanceof GestaoAccessDeniedError) {
      logGestaoAccessDeniedFromError(error, {
        userId,
        gestaoId: requestedGestaoId,
        action: "dashboard.read",
      });
      redirect("/dashboard?status=acesso-negado");
    }

    throw error;
  }

  return gestoes[0] ?? null;
}
