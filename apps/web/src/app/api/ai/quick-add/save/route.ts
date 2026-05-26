import { NextResponse } from "next/server";

import {
  quickAddBatchSuggestionSchema,
  quickAddSuggestionSchema,
  type QuickAddSuggestion,
} from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import {
  gestaoAccessDeniedResponse,
  requireFinancialRefsInGestaoApi,
  requireMutateGestaoApi,
} from "@/lib/server/gestao-api-guard";
import {
  countSimilarLancamentosRecent,
  createLancamento,
  createTransferencia,
  findRecentDuplicateLancamentoId,
  listCategorias,
  listContas,
  resolveContaIdForLancamento,
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
  const parenthesized = value.match(/\(([^)]+)\)/)?.[1]?.trim();
  const cleaned = value
    .replace(/\(([^)]+)\)/g, " ")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ")
    .replace(/\b(?:as|às)?\s*([01]?\d|2[0-3])[:h]([0-5]\d)\b/gi, " ")
    .replace(/\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{1,2})?/g, " ")
    .replace(/r\$/gi, " ")
    .replace(/\b(hoje|agora|ontem|amanha)\b/gi, " ")
    .replace(/\b(no|na)?\s*dia\b/gi, " ")
    .replace(/\bpix\s+(enviado|mandado|recebido)\b/gi, " ")
    .replace(/\b(enviei|envio|mandei|mande|passei|recebi)\s+(um\s+)?pix\b/gi, " ")
    .replace(/\bcompr\s+a?no\b/gi, " ")
    .replace(/\b(compra|comprei|compr|pagamento|paguei)\b/gi, " ")
    .replace(/\b(no|na|com)?\s*cart[aã]o(?:\s+de)?(?:\s+(?:cr[eé]dito|credito|crito))?\b/gi, " ")
    .replace(/\b(d[eé]bito|debito|cr[eé]dito|credito|crito|pix)\b/gi, " ")
    .replace(/\b(no|na|de|do|da|para)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const withContext = [parenthesized, cleaned].filter(Boolean).join(" ").trim();

  return withContext ? prettifyLancamentoDescricao(withContext) : value.trim();
}

function prettifyLancamentoDescricao(value: string) {
  const corrections = new Map<string, string>([
    ["alimentacao", "Alimentação"],
    ["cartao", "Cartão"],
    ["credito", "Crédito"],
    ["debito", "Débito"],
    ["saude", "Saúde"],
    ["onibus", "Ônibus"],
    ["mes", "Mês"],
    ["mesada", "Mesada"],
  ]);
  const smallWords = new Set(["de", "da", "do", "das", "dos", "e", "em", "no", "na"]);

  return value
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word, index) => {
      const normalized = normalizeText(word.replace(/[^\p{L}\p{N}]/gu, ""));
      const punctuationPrefix = word.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "";
      const punctuationSuffix = word.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? "";
      const core = word.slice(punctuationPrefix.length, word.length - punctuationSuffix.length);

      if (!core) {
        return word;
      }

      const corrected = corrections.get(normalized);
      if (corrected) {
        return `${punctuationPrefix}${corrected}${punctuationSuffix}`;
      }

      if (index > 0 && smallWords.has(normalized)) {
        return `${punctuationPrefix}${normalized}${punctuationSuffix}`;
      }

      const lower = core.toLocaleLowerCase("pt-BR");
      return `${punctuationPrefix}${lower.charAt(0).toLocaleUpperCase("pt-BR")}${lower.slice(1)}${punctuationSuffix}`;
    })
    .join(" ");
}

function inferExpenseCategoryName(referenceText: string) {
  if (/\b(transporte|transp|coletivo|onibus|bus|metro|uber|99|taxi)\b/.test(referenceText)) {
    return "Transporte";
  }

  if (/\b(planta|moradia|casa|reforma|material de construcao|construcao)\b/.test(referenceText)) {
    return "Alimentação/Moradia";
  }

  if (/\b(super\s*mercado|supermercado|mercado|feira|padaria|restaurante|ifood|conveniencia)\b/.test(referenceText)) {
    return "Alimentação/Moradia";
  }

  if (/\b(mesada|filho|filha|filhos|crianca)\b/.test(referenceText)) {
    return "Filhos";
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
    const fallback =
      categorias.find(
        (categoria) =>
          normalizeText(categoria.nome) === "outros" &&
          (categoria.natureza === suggestion.tipo || categoria.natureza === "ambos"),
      ) ??
      categorias.find(
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
  const contaIdResolved = await resolveContaIdForLancamento({
    gestaoId: input.gestaoId,
    contaId: suggestion.contaId,
    tipo: suggestion.tipo,
    meio: suggestion.meio,
  });
  const duplicateId = await findRecentDuplicateLancamentoId({
    gestaoId: input.gestaoId,
    contaId: contaIdResolved,
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

  try {
    await requireMutateGestaoApi(userId, gestaoId);
  } catch (error) {
    const denied = gestaoAccessDeniedResponse(error, {
      userId,
      gestaoId,
      route: "/api/ai/quick-add/save",
    });
    if (denied) {
      return denied;
    }
    throw error;
  }

  const single = parseSuggestion(body.suggestion);

  if (single.success) {
    const suggestion = withDefaultCurrentTime(single.data);

    try {
      await requireFinancialRefsInGestaoApi({
        gestaoId,
        contaId: suggestion.contaId,
        categoriaId: suggestion.tipo === "transferencia" ? null : suggestion.categoriaId ?? null,
        contaDestinoId: suggestion.contaDestinoId ?? null,
      });
    } catch (error) {
      const denied = gestaoAccessDeniedResponse(error, {
        userId,
        gestaoId,
        route: "/api/ai/quick-add/save",
        entityId: suggestion.categoriaId ?? suggestion.contaId,
      });
      if (denied) {
        return denied;
      }
      throw error;
    }

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

    try {
      await requireFinancialRefsInGestaoApi({
        gestaoId,
        contaId: suggestion.contaId,
        categoriaId: suggestion.tipo === "transferencia" ? null : suggestion.categoriaId ?? null,
        contaDestinoId: suggestion.contaDestinoId ?? null,
      });
    } catch (error) {
      const denied = gestaoAccessDeniedResponse(error, {
        userId,
        gestaoId,
        route: "/api/ai/quick-add/save",
        entityId: suggestion.categoriaId ?? suggestion.contaId,
      });
      if (denied) {
        return denied;
      }
      throw error;
    }

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
