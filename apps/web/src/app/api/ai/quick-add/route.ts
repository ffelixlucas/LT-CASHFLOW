import { NextResponse } from "next/server";

import { auth } from "@/lib/server/auth";
import { suggestQuickAdd } from "@/lib/server/ai";
import { listCategorias, listContas, userHasGestaoAccess } from "@/lib/server/repository";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as { prompt?: string; gestaoId?: number };
  const prompt = body.prompt?.trim();
  const gestaoId = Number(body.gestaoId);
  const userId = Number(session.user.id);

  if (!prompt || !gestaoId) {
    return NextResponse.json({ error: "Prompt e gestao sao obrigatorios." }, { status: 400 });
  }

  if (!(await userHasGestaoAccess(userId, gestaoId))) {
    return NextResponse.json({ error: "Sem acesso a essa gestao." }, { status: 403 });
  }

  const [contas, categorias] = await Promise.all([
    listContas(gestaoId),
    listCategorias(gestaoId),
  ]);

  try {
    const result = await suggestQuickAdd(prompt, contas, categorias);

    return NextResponse.json({
      suggestion: result.suggestion,
      provider: result.provider,
    });
  } catch {
    return NextResponse.json(
      { error: "Nao consegui interpretar esse texto. Inclua valor e contexto da compra." },
      { status: 400 },
    );
  }
}
