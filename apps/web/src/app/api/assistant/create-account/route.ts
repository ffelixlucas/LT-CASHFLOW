import { NextResponse } from "next/server";

import { createAccountSuggestionSchema } from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import {
  gestaoAccessDeniedResponse,
  requireMutateGestaoApi,
} from "@/lib/server/gestao-api-guard";
import { createConta } from "@/lib/server/repository";

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
      route: "/api/assistant/create-account",
    });
    if (denied) {
      return denied;
    }
    throw error;
  }

  const parsed = createAccountSuggestionSchema.safeParse(body.suggestion);

  if (!parsed.success) {
    return NextResponse.json({ error: "Sugestao de conta invalida." }, { status: 400 });
  }

  const id = await createConta({
    gestaoId,
    userId,
    ...parsed.data,
  });

  return NextResponse.json({ ok: true, id });
}
