import { NextResponse } from "next/server";

import { quickAddBatchSuggestionSchema, quickAddSuggestionSchema } from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import { createLancamento, userHasGestaoAccess } from "@/lib/server/repository";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function withDefaultCurrentTime<T extends { competenciaData: string; competenciaHora?: string }>(suggestion: T): T {
  if (suggestion.competenciaHora) {
    return suggestion;
  }

  const now = new Date();

  if (suggestion.competenciaData !== formatDate(now)) {
    return suggestion;
  }

  return {
    ...suggestion,
    competenciaHora: formatTime(now),
  };
}

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

  const single = quickAddSuggestionSchema.safeParse(body.suggestion);

  if (single.success) {
    const suggestion = withDefaultCurrentTime(single.data);
    const id = await createLancamento({
      gestaoId,
      userId,
      ...suggestion,
    });

    return NextResponse.json({ ok: true, id });
  }

  const batch = quickAddBatchSuggestionSchema.safeParse(body.suggestion);

  if (!batch.success) {
    return NextResponse.json({ error: "Sugestao invalida." }, { status: 400 });
  }

  const ids: number[] = [];

  for (const item of batch.data.items) {
    const suggestion = withDefaultCurrentTime(item);
    const id = await createLancamento({
      gestaoId,
      userId,
      ...suggestion,
    });

    ids.push(id);
  }

  return NextResponse.json({ ok: true, ids, quantidade: ids.length });
}
