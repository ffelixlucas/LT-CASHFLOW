import { NextResponse } from "next/server";

import { renameAccountSuggestionSchema } from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import {
  gestaoAccessDeniedResponse,
  requireFinancialRefsInGestaoApi,
  requireMutateGestaoApi,
} from "@/lib/server/gestao-api-guard";
import { updateContaNome } from "@/lib/server/repository";

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
      route: "/api/assistant/rename-account",
    });
    if (denied) {
      return denied;
    }
    throw error;
  }

  const parsed = renameAccountSuggestionSchema.safeParse(body.suggestion);

  if (!parsed.success) {
    return NextResponse.json({ error: "Sugestao de renomeacao invalida." }, { status: 400 });
  }

  try {
    await requireFinancialRefsInGestaoApi({
      gestaoId,
      contaId: parsed.data.contaId,
    });
  } catch (error) {
    const denied = gestaoAccessDeniedResponse(error, {
      userId,
      gestaoId,
      route: "/api/assistant/rename-account",
      entityId: parsed.data.contaId,
    });
    if (denied) {
      return denied;
    }
    throw error;
  }

  const ok = await updateContaNome({
    gestaoId,
    contaId: parsed.data.contaId,
    nome: parsed.data.novoNome,
  });

  if (!ok) {
    return NextResponse.json({ error: "Nao encontrei a conta para renomear." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
