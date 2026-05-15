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
  findRecentDuplicateLancamentoId,
  listCategorias,
  listContas,
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function cleanLancamentoDescricao(value: string) {
  const cleaned = value
    .replace(
      /^\s*(?:compra|pagamento|paguei)\s+(?:no|na|com)?\s*(?:d[eé]bito|debito|cr[eé]dito|credito|pix|cart[aã]o)\s*[-:–—]?\s*/i,
      "",
    )
    .replace(/^\s*(?:d[eé]bito|debito|cr[eé]dito|credito|pix)\s*[-:–—]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || value.trim();
}

function inferExpenseCategoryName(referenceText: string) {
  if (/\b(transporte|transp|coletivo|onibus|bus|metro|uber|99|taxi)\b/.test(referenceText)) {
    return "Transporte";
  }

  if (/\b(planta|moradia|casa|reforma|material de construcao|construcao)\b/.test(referenceText)) {
    return "Moradia";
  }

  if (/\b(super\s*mercado|supermercado|mercado|feira|padaria|restaurante|ifood|conveniencia)\b/.test(referenceText)) {
    return "Alimentacao";
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseSuggestion(value: unknown) {
  const single = quickAddSuggestionSchema.safeParse(value);

  if (single.success) {
    return single;
  }

  const raw = asRecord(value);
  if (!raw) {
    return single;
  }

  const toolDraft = {
    descricao: raw.descricao,
    valorTotal: raw.valorTotal ?? raw.valor,
    tipo: raw.tipo,
    status: raw.status ?? "liquidado",
    meio: raw.meio,
    contaId: raw.contaId,
    categoriaId: raw.categoriaId,
    competenciaData: raw.competenciaData ?? raw.data,
    competenciaHora: raw.competenciaHora ?? raw.hora,
    vencimentoData: raw.vencimentoData,
    confianca: raw.confianca ?? 0.95,
    motivo: raw.motivo ?? "Rascunho confirmado pelo usuario a partir do assistente.",
  };

  return quickAddSuggestionSchema.safeParse(toolDraft);
}

async function normalizeQuickAddSuggestion(gestaoId: number, suggestion: QuickAddSuggestion): Promise<QuickAddSuggestion> {
  if (suggestion.tipo === "transferencia") {
    return suggestion;
  }

  const [contas, categorias] = await Promise.all([listContas(gestaoId), listCategorias(gestaoId)]);
  const currentConta = contas.find((conta) => conta.id === suggestion.contaId);
  const currentCategoria = categorias.find((categoria) => categoria.id === suggestion.categoriaId);
  const next: QuickAddSuggestion = { ...suggestion };
  next.descricao = cleanLancamentoDescricao(next.descricao);

  if (suggestion.tipo === "despesa" && suggestion.meio === "credito" && currentConta?.tipo !== "cartao_credito") {
    const wantsLucas = currentConta ? /\blucas\b/.test(normalizeText(currentConta.nome)) : false;
    const card =
      contas.find((conta) => conta.tipo === "cartao_credito" && (!wantsLucas || /\blucas\b/.test(normalizeText(conta.nome)))) ??
      contas.find((conta) => conta.tipo === "cartao_credito");

    if (card) {
      next.contaId = card.id;
    }
  }

  if (
    suggestion.tipo === "despesa" &&
    suggestion.meio !== "credito" &&
    suggestion.meio !== "transferencia" &&
    currentConta?.tipo === "cartao_credito"
  ) {
    const referenceText = normalizeText(next.descricao);
    const wantsLucas = /\blucas\b/.test(referenceText) || /\blucas\b/.test(normalizeText(currentConta.nome));
    const defaultConta =
      contas.find(
        (conta) =>
          conta.tipo !== "cartao_credito" &&
          (!wantsLucas || /\blucas\b/.test(normalizeText(conta.nome))) &&
          (conta.tipo === "corrente" || conta.tipo === "carteira" || conta.tipo === "caixa" || conta.tipo === "outro"),
      ) ??
      contas.find(
        (conta) =>
          conta.tipo !== "cartao_credito" &&
          (conta.tipo === "corrente" || conta.tipo === "carteira" || conta.tipo === "caixa" || conta.tipo === "outro"),
      );

    if (defaultConta) {
      next.contaId = defaultConta.id;
    }
  }

  const categoryNatureInvalid =
    suggestion.tipo === "receita"
      ? currentCategoria?.natureza === "despesa"
      : suggestion.tipo === "despesa"
        ? currentCategoria?.natureza === "receita"
        : false;

  {
    const referenceText = normalizeText(suggestion.descricao);
    const inferredCategoryName =
      suggestion.tipo === "receita" ? "Renda" : inferExpenseCategoryName(referenceText);
    const desired = inferredCategoryName
      ? categorias.find(
          (categoria) =>
            normalizeText(categoria.nome) === normalizeText(inferredCategoryName) &&
            (categoria.natureza === suggestion.tipo || categoria.natureza === "ambos"),
        )
      : undefined;
    const fallback = categorias.find(
      (categoria) => categoria.natureza === suggestion.tipo || categoria.natureza === "ambos",
    );

    if (desired && currentCategoria?.id !== desired.id) {
      next.categoriaId = desired.id;
    } else if ((!currentCategoria || categoryNatureInvalid) && (desired ?? fallback)) {
      next.categoriaId = (desired ?? fallback)?.id;
    }
  }

  return next;
}

async function saveQuickAddSuggestion(input: {
  gestaoId: number;
  userId: number;
  suggestion: QuickAddSuggestion;
}): Promise<{ id: number; duplicated: boolean }> {
  const suggestion = withDefaultCurrentTime(await normalizeQuickAddSuggestion(input.gestaoId, input.suggestion));

  if (suggestion.tipo === "transferencia") {
    if (!suggestion.contaDestinoId) {
      throw new Error("transferencia_sem_destino");
    }

    const id = await createTransferencia({
      gestaoId: input.gestaoId,
      userId: input.userId,
      contaOrigemId: suggestion.contaId,
      contaDestinoId: suggestion.contaDestinoId,
      status: suggestion.status,
      descricao: suggestion.descricao,
      valorTotal: suggestion.valorTotal,
      competenciaData: suggestion.competenciaData,
      competenciaHora: suggestion.competenciaHora,
      vencimentoData: suggestion.vencimentoData,
    });

    return { id, duplicated: false };
  }

  if (!suggestion.categoriaId) {
    throw new Error("categoria_ausente");
  }

  // Idempotência: se o mesmo lançamento (mesma conta, valor, descrição e data) já
  // foi criado nos últimos 2 minutos, devolve o id existente em vez de duplicar.
  // Protege contra cliques duplos no botão "Confirmar" e contra fluxos da IA que
  // disparam dois INSERTs em sequência.
  const duplicateId = await findRecentDuplicateLancamentoId({
    gestaoId: input.gestaoId,
    contaId: suggestion.contaId,
    valorTotal: suggestion.valorTotal,
    descricao: suggestion.descricao,
    competenciaData: suggestion.competenciaData,
    competenciaHora: suggestion.competenciaHora,
    segundos: 120,
  });

  if (duplicateId != null) {
    return { id: duplicateId, duplicated: true };
  }

  const id = await createLancamento({
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

  return { id, duplicated: false };
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

  const single = parseSuggestion(body.suggestion);

  if (single.success) {
    const suggestion = withDefaultCurrentTime(single.data);
    const semelhantes = await countSimilarLancamentosRecent({
      gestaoId,
      contaId: suggestion.contaId,
      valorTotal: suggestion.valorTotal,
      descricao: suggestion.descricao,
      dias: 30,
    });

    let saved: { id: number; duplicated: boolean };
    try {
      saved = await saveQuickAddSuggestion({ gestaoId, userId, suggestion });
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
      id: saved.id,
      duplicated: saved.duplicated,
      avisoDuplicidade:
        semelhantes > 0
          ? `Ja existem ${semelhantes} lancamento(s) com o mesmo valor e descricao nos ultimos 30 dias na mesma origem. Confira antes de seguir.`
          : undefined,
    });
  }

  const batch = quickAddBatchSuggestionSchema.safeParse(body.suggestion);

  if (!batch.success) {
    return NextResponse.json({ error: "Sugestao invalida.", details: single.error.flatten() }, { status: 400 });
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

    let saved: { id: number; duplicated: boolean };
    try {
      saved = await saveQuickAddSuggestion({ gestaoId, userId, suggestion });
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

    ids.push(saved.id);
  }

  return NextResponse.json({
    ok: true,
    ids,
    quantidade: ids.length,
    avisoDuplicidade: avisos.length > 0 ? avisos.join(" ") : undefined,
  });
}
