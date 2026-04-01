import { NextResponse } from "next/server";

import { quickAddSuggestionSchema } from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import { createLancamento, listContas, userHasGestaoAccess } from "@/lib/server/repository";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    gestaoId?: number;
    items?: unknown[];
  };

  const gestaoId = Number(body.gestaoId);
  const userId = Number(session.user.id);

  if (!gestaoId || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Gestao e itens do extrato sao obrigatorios." }, { status: 400 });
  }

  if (!(await userHasGestaoAccess(userId, gestaoId))) {
    return NextResponse.json({ error: "Sem acesso a essa gestao." }, { status: 403 });
  }

  const parsedItems = body.items
    .map((item) => quickAddSuggestionSchema.safeParse(item))
    .filter((item) => item.success)
    .map((item) => item.data);

  if (parsedItems.length === 0) {
    return NextResponse.json({ error: "Nenhum item valido para importar." }, { status: 400 });
  }

  const contaIds = [...new Set(parsedItems.map((item) => item.contaId))];

  if (contaIds.length !== 1) {
    return NextResponse.json({ error: "A importacao do extrato precisa apontar para uma unica origem." }, { status: 400 });
  }

  const conta = (await listContas(gestaoId)).find((item) => item.id === contaIds[0]);

  if (!conta) {
    return NextResponse.json({ error: "Origem invalida para importacao." }, { status: 404 });
  }

  if (conta.tipo === "cartao_credito") {
    return NextResponse.json(
      { error: "Importacao de extrato bancario nao e permitida em cartao de credito." },
      { status: 400 },
    );
  }

  const ids: number[] = [];

  for (const item of parsedItems) {
    const id = await createLancamento({
      gestaoId,
      userId,
      ...item,
    });

    ids.push(id);
  }

  return NextResponse.json({ ok: true, quantidade: ids.length, ids });
}
