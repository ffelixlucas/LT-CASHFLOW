import { NextResponse } from "next/server";

import { updateLancamentosDataSuggestionSchema } from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import {
  gestaoAccessDeniedResponse,
  requireMutateGestaoApi,
} from "@/lib/server/gestao-api-guard";
import { assertLancamentoIdsInGestao } from "@/lib/server/permissions";
import { updateLancamentosCompetenciaData } from "@/lib/server/repository";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as { gestaoId?: number; suggestion?: unknown };
  const gestaoId = Number(body.gestaoId);
  const userId = Number(session.user.id);

  if (!gestaoId) {
    return NextResponse.json({ error: "Gestao obrigatoria." }, { status: 400 });
  }

  try {
    await requireMutateGestaoApi(userId, gestaoId);
  } catch (error) {
    const denied = gestaoAccessDeniedResponse(error, {
      userId,
      gestaoId,
      route: "/api/assistant/update-lancamentos-data",
    });
    if (denied) {
      return denied;
    }
    throw error;
  }

  const parsed = updateLancamentosDataSuggestionSchema.safeParse(body.suggestion);

  if (!parsed.success) {
    return NextResponse.json({ error: "Sugestao de ajuste de data invalida." }, { status: 400 });
  }

  try {
    await assertLancamentoIdsInGestao(parsed.data.lancamentoIds, gestaoId);
  } catch (error) {
    const denied = gestaoAccessDeniedResponse(error, {
      userId,
      gestaoId,
      route: "/api/assistant/update-lancamentos-data",
      entityCount: parsed.data.lancamentoIds.length,
    });
    if (denied) {
      return denied;
    }
    throw error;
  }

  const updated = await updateLancamentosCompetenciaData({
    gestaoId,
    lancamentoIds: parsed.data.lancamentoIds,
    competenciaData: parsed.data.competenciaData,
  });

  return NextResponse.json({ ok: true, updated });
}
