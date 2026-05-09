import { NextResponse } from "next/server";

import {
  quickAddBatchSuggestionSchema,
  quickAddSuggestionSchema,
  type QuickAddSuggestion,
} from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import { userCanMutateGestao } from "@/lib/server/permissions";
import {
  countSimilarLancamentosRecent,
  createLancamento,
  createTransferencia,
} from "@/lib/server/repository";

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

async function saveQuickAddSuggestion(input: {
  gestaoId: number;
  userId: number;
  suggestion: QuickAddSuggestion;
}) {
  const suggestion = withDefaultCurrentTime(input.suggestion);

  if (suggestion.tipo === "transferencia") {
    if (!suggestion.contaDestinoId) {
      throw new Error("transferencia_sem_destino");
    }

    const { contaDestinoId: _contaDestinoId, categoriaId: _categoriaId, ...transferSuggestion } = suggestion;

    return createTransferencia({
      gestaoId: input.gestaoId,
      userId: input.userId,
      contaOrigemId: transferSuggestion.contaId,
      contaDestinoId: suggestion.contaDestinoId,
      status: transferSuggestion.status,
      descricao: transferSuggestion.descricao,
      valorTotal: transferSuggestion.valorTotal,
      competenciaData: transferSuggestion.competenciaData,
      competenciaHora: transferSuggestion.competenciaHora,
      vencimentoData: transferSuggestion.vencimentoData,
    });
  }

  if (!suggestion.categoriaId) {
    throw new Error("categoria_ausente");
  }

  return createLancamento({
    gestaoId: input.gestaoId,
    userId: input.userId,
    descricao: suggestion.descricao,
    tipo: suggestion.tipo,
    status: suggestion.status,
    meio: suggestion.meio,
    contaId: suggestion.contaId,
    categoriaId: suggestion.categoriaId,
    valorTotal: suggestion.valorTotal,
    competenciaData: suggestion.competenciaData,
    competenciaHora: suggestion.competenciaHora,
    vencimentoData: suggestion.vencimentoData,
  });
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

  if (!(await userCanMutateGestao(userId, gestaoId))) {
    return NextResponse.json({ error: "Sem acesso a essa gestao." }, { status: 403 });
  }

  const single = quickAddSuggestionSchema.safeParse(body.suggestion);

  if (single.success) {
    const suggestion = withDefaultCurrentTime(single.data);
    const semelhantes = await countSimilarLancamentosRecent({
      gestaoId,
      contaId: suggestion.contaId,
      valorTotal: suggestion.valorTotal,
      descricao: suggestion.descricao,
      dias: 30,
    });

    let id: number;
    try {
      id = await saveQuickAddSuggestion({ gestaoId, userId, suggestion });
    } catch (error) {
      if (error instanceof Error && error.message === "transferencia_sem_destino") {
        return NextResponse.json(
          {
            error:
              "Sugestao de transferencia precisa informar conta destino. Use uma conta de poupanca ou investimento.",
          },
          { status: 400 },
        );
      }

      throw error;
    }

    return NextResponse.json({
      ok: true,
      id,
      avisoDuplicidade:
        semelhantes > 0
          ? `Ja existem ${semelhantes} lancamento(s) com o mesmo valor e descricao nos ultimos 30 dias na mesma origem. Confira antes de seguir.`
          : undefined,
    });
  }

  const batch = quickAddBatchSuggestionSchema.safeParse(body.suggestion);

  if (!batch.success) {
    return NextResponse.json({ error: "Sugestao invalida." }, { status: 400 });
  }

  const ids: number[] = [];

  const avisos: string[] = [];

  for (const item of batch.data.items) {
    const suggestion = withDefaultCurrentTime(item);
    const semelhantes = await countSimilarLancamentosRecent({
      gestaoId,
      contaId: suggestion.contaId,
      valorTotal: suggestion.valorTotal,
      descricao: suggestion.descricao,
      dias: 30,
    });

    if (semelhantes > 0) {
      avisos.push(
        `"${suggestion.descricao}": ${semelhantes} parecido(s) nos ultimos 30 dias na mesma origem.`,
      );
    }

    let id: number;
    try {
      id = await saveQuickAddSuggestion({ gestaoId, userId, suggestion });
    } catch (error) {
      if (error instanceof Error && error.message === "transferencia_sem_destino") {
        return NextResponse.json(
          {
            error:
              "Sugestao de transferencia precisa informar conta destino. Use uma conta de poupanca ou investimento.",
          },
          { status: 400 },
        );
      }

      throw error;
    }

    ids.push(id);
  }

  return NextResponse.json({
    ok: true,
    ids,
    quantidade: ids.length,
    avisoDuplicidade: avisos.length > 0 ? avisos.join(" ") : undefined,
  });
}
