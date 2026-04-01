import { NextResponse } from "next/server";

import { normalizeDateInput } from "@/lib/date";
import { auth } from "@/lib/server/auth";
import { listCategorias, listContas, listLancamentosForContaRange, userHasGestaoAccess } from "@/lib/server/repository";
import { buildStatementPreview, parseStatementText } from "@/lib/server/statement-reconciliation";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    gestaoId?: number;
    contaId?: number;
    text?: string;
    fallbackDate?: string;
  };

  const gestaoId = Number(body.gestaoId);
  const contaId = Number(body.contaId);
  const userId = Number(session.user.id);
  const text = body.text?.trim();
  const fallbackDate = normalizeDateInput(body.fallbackDate);

  if (!gestaoId || !contaId || !text) {
    return NextResponse.json({ error: "Gestao, origem e texto do extrato sao obrigatorios." }, { status: 400 });
  }

  if (body.fallbackDate && !fallbackDate) {
    return NextResponse.json({ error: "A data base do trecho precisa estar no formato dd/mm/aaaa." }, { status: 400 });
  }

  if (!(await userHasGestaoAccess(userId, gestaoId))) {
    return NextResponse.json({ error: "Sem acesso a essa gestao." }, { status: 403 });
  }

  const conta = (await listContas(gestaoId)).find((item) => item.id === contaId);

  if (!conta) {
    return NextResponse.json({ error: "Origem invalida para conciliacao." }, { status: 404 });
  }

  if (conta.tipo === "cartao_credito") {
    return NextResponse.json(
      { error: "Conciliacao bancaria nao pode ser feita em cartao de credito. Escolha uma origem de conta." },
      { status: 400 },
    );
  }

  const categorias = await listCategorias(gestaoId);
  const parsed = parseStatementText({
    text,
    contaId,
    categories: categorias,
    fallbackDate,
  });

  if (parsed.items.length === 0) {
    return NextResponse.json(
      {
        error:
          "Nao consegui identificar movimentacoes validas nesse extrato. Cole o texto do extrato com datas ou informe a data base do trecho.",
      },
      { status: 400 },
    );
  }

  const dates = parsed.items.map((item) => item.date).sort();
  const dateFrom = dates[0];
  const dateTo = dates[dates.length - 1];
  const existingLancamentos = await listLancamentosForContaRange({
    gestaoId,
    contaId,
    dateFrom,
    dateTo,
  });
  const preview = buildStatementPreview({
    parsedItems: parsed.items,
    existingLancamentos,
    ignoredCount: parsed.ignoredCount,
  });

  return NextResponse.json(preview);
}
