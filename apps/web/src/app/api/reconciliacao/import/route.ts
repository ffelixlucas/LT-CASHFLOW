import { NextResponse } from "next/server";

import { quickAddSuggestionSchema } from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import {
  gestaoAccessDeniedResponse,
  requireFinancialRefsInGestaoApi,
  requireMutateGestaoApi,
} from "@/lib/server/gestao-api-guard";
import { createLancamento, createTransferencia, listContas } from "@/lib/server/repository";

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

  try {
    await requireMutateGestaoApi(userId, gestaoId);
  } catch (error) {
    const denied = gestaoAccessDeniedResponse(error, {
      userId,
      gestaoId,
      route: "/api/reconciliacao/import",
    });
    if (denied) {
      return denied;
    }
    throw error;
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

  try {
    await requireFinancialRefsInGestaoApi({ gestaoId, contaId: contaIds[0] });
  } catch (error) {
    const denied = gestaoAccessDeniedResponse(error, {
      userId,
      gestaoId,
      route: "/api/reconciliacao/import",
      entityId: contaIds[0],
    });
    if (denied) {
      return denied;
    }
    throw error;
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
    try {
      await requireFinancialRefsInGestaoApi({
        gestaoId,
        contaId: item.contaId,
        categoriaId: item.tipo === "transferencia" ? null : item.categoriaId ?? null,
        contaDestinoId: item.contaDestinoId ?? null,
      });
    } catch (error) {
      const denied = gestaoAccessDeniedResponse(error, {
        userId,
        gestaoId,
        route: "/api/reconciliacao/import",
        entityId: item.categoriaId ?? item.contaId,
      });
      if (denied) {
        return denied;
      }
      throw error;
    }

    if (item.tipo === "transferencia") {
      if (!item.contaDestinoId) {
        return NextResponse.json(
          {
            error:
              "A aplicacao precisa de uma conta destino de poupanca ou investimento para ser importada.",
          },
          { status: 400 },
        );
      }

      const id = await createTransferencia({
        gestaoId,
        userId,
        contaOrigemId: item.contaId,
        contaDestinoId: item.contaDestinoId,
        status: item.status,
        descricao: item.descricao,
        valorTotal: item.valorTotal,
        competenciaData: item.competenciaData,
        competenciaHora: item.competenciaHora,
        vencimentoData: item.vencimentoData,
      });

      ids.push(id);
      continue;
    }

    const id = await createLancamento({
      gestaoId,
      userId,
      descricao: item.descricao,
      tipo: item.tipo,
      status: item.status,
      meio: item.meio,
      contaId: item.contaId,
      categoriaId: item.categoriaId ?? 0,
      valorTotal: item.valorTotal,
      competenciaData: item.competenciaData,
      competenciaHora: item.competenciaHora,
      vencimentoData: item.vencimentoData,
    });

    ids.push(id);
  }

  return NextResponse.json({ ok: true, quantidade: ids.length, ids });
}
