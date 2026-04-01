import { NextResponse } from "next/server";

import { auth } from "@/lib/server/auth";
import { planAssistantSearch } from "@/lib/server/ai";
import {
  findLargestLancamento,
  findLatestLancamento,
  sumLancamentos,
  listCategorias,
  listContas,
  searchLancamentos,
  userHasGestaoAccess,
} from "@/lib/server/repository";

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

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

  const planned = await planAssistantSearch(prompt, contas, categorias);
  const plan = planned.plan;
  const provider = planned.provider;

  if (plan.intent === "latest_transaction") {
    const latest = await findLatestLancamento({
      gestaoId,
      ...plan.filters,
    });

    return NextResponse.json({
      plan,
      provider,
      answer: latest
        ? `O ultimo lancamento foi "${latest.descricao}" em ${latest.competencia_data}, na conta ${latest.conta_nome}, no valor de ${money(latest.valor_total)}.`
        : "Nao encontrei nenhum lancamento para esse contexto.",
      results: latest ? [latest] : [],
    });
  }

  if (plan.intent === "largest_expense") {
    const item = await findLargestLancamento({
      gestaoId,
      ...plan.filters,
      tipo: "despesa",
    });

    return NextResponse.json({
      plan,
      provider,
      answer: item
        ? `A maior despesa encontrada foi "${item.descricao}" em ${item.competencia_data}, no valor de ${money(item.valor_total)}.`
        : "Nao encontrei despesas com esse contexto.",
      results: item ? [item] : [],
    });
  }

  if (plan.intent === "largest_income") {
    const item = await findLargestLancamento({
      gestaoId,
      ...plan.filters,
      tipo: "receita",
    });

    return NextResponse.json({
      plan,
      provider,
      answer: item
        ? `A maior receita encontrada foi "${item.descricao}" em ${item.competencia_data}, no valor de ${money(item.valor_total)}.`
        : "Nao encontrei receitas com esse contexto.",
      results: item ? [item] : [],
    });
  }

  if (plan.intent === "summary") {
    const total = await sumLancamentos({
      gestaoId,
      ...plan.filters,
    });
    const results = await searchLancamentos({
      gestaoId,
      ...plan.filters,
    });

    return NextResponse.json({
      plan,
      provider,
      answer:
        total.quantidade > 0
          ? `Encontrei ${total.quantidade} lancamento(s), somando ${money(total.total)} dentro do contexto pedido.`
          : "Nao encontrei lancamentos para resumir nesse contexto.",
      results,
    });
  }

  const results = await searchLancamentos({
    gestaoId,
    ...plan.filters,
  });

  return NextResponse.json({
    plan,
    answer:
      results.length > 0
        ? `Encontrei ${results.length} lancamento(s) com base no que voce pediu.`
        : "Nao encontrei lancamentos com esse pedido.",
    results,
    provider,
  });
}
