import { NextResponse } from "next/server";

import { keepAccountsSuggestionSchema } from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import { deactivateContasExcept, userHasGestaoAccess } from "@/lib/server/repository";

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

  if (!(await userHasGestaoAccess(userId, gestaoId))) {
    return NextResponse.json({ error: "Sem acesso a essa gestao." }, { status: 403 });
  }

  const parsed = keepAccountsSuggestionSchema.safeParse(body.suggestion);

  if (!parsed.success) {
    return NextResponse.json({ error: "Sugestao de manutencao de origens invalida." }, { status: 400 });
  }

  const updated = await deactivateContasExcept({
    gestaoId,
    keepContaIds: parsed.data.manterContaIds,
  });

  return NextResponse.json({ ok: true, updated });
}
