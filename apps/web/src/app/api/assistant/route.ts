import { NextResponse } from "next/server";
import type {
  AssistantSearchPlan,
  DeleteLancamentosSuggestion,
  LancamentoMeio,
  QuickAddSuggestion,
  UpdateLancamentosDataSuggestion,
  UpdateLancamentosSuggestion,
} from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import {
  composeAssistantReply,
  planAssistantInsight,
  planAssistantSearch,
  refineQuickAddSuggestion,
  refineAssistantSearchPlan,
  stabilizeAssistantSearchPlan,
  suggestCreateAccount,
  suggestKeepAccounts,
  suggestQuickAdd,
  suggestQuickAddBatch,
  suggestRenameAccount,
} from "@/lib/server/ai";
import {
  type LancamentoRow,
  findLargestLancamento,
  findLatestLancamento,
  getAvailableBalance,
  getCashOverview,
  listCategorias,
  listContas,
  listRecentLancamentos,
  searchLancamentos,
  sumLancamentos,
  summarizeLancamentos,
  summarizeLancamentosByConta,
  summarizeLancamentosByDia,
  summarizeLancamentosByCategoria,
  userHasGestaoAccess,
} from "@/lib/server/repository";

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function lancamentoLabel(tipo: "receita" | "despesa" | "ajuste") {
  if (tipo === "receita") {
    return "uma nova receita";
  }

  if (tipo === "despesa") {
    return "uma nova despesa";
  }

  return "um novo ajuste";
}

function meioLabel(meio: LancamentoMeio) {
  if (meio === "credito") {
    return "cartao de credito";
  }

  if (meio === "debito") {
    return "cartao de debito";
  }

  if (meio === "ted_doc") {
    return "TED ou DOC";
  }

  return meio;
}

function chooseSafeIncomeCategory(
  categorias: Awaited<ReturnType<typeof listCategorias>>,
) {
  return (
    categorias.find(
      (item) => normalizeText(item.nome) === "outros" && (item.natureza === "receita" || item.natureza === "ambos"),
    ) ??
    categorias.find(
      (item) =>
        (item.natureza === "receita" || item.natureza === "ambos") &&
        !["salario", "freelance"].includes(normalizeText(item.nome)),
    ) ??
    categorias.find((item) => item.natureza === "receita" || item.natureza === "ambos") ??
    null
  );
}

function chooseContaForIncomePix(
  prompt: string,
  contas: Awaited<ReturnType<typeof listContas>>,
) {
  const normalized = normalizeText(prompt);
  const wantsLucas = /\blucas\b/.test(normalized);
  const nonCredit = contas.filter(
    (item) => item.tipo !== "cartao_credito" && (!wantsLucas || /\blucas\b/.test(normalizeText(item.nome))),
  );

  return (
    nonCredit.find((item) => /\binter\b/.test(normalizeText(item.nome))) ??
    nonCredit[0] ??
    contas.find((item) => item.tipo !== "cartao_credito") ??
    null
  );
}

function enforceQuickAddBusinessRules(
  prompt: string,
  suggestion: QuickAddSuggestion,
  contas: Awaited<ReturnType<typeof listContas>>,
  categorias: Awaited<ReturnType<typeof listCategorias>>,
) {
  const normalized = normalizeText(prompt);
  const next = { ...suggestion };
  const looksLikeIncome = /(recebi|recebimento|ganhei|entrada|receita|deposito|depósito)/.test(normalized);
  const looksLikePix = /\bpix\b|\bpics?\b/.test(normalized);
  const hasExplicitIncomeCategory = /(salario|salário|holerite|freela|freelance|cliente)/.test(normalized);

  if (looksLikeIncome) {
    next.tipo = "receita";
  }

  if (looksLikePix) {
    next.meio = "pix";
  }

  if (looksLikeIncome && looksLikePix) {
    const conta = chooseContaForIncomePix(prompt, contas);

    if (conta) {
      next.contaId = conta.id;
    }
  }

  if (looksLikeIncome && !hasExplicitIncomeCategory) {
    const categoria = chooseSafeIncomeCategory(categorias);

    if (categoria) {
      next.categoriaId = categoria.id;
    }
  }

  return next;
}

function looksLikeQuickAdd(prompt: string) {
  const normalized = prompt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const hasAmount = /\d/.test(normalized);
  const maintenanceWords = /(ajusta|ajuste|corrige|corrija|muda|mude|altera|altere|apaga|apague|remove|remova|exclui|excluir|deleta|deletar)/.test(
    normalized,
  );
  const actionWords =
    /(comprei|paguei|gastei|recebi|ganhei|entrada|receita|despesa|saida|saída|lanca|lancar|registrar|registra|adiciona|adicionar|uber|mercado|farmacia|salario|salário|pix)/.test(
      normalized,
    );
  const questionWords = /(qual|quanto|quais|me mostra|buscar|busca|ultimo|ultima|maior|menor|total)/.test(
    normalized,
  );

  return hasAmount && actionWords && !questionWords && !maintenanceWords;
}

function looksLikeBatchQuickAdd(prompt: string) {
  return looksLikeQuickAdd(prompt) && extractCurrencyAmounts(prompt).length > 1;
}

function looksLikeCreateAccount(prompt: string) {
  const normalized = prompt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const creationWords = /(adiciona|adicione|cria|crie|cadastra|cadastre|abre|abra|nova|novo)/.test(normalized);
  const accountWords = /(conta|cartao|cartão|carteira|poupanca|poupança)/.test(normalized);
  const questionWords = /(qual|quais|quanto|quando|onde|buscar|busca|mostra|ultim)/.test(normalized);
  const financialMovementWords =
    /(entrada|receita|despesa|saida|saída|gasto|ganho|recebi|paguei|gastei|deposito|depósito|pix)/.test(
      normalized,
    );
  const hasAmount = /\d/.test(normalized);

  return creationWords && accountWords && !questionWords && !financialMovementWords && !hasAmount;
}

function looksLikeRenameAccount(prompt: string) {
  const normalized = prompt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return /(altera|alterar|renomeia|renomear|muda|mudar)/.test(normalized) && /\b(para|pra)\b/.test(normalized);
}

function looksLikeKeepAccounts(prompt: string) {
  const normalized = prompt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return (
    /(manter|deixa|deixar|ficar|usa|usar).*(apenas|so|só)/.test(normalized) &&
    mentionsOrigens(normalized)
  );
}

function looksLikeUpdateLancamentos(prompt: string) {
  const normalized = prompt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return (
    /(edita|edite|editar|altera|altere|ajusta|ajuste|corrige|corrija|marca|defina|coloca|coloque)/.test(
      normalized,
    ) &&
    /(lancamento|lancamentos|despesa|despesas|receita|receitas|gasto|gastos|entrada|entradas|compra|compras)/.test(
      normalized,
    )
  );
}

function looksLikeDeleteLancamentos(prompt: string) {
  const normalized = prompt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return (
    /(apaga|apague|remove|remova|exclui|excluir|deleta|deletar)/.test(normalized) &&
    /(lancamento|lancamentos|despesa|despesas|receita|receitas|gasto|gastos|entrada|entradas|compra|compras|pix|pics?)/.test(
      normalized,
    )
  );
}

function looksLikeUpdateLancamentoDate(prompt: string) {
  const normalized = prompt
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  return (
    /(ajusta|ajuste|corrige|corrija|muda|mude|altera|altere)/.test(normalized) &&
    /(lancamento|lancamentos|despesa|despesas|receita|receitas|gasto|gastos|entrada|entradas|compra|compras|pix|pics?)/.test(
      normalized,
    ) &&
    /(\b20\d{2}\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|hoje|ontem|amanha|agora)/.test(normalized)
  );
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(base: Date, amount: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + amount);
  return next;
}

function monthBounds(offset = 0) {
  const base = new Date();
  const start = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const end = new Date(base.getFullYear(), base.getMonth() + offset + 1, 0);

  return {
    from: formatDate(start),
    to: formatDate(end),
  };
}

function weekBounds(offsetWeeks = 0) {
  const base = new Date();
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(base);
  start.setDate(base.getDate() + diffToMonday + offsetWeeks * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    from: formatDate(start),
    to: formatDate(end),
  };
}

function rollingDaysBounds(days: number) {
  const end = new Date();
  const start = shiftDays(end, -(days - 1));

  return {
    from: formatDate(start),
    to: formatDate(end),
  };
}

function detectPeriodFilter(prompt: string) {
  const normalized = normalizeText(prompt);

  if (normalized.includes("semana passada")) {
    return weekBounds(-1);
  }

  if (/(esta semana|essa semana|nessa semana|da semana|na semana|por semana|semanal|semanais|semanis|\bsemana\b)/.test(normalized)) {
    return weekBounds(0);
  }

  if (normalized.includes("ultimos 7 dias") || normalized.includes("últimos 7 dias")) {
    return rollingDaysBounds(7);
  }

  if (normalized.includes("mes passado")) {
    return monthBounds(-1);
  }

  if (/(este mes|esse mes|nesse mes|do mes|no mes|por mes|mensal|mensais)/.test(normalized)) {
    return monthBounds(0);
  }

  if (normalized.includes("hoje")) {
    const today = formatDate(new Date());
    return { from: today, to: today };
  }

  if (normalized.includes("ontem")) {
    const yesterday = formatDate(shiftDays(new Date(), -1));
    return { from: yesterday, to: yesterday };
  }

  return null;
}

function periodLabel(prompt: string) {
  const normalized = normalizeText(prompt);

  if (normalized.includes("semana passada")) return "na semana passada";
  if (/(esta semana|essa semana|nessa semana|da semana|na semana|por semana|semanal|semanais|semanis|\bsemana\b)/.test(normalized)) {
    return "nesta semana";
  }
  if (normalized.includes("ultimos 7 dias") || normalized.includes("últimos 7 dias")) return "nos ultimos 7 dias";
  if (normalized.includes("mes passado")) return "no mes passado";
  if (/(este mes|esse mes|nesse mes|do mes|no mes|por mes|mensal|mensais)/.test(normalized)) {
    return "neste mes";
  }
  if (normalized.includes("hoje")) return "hoje";
  if (normalized.includes("ontem")) return "ontem";

  return "no periodo consultado";
}

function timeframeLabel(
  timeframe: "all_time" | "today" | "yesterday" | "this_week" | "last_week" | "last_7_days" | "this_month" | "last_month",
) {
  if (timeframe === "today") return "hoje";
  if (timeframe === "yesterday") return "ontem";
  if (timeframe === "this_week") return "nesta semana";
  if (timeframe === "last_week") return "na semana passada";
  if (timeframe === "last_7_days") return "nos ultimos 7 dias";
  if (timeframe === "this_month") return "neste mes";
  if (timeframe === "last_month") return "no mes passado";
  return "no periodo consultado";
}

function resolvePeriodLabel(
  prompt: string,
  fallbackTimeframe: "all_time" | "today" | "yesterday" | "this_week" | "last_week" | "last_7_days" | "this_month" | "last_month",
) {
  const label = periodLabel(prompt);
  return label === "no periodo consultado" ? timeframeLabel(fallbackTimeframe) : label;
}

const PERCENTAGE_WORDS: Record<string, number> = {
  cinco: 5,
  dez: 10,
  quinze: 15,
  vinte: 20,
  vinteecinco: 25,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
};

function extractRequestedPercentage(prompt: string) {
  const normalized = normalizeText(prompt);
  const percentMatch = normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);

  if (percentMatch?.[1]) {
    const parsed = Number(percentMatch[1].replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : null;
  }

  const porCentoMatch = normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*por cento/);

  if (porCentoMatch?.[1]) {
    const parsed = Number(porCentoMatch[1].replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : null;
  }

  const wordMatch = normalized.match(
    /\b(cinco|dez|quinze|vinte(?: e cinco)?|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem)\b por cento/,
  );

  if (!wordMatch?.[1]) {
    return null;
  }

  return PERCENTAGE_WORDS[wordMatch[1].replace(/\s+/g, "")] ?? null;
}

function inferAnalyticalTipo(prompt: string) {
  const normalized = normalizeText(prompt);

  if (/(ganhei|ganho|ganhos|receita|receitas|entrada|entradas|recebi|recebimentos)/.test(normalized)) {
    return "receita" as const;
  }

  if (/(gastei|gasto|gastos|despesa|despesas|saida|saidas|paguei|pagamos)/.test(normalized)) {
    return "despesa" as const;
  }

  return undefined;
}

function inferProjectionMetric(prompt: string) {
  const normalized = normalizeText(prompt);

  if (/(saldo|sobrar|sobra|quanto dinheiro|caixa)/.test(normalized)) {
    return "saldo" as const;
  }

  return inferAnalyticalTipo(prompt) ?? "receita";
}

function looksLikePercentageQuestion(prompt: string) {
  return extractRequestedPercentage(prompt) !== null && Boolean(inferAnalyticalTipo(prompt));
}

function looksLikeAverageQuestion(prompt: string) {
  const normalized = normalizeText(prompt);
  return /(media|média)/.test(normalized) && Boolean(inferAnalyticalTipo(prompt));
}

function looksLikeTotalQuestion(prompt: string) {
  const normalized = normalizeText(prompt);
  return (
    /(quanto gastei|quanto gastamos|quanto recebi|quanto recebemos|quantos recebi|quantos recebemos|quanto entrou|qual minha receita|qual minha despesa|total gasto|total de receitas|total de entradas)/.test(
      normalized,
    ) &&
    /(semana|semanal|semanais|semanis|mes|mês|mensal|hoje|ontem|cartao|cartão|credito|crédito|debito|débito|pix|mercado|ivaipora|ivaiporã|origem|conta)/.test(
      normalized,
    )
  );
}

function looksLikeTopExpenseListQuestion(prompt: string) {
  const normalized = normalizeText(prompt);
  return /(quais.*maiores gastos|quais.*maiores despesas|meus maiores gastos|minhas maiores despesas|top gastos|top despesas)/.test(
    normalized,
  );
}

function looksLikeProjectionQuestion(prompt: string) {
  const normalized = normalizeText(prompt);
  return (
    /(nesse ritmo|neste ritmo|se continuar|se continuarmos|projecao|projeção|cenario|cenário|simular|simulação)/.test(
      normalized,
    ) &&
    /(ganho|ganhos|receita|receitas|entrada|entradas|gasto|gastos|despesa|despesas|saldo|sobrar|sobra|dinheiro)/.test(
      normalized,
    )
  );
}

function daysBetweenInclusive(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / 86_400_000) + 1);
}

function minDateString(left: string, right: string) {
  return left <= right ? left : right;
}

function looksLikeDirectSummary(prompt: string) {
  const normalized = normalizeText(prompt);
  return /(resumo|resumir|resuma|sumario|sumário|balanco|balanço|visao geral|visão geral)/.test(normalized);
}

function looksLikeTopSpend(prompt: string) {
  const normalized = normalizeText(prompt);
  return (
    /(com o que .*gast(ei|amos) mais|aonde .*gast(ei|amos) mais|onde .*gast(ei|amos) mais|qual foi o maior gasto|maior gasto|gasto mais alto|despesa mais alta)/.test(
      normalized,
    ) ||
    (/(gastei|gastamos) mais/.test(normalized) && /(semana|mes|mês|hoje|ontem|dias)/.test(normalized))
  );
}

function looksLikeRiskQuestion(prompt: string) {
  const normalized = normalizeText(prompt);
  return /(tomar cuidado|ficar atento|preocupa|preocupando|qual gasto.*cuidado|onde devo cortar|maior risco)/.test(
    normalized,
  );
}

function looksLikeIncomeSourceSummary(prompt: string) {
  const normalized = normalizeText(prompt);
  return /(entrada|entradas|receita|receitas|ganhei|recebi)/.test(normalized) && /(por onde|de onde|vieram|veio|origem|origens)/.test(normalized);
}

function looksLikeTopSpendDay(prompt: string) {
  const normalized = normalizeText(prompt);
  return /(qual o dia|que dia|dia que).*(gast(ei|amos) mais|maior gasto|mais dinheiro)/.test(normalized);
}

function detectRequestedMeio(prompt: string): LancamentoMeio | null {
  const normalized = normalizeText(prompt);

  if (/\bpix\b|\bpics?\b/.test(normalized)) return "pix";
  if (/(cartao de credito|cartao credito|credito|crédito)/.test(normalized)) return "credito";
  if (/(cartao de debito|cartao debito|debito|débito)/.test(normalized)) return "debito";
  if (/(dinheiro|especie|espécie)/.test(normalized)) return "dinheiro";
  if (/(boleto)/.test(normalized)) return "boleto";
  if (/(ted|doc)/.test(normalized)) return "ted_doc";
  if (/(transferencia|transferência)/.test(normalized)) return "transferencia";
  if (/\boutro\b/.test(normalized)) return "outro";

  return null;
}

function extractCurrencyAmount(prompt: string) {
  const match = prompt.match(/(\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+[.,]\d{1,2})/);

  if (!match?.[1]) {
    return null;
  }

  const raw = match[1].replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(raw);

  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractCurrencyAmounts(prompt: string) {
  const matches = prompt.match(/\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+[.,]\d{1,2}/g) ?? [];

  return matches
    .map((chunk) => Number(chunk.replace(/\s/g, "").replace(/\./g, "").replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function extractReferenceYear(prompt: string) {
  const match = prompt.match(/\b(20\d{2})\b/);
  return match?.[1] ?? null;
}

function extractTargetCompetenciaDate(prompt: string) {
  const normalized = normalizeText(prompt);

  if (normalized.includes("hoje") || normalized.includes("agora")) {
    return formatDate(new Date());
  }

  if (normalized.includes("ontem")) {
    return formatDate(shiftDays(new Date(), -1));
  }

  if (normalized.includes("amanha")) {
    return formatDate(shiftDays(new Date(), 1));
  }

  const isoMatch = prompt.match(/\b(20\d{2}-\d{2}-\d{2})\b/);

  if (isoMatch?.[1]) {
    return isoMatch[1];
  }

  const brMatch = prompt.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);

  if (brMatch?.[1] && brMatch?.[2]) {
    const day = brMatch[1].padStart(2, "0");
    const month = brMatch[2].padStart(2, "0");
    const year = brMatch[3] && brMatch[3].length === 4 ? brMatch[3] : String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }

  const yearOnly = extractReferenceYear(prompt);

  if (yearOnly) {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${yearOnly}-${month}-${day}`;
  }

  return null;
}

function normalizeFuzzyText(value: string) {
  return normalizeText(value)
    .replace(/\bpics?\b/g, "pix")
    .replace(/\bcartao\b/g, "cartao")
    .replace(/\s+/g, " ")
    .trim();
}

function transactionReferenceTokens(prompt: string) {
  const cleaned = normalizeFuzzyText(prompt)
    .replace(
      /\b(apaga|apague|remove|remova|exclui|excluir|deleta|deletar|ajusta|ajuste|corrige|corrija|muda|mude|altera|altere|as|os|a|o|um|uma|de|do|da|para|pra|em|no|na|meio|data|ano|lancamento|lancamentos|despesa|despesas|receita|receitas|gasto|gastos|entrada|entradas|compra|compras|hoje|ontem|amanha|agora|pix|cartao|credito|debito)\b/g,
      " ",
    )
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+[.,]\d{1,2}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.split(" ").filter((token) => token.length >= 3);
}

function scoreLancamentoMatch(input: {
  prompt: string;
  lancamento: LancamentoRow;
}) {
  const normalizedPrompt = normalizeFuzzyText(input.prompt);
  const normalizedLancamento = normalizeFuzzyText(
    `${input.lancamento.descricao} ${input.lancamento.categoria_nome ?? ""} ${input.lancamento.conta_nome}`,
  );
  const tokens = transactionReferenceTokens(input.prompt);
  const amount = extractCurrencyAmount(input.prompt);
  const year = extractReferenceYear(input.prompt);
  const tipo = extractUpdateTipo(input.prompt);
  let score = 0;

  if (tipo && input.lancamento.tipo === tipo) {
    score += 4;
  }

  if (amount && Math.abs(Number(input.lancamento.valor_total) - amount) < 0.001) {
    score += 5;
  }

  if (year && input.lancamento.competencia_data.startsWith(year)) {
    score += 4;
  }

  if (normalizedPrompt.includes("pix") && normalizeFuzzyText(input.lancamento.descricao).includes("pix")) {
    score += 2;
  }

  for (const token of tokens) {
    if (normalizedLancamento.includes(token)) {
      score += 2;
    }
  }

  return score;
}

function findMatchingLancamentos(prompt: string, results: LancamentoRow[]) {
  const ranked = results
    .map((item) => ({ item, score: scoreLancamentoMatch({ prompt, lancamento: item }) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const topScore = ranked[0]?.score ?? 0;

  if (topScore === 0) {
    return [];
  }

  return ranked.filter((item) => item.score >= Math.max(4, topScore - 1)).map((item) => item.item);
}

function buildUpdateLancamentosDataSuggestion(input: {
  lancamentos: LancamentoRow[];
  competenciaData: string;
}): UpdateLancamentosDataSuggestion | null {
  const filtrados = input.lancamentos.filter((item) => item.competencia_data !== input.competenciaData);

  if (filtrados.length === 0) {
    return null;
  }

  return {
    lancamentoIds: filtrados.map((item) => item.id),
    quantidade: filtrados.length,
    competenciaData: input.competenciaData,
    resumo: `Atualizar ${filtrados.length} lancamento(s) para ${input.competenciaData}`,
    confianca: 0.88,
    motivo: "Interpretei o pedido como ajuste da data de lancamentos existentes.",
  };
}

function buildDeleteLancamentosSuggestion(input: {
  lancamentos: LancamentoRow[];
}): DeleteLancamentosSuggestion | null {
  if (input.lancamentos.length === 0) {
    return null;
  }

  return {
    lancamentoIds: input.lancamentos.map((item) => item.id),
    quantidade: input.lancamentos.length,
    resumo: `Apagar ${input.lancamentos.length} lancamento(s)`,
    confianca: 0.9,
    motivo: "Interpretei o pedido como exclusao de lancamentos existentes.",
  };
}

function extractUpdateTipo(prompt: string) {
  const normalized = normalizeText(prompt);

  if (/(receita|receitas|entrada|entradas|ganho|ganhos)/.test(normalized)) {
    return "receita" as const;
  }

  if (/(despesa|despesas|gasto|gastos|compra|compras)/.test(normalized)) {
    return "despesa" as const;
  }

  return undefined;
}

function extractUpdateSearchText(prompt: string) {
  const cleaned = normalizeText(prompt)
    .replace(
      /\b(edita|edite|editar|altera|altere|ajusta|ajuste|corrige|corrija|marca|defina|coloca|coloque|as|os|a|o|com|como|para|pra|meio|lancamento|lancamentos|despesa|despesas|receita|receitas|gasto|gastos|entrada|entradas|compra|compras|cartao de credito|cartao credito|credito|cartao de debito|cartao debito|debito|pix|pics?|dinheiro|boleto|ted|doc|transferencia|outro)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 3 ? cleaned : undefined;
}

function buildUpdateLancamentosSuggestion(input: {
  prompt: string;
  resultados: LancamentoRow[];
  meio: LancamentoMeio;
}): UpdateLancamentosSuggestion | null {
  const filtrados = input.resultados.filter((item) => item.meio !== input.meio);

  if (filtrados.length === 0) {
    return null;
  }

  return {
    lancamentoIds: filtrados.map((item) => item.id),
    quantidade: filtrados.length,
    meio: input.meio,
    filtroResumo: normalizeText(input.prompt),
    confianca: 0.9,
    motivo: "Interpretei o pedido como atualizacao em lote do meio dos lancamentos encontrados.",
  };
}

function conversationalReply(prompt: string) {
  const normalized = normalizeText(prompt);

  if (/^(oi|ola|olá|opa|e ai|eai|bom dia|boa tarde|boa noite)$/.test(normalized)) {
    return "Oi. Posso te ajudar a buscar lancamentos, resumir gastos ou montar um novo lancamento a partir do que voce escrever.";
  }

  if (/(o que voce faz|como voce funciona|como funciona|o que consegue fazer|me ajuda|ajuda)/.test(normalized)) {
    return 'Consigo fazer tres coisas principais: 1. buscar e resumir seus lancamentos, 2. responder perguntas como "qual foi o ultimo lancamento?" ou "quanto gastei este mes?", 3. montar rascunhos de novos lancamentos a partir de frases como "mercado 182,90 hoje".';
  }

  if (/(obrigado|valeu|show|boa|perfeito|top)/.test(normalized)) {
    return "Certo. Quando quiser, pode me pedir uma busca, um resumo ou um novo lancamento.";
  }

  return null;
}

function mentionsLancamentos(normalized: string) {
  return /(lancamentos|movimentacoes|movimentação|movimentacoes|compras|gastos|despesas|receitas)/.test(
    normalized,
  );
}

function mentionsOrigens(normalized: string) {
  return (
    /(origens|origem|contas|conta cadastrada|contas cadastradas)/.test(normalized) ||
    /(formas? de pagamento|meios? de pagamento)/.test(normalized) ||
    /(cartoes|cartao|cartões|cartão|pix|debito|débito)/.test(normalized)
  );
}

function looksLikeInventoryQuestion(prompt: string) {
  const normalized = normalizeText(prompt);

  if (
    looksLikeTotalQuestion(prompt) ||
    looksLikeTopSpend(prompt) ||
    looksLikeTopExpenseListQuestion(prompt) ||
    looksLikeTopSpendDay(prompt) ||
    looksLikeIncomeSourceSummary(prompt)
  ) {
    return false;
  }

  return (
    /(quais|qual|que|listar|lista|mostra|me mostra|temos|tem|ha|há|existem|existe|cadastrado|cadastradas|cadastrados)/.test(
      normalized,
    ) &&
    (mentionsLancamentos(normalized) || mentionsOrigens(normalized))
  );
}

function relativeDateLabel(dateText: string) {
  const target = new Date(`${dateText}T00:00:00`);
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterday = new Date(current);
  yesterday.setDate(yesterday.getDate() - 1);

  if (target.getTime() === current.getTime()) {
    return "hoje";
  }

  if (target.getTime() === yesterday.getTime()) {
    return "ontem";
  }

  return null;
}

function followUpAboutPreviousResult(prompt: string, previousResults?: LancamentoRow[]) {
  if (!previousResults?.length) {
    return null;
  }

  const normalized = normalizeText(prompt);
  const item = previousResults[0];

  if (!item) {
    return null;
  }

  if (/(quando|que dia|qual dia|data|foi hoje ou ontem|hoje ou ontem|lancei ele hoje|lancei ele ontem)/.test(normalized)) {
    const relative = relativeDateLabel(item.competencia_data);

    return {
      kind: "search" as const,
      provider: "local" as const,
      answer: relative
        ? `Esse lancamento esta com data ${item.competencia_data}. Pelo registro atual, ele foi ${relative}.`
        : `Esse lancamento esta com data ${item.competencia_data}. Pelo registro atual, ele nao foi hoje nem ontem.`,
      results: [item],
    };
  }

  if (/(qual valor|quanto foi|valor dele|valor desse)/.test(normalized)) {
    return {
      kind: "search" as const,
      provider: "local" as const,
      answer: `Esse lancamento foi de ${money(item.valor_total)}.`,
      results: [item],
    };
  }

  if (/(qual conta|em qual conta|foi em qual conta)/.test(normalized)) {
    return {
      kind: "search" as const,
      provider: "local" as const,
      answer: `Esse lancamento foi registrado na conta ${item.conta_nome}.`,
      results: [item],
    };
  }

  return null;
}

function applyInsightTimeframeFilters(
  prompt: string,
  filters: AssistantSearchPlan["filters"],
  timeframe:
    | "all_time"
    | "today"
    | "yesterday"
    | "this_week"
    | "last_week"
    | "last_7_days"
    | "this_month"
    | "last_month",
) {
  const period = detectPeriodFilter(prompt);

  if (period) {
    return {
      ...filters,
      dateFrom: period.from,
      dateTo: period.to,
    };
  }

  if (timeframe === "today") {
    const today = formatDate(new Date());
    return { ...filters, dateFrom: today, dateTo: today };
  }

  if (timeframe === "yesterday") {
    const yesterday = formatDate(shiftDays(new Date(), -1));
    return { ...filters, dateFrom: yesterday, dateTo: yesterday };
  }

  if (timeframe === "this_week") {
    const bounds = weekBounds(0);
    return { ...filters, dateFrom: bounds.from, dateTo: bounds.to };
  }

  if (timeframe === "last_week") {
    const bounds = weekBounds(-1);
    return { ...filters, dateFrom: bounds.from, dateTo: bounds.to };
  }

  if (timeframe === "last_7_days") {
    const bounds = rollingDaysBounds(7);
    return { ...filters, dateFrom: bounds.from, dateTo: bounds.to };
  }

  if (timeframe === "this_month") {
    const bounds = monthBounds(0);
    return { ...filters, dateFrom: bounds.from, dateTo: bounds.to };
  }

  if (timeframe === "last_month") {
    const bounds = monthBounds(-1);
    return { ...filters, dateFrom: bounds.from, dateTo: bounds.to };
  }

  return filters;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    prompt?: string;
    gestaoId?: number;
    previousPrompt?: string;
    previousAnswer?: string;
    previousKind?:
      | "search"
      | "quick_add"
      | "quick_add_batch"
      | "transactions_update"
      | "transactions_date_update"
      | "transactions_delete"
      | "info";
    previousResults?: LancamentoRow[];
    previousPlan?: AssistantSearchPlan;
    previousSuggestion?: QuickAddSuggestion;
  };
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

  async function narrate(input: {
    fallback: string;
    facts?: string[];
    style?: "chat" | "result" | "not_found";
    baseProvider?: "groq" | "openai" | "local";
  }) {
    const response = await composeAssistantReply({
      prompt: prompt ?? "",
      fallback: input.fallback,
      facts: input.facts,
      style: input.style,
    });

    return {
      answer: response.answer,
      provider:
        response.provider === "local" && input.baseProvider
          ? input.baseProvider
          : response.provider,
    };
  }

  const conversational = conversationalReply(prompt);

  if (conversational) {
    const narrated = await narrate({
      fallback: conversational,
      style: "chat",
      facts: [
        "O assistente pode buscar e resumir lancamentos.",
        "O assistente pode montar rascunhos de novos lancamentos.",
        "O assistente pode responder perguntas sobre saldo, entradas, despesas e origens.",
      ],
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "info",
      provider: narrated.provider,
      answer: narrated.answer,
      results: [],
    });
  }

  const promptWithContext =
    body.previousPrompt && body.previousAnswer
      ? `Contexto anterior do chat:
Pergunta anterior: ${body.previousPrompt}
Resposta anterior: ${body.previousAnswer}

Pergunta atual:
${prompt}`
      : prompt;

  const followUp = followUpAboutPreviousResult(prompt, body.previousKind === "search" ? body.previousResults : undefined);

  if (followUp) {
    return NextResponse.json(followUp);
  }

  const refinedQuickAdd =
    body.previousKind === "quick_add"
      ? refineQuickAddSuggestion(prompt, body.previousSuggestion, contas, categorias)
      : null;

  if (refinedQuickAdd) {
    const conta = contas.find((item) => item.id === refinedQuickAdd.contaId)?.nome ?? "origem selecionada";
    const categoria =
      categorias.find((item) => item.id === refinedQuickAdd.categoriaId)?.nome ?? "categoria selecionada";
    const meio = refinedQuickAdd.meio ? `, meio ${refinedQuickAdd.meio}` : "";

    return NextResponse.json({
      kind: "quick_add",
      provider: "local",
      answer: `Atualizei o rascunho para ${lancamentoLabel(refinedQuickAdd.tipo)} de ${money(refinedQuickAdd.valorTotal)} em ${refinedQuickAdd.competenciaData}, na origem ${conta}${meio}, categoria ${categoria}. Se estiver certo, confirme para salvar.`,
      suggestion: refinedQuickAdd,
    });
  }

  if (looksLikeInventoryQuestion(prompt)) {
    const normalized = normalizeText(prompt);
    const wantsLancamentos = mentionsLancamentos(normalized);
    const wantsContas = mentionsOrigens(normalized);
    const lancamentos = wantsLancamentos ? await listRecentLancamentos(gestaoId) : [];
    const partes: string[] = [];

    if (wantsContas) {
      if (contas.length > 0) {
        partes.push(`Origens da gestao: ${contas.map((conta) => conta.nome).join(", ")}.`);
      } else {
        partes.push("Nao encontrei origens cadastradas nesta gestao.");
      }
    }

    if (wantsLancamentos) {
      if (lancamentos.length > 0) {
        partes.push(
          `Lancamentos recentes: ${lancamentos
            .slice(0, 5)
            .map((item) => `${item.descricao} em ${item.competencia_data}`)
            .join(", ")}.`,
        );
      } else {
        partes.push("Nao encontrei lancamentos cadastrados nesta gestao.");
      }
    }

    const fallback = partes.join(" ");
    const narrated = await narrate({
      fallback,
      style: "result",
      facts: [
        wantsContas ? `Quantidade de origens ativas: ${contas.length}.` : "",
        wantsLancamentos ? `Quantidade de lancamentos recentes considerados: ${lancamentos.length}.` : "",
      ].filter(Boolean),
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results: lancamentos,
    });
  }

  if (looksLikeDirectSummary(prompt)) {
    const period = detectPeriodFilter(prompt) ?? weekBounds(0);
    const resumo = await summarizeLancamentos({
      gestaoId,
      dateFrom: period.from,
      dateTo: period.to,
    });
    const results = await searchLancamentos({
      gestaoId,
      dateFrom: period.from,
      dateTo: period.to,
    });

    const fallback =
      resumo.quantidade > 0
        ? `Resumo ${periodLabel(prompt)}: ${resumo.quantidade} lancamento(s), ${money(resumo.receitas)} em receitas, ${money(resumo.despesas)} em despesas e saldo de ${money(resumo.saldo)}.`
        : `Nao encontrei lancamentos para resumir ${periodLabel(prompt)}.`;
    const narrated = await narrate({
      fallback,
      style: resumo.quantidade > 0 ? "result" : "not_found",
      facts: [
        `Periodo consultado: ${period.from} ate ${period.to}.`,
        `Quantidade: ${resumo.quantidade}.`,
        `Receitas: ${money(resumo.receitas)}.`,
        `Despesas: ${money(resumo.despesas)}.`,
        `Saldo: ${money(resumo.saldo)}.`,
      ],
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results,
    });
  }

  if (looksLikeTopSpend(prompt)) {
    const period = detectPeriodFilter(prompt) ?? weekBounds(0);
    const categoriasResumo = await summarizeLancamentosByCategoria({
      gestaoId,
      tipo: "despesa",
      dateFrom: period.from,
      dateTo: period.to,
    });
    const topCategoria = categoriasResumo[0];
    const maiorDespesa = await findLargestLancamento({
      gestaoId,
      tipo: "despesa",
      dateFrom: period.from,
      dateTo: period.to,
    });
    const results = await searchLancamentos({
      gestaoId,
      tipo: "despesa",
      dateFrom: period.from,
      dateTo: period.to,
    });

    const fallback =
      topCategoria && maiorDespesa
        ? `Seu maior foco de gasto ${periodLabel(prompt)} foi ${topCategoria.categoria_nome ?? "Sem categoria"}, somando ${money(topCategoria.total)} em ${topCategoria.quantidade} lancamento(s). A maior despesa individual foi "${maiorDespesa.descricao}" de ${money(maiorDespesa.valor_total)}.`
        : `Nao encontrei despesas ${periodLabel(prompt)}.`;
    const narrated = await narrate({
      fallback,
      style: topCategoria && maiorDespesa ? "result" : "not_found",
      facts: [
        `Periodo consultado: ${period.from} ate ${period.to}.`,
        topCategoria ? `Categoria com maior gasto: ${topCategoria.categoria_nome} (${money(topCategoria.total)}).` : "",
        maiorDespesa ? `Maior despesa individual: ${maiorDespesa.descricao} (${money(maiorDespesa.valor_total)}).` : "",
      ].filter(Boolean),
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results,
    });
  }

  if (looksLikeTopExpenseListQuestion(prompt)) {
    const period = detectPeriodFilter(prompt) ?? monthBounds(0);
    const results = await searchLancamentos({
      gestaoId,
      tipo: "despesa",
      meio: detectRequestedMeio(prompt) ?? undefined,
      dateFrom: period.from,
      dateTo: period.to,
    });
    const topExpenses = [...results]
      .sort((left, right) => Number(right.valor_total) - Number(left.valor_total))
      .slice(0, 5);

    const fallback =
      topExpenses.length > 0
        ? `Seus maiores gastos ${periodLabel(prompt)} foram ${topExpenses
            .map((item) => `"${item.descricao}" com ${money(item.valor_total)} em ${item.competencia_data}`)
            .join(" · ")}.`
        : `Nao encontrei despesas ${periodLabel(prompt)}.`;
    const narrated = await narrate({
      fallback,
      style: topExpenses.length > 0 ? "result" : "not_found",
      facts: topExpenses.map(
        (item) => `${item.descricao} em ${item.competencia_data}, ${money(item.valor_total)}, origem ${item.conta_nome}.`,
      ),
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results: topExpenses,
    });
  }

  if (looksLikeIncomeSourceSummary(prompt)) {
    const period = detectPeriodFilter(prompt) ?? monthBounds(0);
    const resumo = await summarizeLancamentos({
      gestaoId,
      tipo: "receita",
      dateFrom: period.from,
      dateTo: period.to,
    });
    const porOrigem = await summarizeLancamentosByConta({
      gestaoId,
      tipo: "receita",
      dateFrom: period.from,
      dateTo: period.to,
    });
    const results = await searchLancamentos({
      gestaoId,
      tipo: "receita",
      dateFrom: period.from,
      dateTo: period.to,
    });

    const fallback =
      resumo.quantidade > 0
        ? `Vocês tiveram ${money(resumo.receitas)} em entradas ${periodLabel(prompt)}. ${porOrigem
            .map((item) => `${item.conta_nome}: ${money(item.total)}`)
            .join(" · ")}.`
        : `Nao encontrei entradas ${periodLabel(prompt)}.`;
    const narrated = await narrate({
      fallback,
      style: resumo.quantidade > 0 ? "result" : "not_found",
      facts: [
        `Periodo consultado: ${period.from} ate ${period.to}.`,
        `Entradas totais: ${money(resumo.receitas)}.`,
        ...porOrigem.map((item) => `${item.conta_nome}: ${money(item.total)}.`),
      ],
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results,
    });
  }

  if (looksLikeTotalQuestion(prompt)) {
    const period = detectPeriodFilter(prompt) ?? monthBounds(0);
    const tipo = inferAnalyticalTipo(prompt) ?? "despesa";
    const requestedMeio = detectRequestedMeio(prompt) ?? undefined;
    const resumo = await summarizeLancamentos({
      gestaoId,
      tipo,
      meio: requestedMeio,
      dateFrom: period.from,
      dateTo: period.to,
      text: undefined,
    });
    const results = await searchLancamentos({
      gestaoId,
      tipo,
      meio: requestedMeio,
      dateFrom: period.from,
      dateTo: period.to,
      text: undefined,
    });
    const total = Number(tipo === "despesa" ? resumo.despesas ?? 0 : resumo.receitas ?? 0);
    const meioTexto = requestedMeio ? ` por ${meioLabel(requestedMeio)}` : "";
    const texto = normalizeText(prompt);
    const hasContextText = /(ivaipora|ivaiporã|mercado)/.test(texto);
    const contextResults =
      hasContextText
        ? await searchLancamentos({
            gestaoId,
            tipo,
            meio: requestedMeio,
            dateFrom: period.from,
            dateTo: period.to,
            text: /ivaipor/.test(texto) ? "Ivaipor" : /mercado/.test(texto) ? "Mercado" : undefined,
          })
        : results;
    const contextTotal = hasContextText
      ? contextResults.reduce((sum, item) => sum + Number(item.valor_total), 0)
      : total;
    const subject =
      hasContextText && /ivaipor/.test(texto)
        ? "no Ivaipora"
        : hasContextText && /mercado/.test(texto)
          ? "com mercado"
          : tipo === "despesa"
            ? "em gastos"
            : "em receitas";

    const fallback =
      contextResults.length > 0
        ? `Vocês tiveram ${money(contextTotal)} ${subject}${meioTexto} ${periodLabel(prompt)}.`
        : `Nao encontrei ${tipo === "despesa" ? "despesas" : "receitas"}${meioTexto} ${periodLabel(prompt)}.`;
    const narrated = await narrate({
      fallback,
      style: contextResults.length > 0 ? "result" : "not_found",
      facts: [
        `Periodo consultado: ${period.from} ate ${period.to}.`,
        `Total encontrado: ${money(contextTotal)}.`,
        requestedMeio ? `Meio filtrado: ${meioLabel(requestedMeio)}.` : "",
      ].filter(Boolean),
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results: contextResults,
    });
  }

  if (looksLikeTopSpendDay(prompt)) {
    const period = detectPeriodFilter(prompt) ?? weekBounds(0);
    const porDia = await summarizeLancamentosByDia({
      gestaoId,
      tipo: "despesa",
      dateFrom: period.from,
      dateTo: period.to,
    });
    const topDia = porDia[0];
    const results = await searchLancamentos({
      gestaoId,
      tipo: "despesa",
      dateFrom: period.from,
      dateTo: period.to,
    });

    const fallback =
      topDia
        ? `O dia com mais gastos ${periodLabel(prompt)} foi ${topDia.competencia_data}, com ${money(topDia.total)} em ${topDia.quantidade} lancamento(s).`
        : `Nao encontrei despesas ${periodLabel(prompt)}.`;
    const narrated = await narrate({
      fallback,
      style: topDia ? "result" : "not_found",
      facts: [
        `Periodo consultado: ${period.from} ate ${period.to}.`,
        topDia ? `Dia com maior gasto: ${topDia.competencia_data}.` : "",
        topDia ? `Total gasto nesse dia: ${money(topDia.total)}.` : "",
      ].filter(Boolean),
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results,
    });
  }

  if (looksLikeRiskQuestion(prompt)) {
    const period = detectPeriodFilter(prompt) ?? monthBounds(0);
    const categoriasResumo = await summarizeLancamentosByCategoria({
      gestaoId,
      tipo: "despesa",
      dateFrom: period.from,
      dateTo: period.to,
    });
    const topCategoria = categoriasResumo[0];
    const segundaCategoria = categoriasResumo[1];
    const results = await searchLancamentos({
      gestaoId,
      tipo: "despesa",
      dateFrom: period.from,
      dateTo: period.to,
    });

    const fallback =
      topCategoria
        ? `Seu principal ponto de atencao ${periodLabel(prompt)} e ${topCategoria.categoria_nome ?? "Sem categoria"}, com ${money(topCategoria.total)}. ${
            segundaCategoria
              ? `Depois vem ${segundaCategoria.categoria_nome ?? "Sem categoria"}, com ${money(segundaCategoria.total)}.`
              : ""
          }`
        : `Ainda nao encontrei despesas suficientes para apontar um risco ${periodLabel(prompt)}.`;
    const narrated = await narrate({
      fallback,
      style: topCategoria ? "result" : "not_found",
      facts: [
        `Periodo consultado: ${period.from} ate ${period.to}.`,
        topCategoria ? `Maior concentracao de gasto: ${topCategoria.categoria_nome} (${money(topCategoria.total)}).` : "",
        segundaCategoria ? `Segundo maior grupo de gasto: ${segundaCategoria.categoria_nome} (${money(segundaCategoria.total)}).` : "",
      ].filter(Boolean),
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results,
    });
  }

  if (looksLikePercentageQuestion(prompt)) {
    const period = detectPeriodFilter(prompt) ?? monthBounds(0);
    const label = resolvePeriodLabel(prompt, "this_month");
    const tipo = inferAnalyticalTipo(prompt) ?? "receita";
    const percentual = extractRequestedPercentage(prompt) ?? 10;
    const resumo = await summarizeLancamentos({
      gestaoId,
      tipo,
      dateFrom: period.from,
      dateTo: period.to,
    });
    const total = Number(tipo === "despesa" ? resumo.despesas ?? 0 : resumo.receitas ?? 0);
    const resultado = total * (percentual / 100);
    const results = await searchLancamentos({
      gestaoId,
      tipo,
      dateFrom: period.from,
      dateTo: period.to,
    });
    const sujeito = tipo === "despesa" ? "gastos" : "ganhos";

    const fallback =
      results.length > 0
        ? `Vocês tiveram ${money(total)} em ${sujeito} ${label}. ${percentual}% disso é ${money(resultado)}.`
        : `Nao encontrei ${tipo === "despesa" ? "despesas" : "receitas"} ${label} para calcular esse percentual.`;
    const narrated = await narrate({
      fallback,
      style: results.length > 0 ? "result" : "not_found",
      facts: [
        `Periodo consultado: ${period.from} ate ${period.to}.`,
        `Base considerada: ${money(total)} em ${sujeito}.`,
        `${percentual}% do total: ${money(resultado)}.`,
      ],
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results,
    });
  }

  if (looksLikeAverageQuestion(prompt)) {
    const period = detectPeriodFilter(prompt) ?? monthBounds(0);
    const label = resolvePeriodLabel(prompt, "this_month");
    const tipo = inferAnalyticalTipo(prompt) ?? "receita";
    const totalRow = await sumLancamentos({
      gestaoId,
      tipo,
      dateFrom: period.from,
      dateTo: period.to,
    });
    const total = Number(totalRow.total ?? 0);
    const quantidade = Number(totalRow.quantidade ?? 0);
    const dias = daysBetweenInclusive(period.from, period.to);
    const mediaPorLancamento = quantidade > 0 ? total / quantidade : 0;
    const mediaPorDia = dias > 0 ? total / dias : 0;
    const results = await searchLancamentos({
      gestaoId,
      tipo,
      dateFrom: period.from,
      dateTo: period.to,
    });
    const sujeito = tipo === "despesa" ? "gastos" : "ganhos";

    const fallback =
      quantidade > 0
        ? `Vocês somaram ${money(total)} em ${sujeito} ${label}. Isso dá media de ${money(mediaPorLancamento)} por lancamento e ${money(mediaPorDia)} por dia.`
        : `Nao encontrei ${tipo === "despesa" ? "despesas" : "receitas"} ${label} para calcular media.`;
    const narrated = await narrate({
      fallback,
      style: quantidade > 0 ? "result" : "not_found",
      facts: [
        `Periodo consultado: ${period.from} ate ${period.to}.`,
        `Quantidade de lancamentos: ${quantidade}.`,
        `Media por lancamento: ${money(mediaPorLancamento)}.`,
        `Media por dia: ${money(mediaPorDia)}.`,
      ],
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results,
    });
  }

  if (looksLikeProjectionQuestion(prompt)) {
    const normalizedPrompt = normalizeText(prompt);
    const projectionTimeframe =
      /(semana|semanal|semanais|semanis)/.test(normalizedPrompt) ? "this_week" : "this_month";
    const period =
      detectPeriodFilter(prompt) ?? (projectionTimeframe === "this_week" ? weekBounds(0) : monthBounds(0));
    const label = resolvePeriodLabel(prompt, projectionTimeframe);
    const summary = await summarizeLancamentos({
      gestaoId,
      dateFrom: period.from,
      dateTo: period.to,
    });
    const today = formatDate(new Date());
    const currentEnd = minDateString(period.to, today);
    const elapsedDays = daysBetweenInclusive(period.from, currentEnd);
    const totalDays = daysBetweenInclusive(period.from, period.to);
    const currentReceitas = Number(summary.receitas ?? 0);
    const currentDespesas = Number(summary.despesas ?? 0);
    const currentSaldo = Number(summary.saldo ?? 0);
    const projectedReceitas = currentReceitas * (totalDays / elapsedDays);
    const projectedDespesas = currentDespesas * (totalDays / elapsedDays);
    const projectedSaldo = currentSaldo * (totalDays / elapsedDays);
    const metric = inferProjectionMetric(prompt);
    const results = await searchLancamentos({
      gestaoId,
      dateFrom: period.from,
      dateTo: currentEnd,
    });

    const fallback =
      results.length === 0
        ? `Ainda nao encontrei lancamentos suficientes ${label} para projetar um cenario.`
        : metric === "despesa"
          ? `Mantendo o ritmo atual, vocês podem fechar ${label} com cerca de ${money(projectedDespesas)} em despesas. Ate agora foram ${money(currentDespesas)}, com media de ${money(currentDespesas / elapsedDays)} por dia.`
          : metric === "saldo"
            ? `Mantendo o ritmo atual, o saldo projetado ${label} fica em torno de ${money(projectedSaldo)}. Ate agora o saldo do periodo esta em ${money(currentSaldo)}.`
            : `Mantendo o ritmo atual, vocês podem fechar ${label} com cerca de ${money(projectedReceitas)} em entradas. Ate agora entraram ${money(currentReceitas)}, com media de ${money(currentReceitas / elapsedDays)} por dia.`;
    const narrated = await narrate({
      fallback,
      style: results.length > 0 ? "result" : "not_found",
      facts: [
        `Periodo consultado: ${period.from} ate ${period.to}.`,
        `Dias decorridos considerados: ${elapsedDays} de ${totalDays}.`,
        `Receitas atuais: ${money(currentReceitas)}.`,
        `Despesas atuais: ${money(currentDespesas)}.`,
        `Saldo atual do periodo: ${money(currentSaldo)}.`,
      ],
      baseProvider: "local",
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      answer: narrated.answer,
      results,
    });
  }

  if (looksLikeUpdateLancamentoDate(prompt)) {
    const competenciaData = extractTargetCompetenciaDate(prompt);

    if (!competenciaData) {
      return NextResponse.json(
        { error: "Nao consegui identificar para qual data voce quer ajustar esse lancamento." },
        { status: 400 },
      );
    }

    const tipo = extractUpdateTipo(prompt);
    const baseResults =
      body.previousKind === "search" && body.previousResults?.length
        ? body.previousResults
        : await searchLancamentos({
            gestaoId,
            tipo,
          });
    const matches = findMatchingLancamentos(prompt, baseResults);
    const suggestion = buildUpdateLancamentosDataSuggestion({
      lancamentos: matches,
      competenciaData,
    });

    if (!suggestion) {
      return NextResponse.json({
        kind: "info",
        provider: "local",
        answer: "Nao encontrei lancamentos para ajustar essa data.",
        results: [],
      });
    }

    return NextResponse.json({
      kind: "transactions_date_update",
      provider: "local",
      answer: `Entendi isso como ajustar ${suggestion.quantidade} lancamento(s) para a data ${suggestion.competenciaData}. Se estiver certo, confirme para aplicar.`,
      suggestion,
      results: matches,
    });
  }

  if (looksLikeDeleteLancamentos(prompt)) {
    const tipo = extractUpdateTipo(prompt);
    const baseResults =
      body.previousKind === "search" && body.previousResults?.length
        ? body.previousResults
        : await searchLancamentos({
            gestaoId,
            tipo,
          });
    const matches = findMatchingLancamentos(prompt, baseResults);
    const suggestion = buildDeleteLancamentosSuggestion({
      lancamentos: matches,
    });

    if (!suggestion) {
      return NextResponse.json({
        kind: "info",
        provider: "local",
        answer: "Nao encontrei lancamentos para apagar com esse pedido.",
        results: [],
      });
    }

    return NextResponse.json({
      kind: "transactions_delete",
      provider: "local",
      answer: `Entendi isso como apagar ${suggestion.quantidade} lancamento(s). Se estiver certo, confirme para aplicar.`,
      suggestion,
      results: matches,
    });
  }

  if (looksLikeBatchQuickAdd(prompt)) {
    try {
      const result = await suggestQuickAddBatch(prompt, contas, categorias);
      const suggestion = result.suggestion;

      return NextResponse.json({
        kind: "quick_add_batch",
        provider: result.provider,
        answer: `Entendi isso como um lote de ${suggestion.quantidade} lancamento(s), totalizando ${money(suggestion.valorTotalLote)}. Se estiver certo, confirme para salvar tudo.`,
        suggestion,
      });
    } catch {
      return NextResponse.json(
        { error: "Nao consegui montar um lote valido com esse texto. Inclua os valores e o contexto principal do lote." },
        { status: 400 },
      );
    }
  }

  if (looksLikeQuickAdd(prompt)) {
    try {
      const result = await suggestQuickAdd(prompt, contas, categorias);
      const suggestion = enforceQuickAddBusinessRules(prompt, result.suggestion, contas, categorias);
      const conta = contas.find((item) => item.id === suggestion.contaId)?.nome ?? "origem selecionada";
      const categoria = categorias.find((item) => item.id === suggestion.categoriaId)?.nome ?? "categoria selecionada";
      const meio = suggestion.meio ? `, meio ${suggestion.meio}` : "";
      const quando = `${suggestion.competenciaData}${suggestion.competenciaHora ? ` às ${suggestion.competenciaHora}` : ""}`;

      return NextResponse.json({
        kind: "quick_add",
        provider: result.provider,
        answer: `Entendi isso como ${lancamentoLabel(suggestion.tipo)} de ${money(suggestion.valorTotal)} em ${quando}, na origem ${conta}${meio}, categoria ${categoria}. Se estiver certo, confirme para salvar.`,
        suggestion,
      });
    } catch {
      return NextResponse.json(
        { error: "Nao consegui montar um lancamento com esse texto. Inclua valor e um pouco mais de contexto." },
        { status: 400 },
      );
    }
  }

  if (looksLikeUpdateLancamentos(prompt)) {
    const requestedMeio = detectRequestedMeio(prompt);

    if (!requestedMeio) {
      return NextResponse.json(
        { error: "Nao consegui identificar qual meio voce quer aplicar nesses lancamentos." },
        { status: 400 },
      );
    }

    const normalized = normalizeText(prompt);
    const searchText = extractUpdateSearchText(prompt);
    const tipo = extractUpdateTipo(prompt);
    const baseResults =
      body.previousKind === "search" && body.previousResults?.length
        ? body.previousResults
        : await searchLancamentos({
            gestaoId,
            tipo,
            text: searchText,
          });

    const narrowedResults = baseResults.filter((item) => {
      if (item.meio === requestedMeio) {
        return false;
      }

      if (requestedMeio === "credito" && /(cartao|cartão|credito|crédito)/.test(normalized)) {
        return (
          item.conta_tipo === "cartao_credito" ||
          /(credito|crédito|cartao|cartão)/.test(normalizeText(item.conta_nome))
        );
      }

      return true;
    });

    const suggestion = buildUpdateLancamentosSuggestion({
      prompt,
      resultados: narrowedResults,
      meio: requestedMeio,
    });

    if (!suggestion) {
      return NextResponse.json({
        kind: "info",
        provider: "local",
        answer: "Nao encontrei lancamentos pendentes dessa atualizacao.",
        results: [],
      });
    }

    return NextResponse.json({
      kind: "transactions_update",
      provider: "local",
      answer: `Entendi isso como atualizar ${suggestion.quantidade} lancamento(s) para meio ${meioLabel(suggestion.meio)}. Se estiver certo, confirme para aplicar.`,
      suggestion,
      results: narrowedResults,
    });
  }

  if (looksLikeKeepAccounts(prompt)) {
    try {
      const result = await suggestKeepAccounts(prompt, contas);

      return NextResponse.json({
        kind: "account_keep",
        provider: result.provider,
        answer: result.suggestion.desativarNomes.length > 0
          ? `Entendi isso como manter ativas apenas estas origens: ${result.suggestion.manterNomes.join(", ")}. As demais serao desativadas: ${result.suggestion.desativarNomes.join(", ")}. Se estiver certo, confirme para aplicar.`
          : `Essas ja sao as unicas origens ativas: ${result.suggestion.manterNomes.join(", ")}.`,
        suggestion: result.suggestion,
      });
    } catch {
      return NextResponse.json(
        { error: "Nao consegui identificar quais origens devem permanecer ativas." },
        { status: 400 },
      );
    }
  }

  if (looksLikeRenameAccount(prompt)) {
    try {
      const result = await suggestRenameAccount(prompt, contas);

      return NextResponse.json({
        kind: "account_rename",
        provider: result.provider,
        answer: `Entendi isso como renomear a origem "${result.suggestion.nomeAtual}" para "${result.suggestion.novoNome}". Se estiver certo, confirme para aplicar.`,
        suggestion: result.suggestion,
      });
    } catch {
      return NextResponse.json(
        { error: "Nao consegui identificar qual origem voce quer renomear e qual deve ser o novo nome." },
        { status: 400 },
      );
    }
  }

  if (looksLikeCreateAccount(prompt)) {
    try {
      const result = await suggestCreateAccount(prompt);

      return NextResponse.json({
        kind: "account_create",
        provider: result.provider,
        answer: `Entendi isso como uma nova origem "${result.suggestion.nome}", do tipo ${result.suggestion.tipo.replace("_", " ")}, com instituicao ${result.suggestion.instituicao ?? "nao informada"} e saldo inicial de ${money(result.suggestion.saldoInicial)}. Se estiver certo, confirme para criar.`,
        suggestion: result.suggestion,
      });
    } catch {
      return NextResponse.json(
        { error: "Nao consegui montar a nova origem com esse texto. Diga pelo menos o nome ou o banco." },
        { status: 400 },
      );
    }
  }

  const semanticInsight = await planAssistantInsight(promptWithContext, contas, categorias);

  if (semanticInsight.plan.action !== "search") {
    const insightFilters = applyInsightTimeframeFilters(
      prompt,
      {
        text: semanticInsight.plan.text,
        tipo: semanticInsight.plan.tipo,
        contaId: semanticInsight.plan.contaId,
        categoriaId: semanticInsight.plan.categoriaId,
        minValor: semanticInsight.plan.minValor,
        maxValor: semanticInsight.plan.maxValor,
        motivo: semanticInsight.plan.motivo,
      },
      semanticInsight.plan.timeframe,
    );

    if (semanticInsight.plan.action === "chat") {
      const narrated = await narrate({
        fallback:
          "Posso te ajudar a consultar lancamentos, resumir entradas e gastos, conferir saldo, criar lancamentos, editar registros e organizar origens. Se quiser, pode falar do jeito natural mesmo.",
        style: "chat",
        facts: [
          "O assistente consegue buscar e resumir lancamentos da gestao ativa.",
          "O assistente consegue montar rascunhos de lancamentos simples e em lote.",
          "O assistente consegue ajudar com saldo, entradas, despesas, origens e conciliacao.",
          "O assistente nao deve inventar dados e sempre deve usar o banco real como fonte da verdade.",
        ],
        baseProvider: semanticInsight.provider,
      });

      return NextResponse.json({
        kind: "info",
        provider: narrated.provider,
        answer: narrated.answer,
        results: [],
      });
    }

    if (semanticInsight.plan.action === "inventory") {
      const lancamentos = await listRecentLancamentos(gestaoId);
      const partes: string[] = [];

      if (contas.length > 0) {
        partes.push(`Origens da gestao: ${contas.map((conta) => conta.nome).join(", ")}.`);
      } else {
        partes.push("Nao encontrei origens cadastradas nesta gestao.");
      }

      if (lancamentos.length > 0) {
        partes.push(
          `Lancamentos recentes: ${lancamentos
            .slice(0, 5)
            .map((item) => `${item.descricao} em ${item.competencia_data}`)
            .join(", ")}.`,
        );
      }

      const narrated = await narrate({
        fallback: partes.join(" "),
        style: "result",
        facts: [
          `Quantidade de origens ativas: ${contas.length}.`,
          `Quantidade de lancamentos recentes considerados: ${lancamentos.length}.`,
        ],
        baseProvider: semanticInsight.provider,
      });

      return NextResponse.json({
        kind: "search",
        provider: narrated.provider,
        answer: narrated.answer,
        results: lancamentos,
      });
    }

    if (semanticInsight.plan.action === "summary") {
      const resumo = await summarizeLancamentos({
        gestaoId,
        ...insightFilters,
      });
      const results = await searchLancamentos({
        gestaoId,
        ...insightFilters,
      });

      const fallback =
        resumo.quantidade > 0
          ? `Resumo ${periodLabel(prompt)}: ${resumo.quantidade} lancamento(s), ${money(resumo.receitas)} em receitas, ${money(resumo.despesas)} em despesas e saldo de ${money(resumo.saldo)}.`
          : `Nao encontrei lancamentos para resumir ${periodLabel(prompt)}.`;
      const narrated = await narrate({
        fallback,
        style: resumo.quantidade > 0 ? "result" : "not_found",
        facts: [
          `Quantidade: ${resumo.quantidade}.`,
          `Receitas: ${money(resumo.receitas)}.`,
          `Despesas: ${money(resumo.despesas)}.`,
          `Saldo: ${money(resumo.saldo)}.`,
        ],
        baseProvider: semanticInsight.provider,
      });

      return NextResponse.json({
        kind: "search",
        provider: narrated.provider,
        answer: narrated.answer,
        results,
      });
    }

    if (semanticInsight.plan.action === "latest_transaction") {
      const latest = await findLatestLancamento({
        gestaoId,
        ...insightFilters,
      });

      const fallback = latest
        ? `O ultimo lancamento foi "${latest.descricao}" em ${latest.competencia_data}, na conta ${latest.conta_nome}, no valor de ${money(latest.valor_total)}.`
        : `Nao encontrei nenhum lancamento ${periodLabel(prompt)}.`;
      const narrated = await narrate({
        fallback,
        style: latest ? "result" : "not_found",
        facts: latest
          ? [
              `Descricao: ${latest.descricao}.`,
              `Data: ${latest.competencia_data}.`,
              `Origem: ${latest.conta_nome}.`,
              `Valor: ${money(latest.valor_total)}.`,
            ]
          : [],
        baseProvider: semanticInsight.provider,
      });

      return NextResponse.json({
        kind: "search",
        provider: narrated.provider,
        answer: narrated.answer,
        results: latest ? [latest] : [],
      });
    }

    if (semanticInsight.plan.action === "largest_expense") {
      const item = await findLargestLancamento({
        gestaoId,
        ...insightFilters,
        tipo: "despesa",
      });

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer: item
          ? `A maior despesa ${periodLabel(prompt)} foi "${item.descricao}" em ${item.competencia_data}, na origem ${item.conta_nome}, no valor de ${money(item.valor_total)}.`
          : `Nao encontrei despesas ${periodLabel(prompt)}.`,
        results: item ? [item] : [],
      });
    }

    if (semanticInsight.plan.action === "largest_income") {
      const item = await findLargestLancamento({
        gestaoId,
        ...insightFilters,
        tipo: "receita",
      });

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer: item
          ? `A maior entrada ${periodLabel(prompt)} foi "${item.descricao}" em ${item.competencia_data}, pela origem ${item.conta_nome}, no valor de ${money(item.valor_total)}.`
          : `Nao encontrei receitas ${periodLabel(prompt)}.`,
        results: item ? [item] : [],
      });
    }

    if (semanticInsight.plan.action === "top_spend") {
      const categoriasResumo = await summarizeLancamentosByCategoria({
        gestaoId,
        ...insightFilters,
        tipo: "despesa",
      });
      const topCategoria = categoriasResumo[0];
      const maiorDespesa = await findLargestLancamento({
        gestaoId,
        ...insightFilters,
        tipo: "despesa",
      });
      const results = await searchLancamentos({
        gestaoId,
        ...insightFilters,
        tipo: "despesa",
      });

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer:
          topCategoria && maiorDespesa
            ? `Vocês gastaram mais com ${topCategoria.categoria_nome ?? "Sem categoria"} ${periodLabel(prompt)}, somando ${money(topCategoria.total)} em ${topCategoria.quantidade} lancamento(s). A maior despesa individual foi "${maiorDespesa.descricao}" de ${money(maiorDespesa.valor_total)}.`
            : `Nao encontrei despesas ${periodLabel(prompt)}.`,
        results,
      });
    }

    if (semanticInsight.plan.action === "income_by_origin") {
      const resumo = await summarizeLancamentos({
        gestaoId,
        ...insightFilters,
        tipo: "receita",
      });
      const porOrigem = await summarizeLancamentosByConta({
        gestaoId,
        ...insightFilters,
        tipo: "receita",
      });
      const results = await searchLancamentos({
        gestaoId,
        ...insightFilters,
        tipo: "receita",
      });

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer:
          resumo.quantidade > 0
            ? `Vocês tiveram ${money(resumo.receitas)} em entradas ${periodLabel(prompt)}. ${porOrigem
                .map((item) => `${item.conta_nome}: ${money(item.total)}`)
                .join(" · ")}.`
            : `Nao encontrei entradas ${periodLabel(prompt)}.`,
        results,
      });
    }

    if (semanticInsight.plan.action === "top_income_entries") {
      const results = await searchLancamentos({
        gestaoId,
        ...insightFilters,
        tipo: "receita",
      });
      const topEntries = [...results]
        .sort((left, right) => Number(right.valor_total) - Number(left.valor_total))
        .slice(0, 3);

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer:
          topEntries.length > 0
            ? `As melhores entradas ${periodLabel(prompt)} foram ${topEntries
                .map(
                  (item) =>
                    `${money(item.valor_total)} em ${item.competencia_data}, por ${item.meio ?? "meio nao informado"}, na origem ${item.conta_nome}`,
                )
                .join(" · ")}.`
            : `Nao encontrei entradas ${periodLabel(prompt)}.`,
        results: topEntries,
      });
    }

    if (semanticInsight.plan.action === "top_spend_day") {
      const porDia = await summarizeLancamentosByDia({
        gestaoId,
        ...insightFilters,
        tipo: "despesa",
      });
      const topDia = porDia[0];
      const results = await searchLancamentos({
        gestaoId,
        ...insightFilters,
        tipo: "despesa",
      });

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer:
          topDia
            ? `O dia com mais gastos ${periodLabel(prompt)} foi ${topDia.competencia_data}, com ${money(topDia.total)} em ${topDia.quantidade} lancamento(s).`
            : `Nao encontrei despesas ${periodLabel(prompt)}.`,
        results,
      });
    }

    if (semanticInsight.plan.action === "risk_review") {
      const categoriasResumo = await summarizeLancamentosByCategoria({
        gestaoId,
        ...insightFilters,
        tipo: "despesa",
      });
      const topCategoria = categoriasResumo[0];
      const segundaCategoria = categoriasResumo[1];
      const results = await searchLancamentos({
        gestaoId,
        ...insightFilters,
        tipo: "despesa",
      });

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer:
          topCategoria
            ? `Seu principal ponto de atencao ${periodLabel(prompt)} e ${topCategoria.categoria_nome ?? "Sem categoria"}, com ${money(topCategoria.total)}. ${
                segundaCategoria
                  ? `Depois vem ${segundaCategoria.categoria_nome ?? "Sem categoria"}, com ${money(segundaCategoria.total)}.`
                  : ""
              }`
            : `Ainda nao encontrei despesas suficientes para apontar um risco ${periodLabel(prompt)}.`,
        results,
      });
    }

    if (semanticInsight.plan.action === "percentage" || semanticInsight.plan.action === "income_percentage") {
      const tipo = semanticInsight.plan.tipo === "despesa" ? "despesa" : "receita";
      const label = resolvePeriodLabel(prompt, semanticInsight.plan.timeframe);
      const resumo = await summarizeLancamentos({
        gestaoId,
        ...insightFilters,
        tipo,
      });
      const total = Number(tipo === "despesa" ? resumo.despesas ?? 0 : resumo.receitas ?? 0);
      const percentual = Number(semanticInsight.plan.percentage ?? extractRequestedPercentage(prompt) ?? 10);
      const resultado = total * (percentual / 100);
      const results = await searchLancamentos({
        gestaoId,
        ...insightFilters,
        tipo,
      });

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer:
          results.length > 0
            ? `Vocês tiveram ${money(total)} em ${tipo === "despesa" ? "gastos" : "receitas"} ${label}. ${percentual}% disso é ${money(resultado)}.`
            : `Nao encontrei ${tipo === "despesa" ? "despesas" : "receitas"} ${label} para calcular esse percentual.`,
        results,
      });
    }

    if (semanticInsight.plan.action === "average") {
      const tipo = semanticInsight.plan.tipo === "despesa" ? "despesa" : "receita";
      const label = resolvePeriodLabel(prompt, semanticInsight.plan.timeframe);
      const totalRow = await sumLancamentos({
        gestaoId,
        ...insightFilters,
        tipo,
      });
      const total = Number(totalRow.total ?? 0);
      const quantidade = Number(totalRow.quantidade ?? 0);
      const periodo = applyInsightTimeframeFilters(prompt, { motivo: "periodo" }, semanticInsight.plan.timeframe);
      const from = periodo.dateFrom ?? formatDate(new Date());
      const to = periodo.dateTo ?? formatDate(new Date());
      const dias = daysBetweenInclusive(from, to);
      const mediaPorLancamento = quantidade > 0 ? total / quantidade : 0;
      const mediaPorDia = dias > 0 ? total / dias : 0;
      const results = await searchLancamentos({
        gestaoId,
        ...insightFilters,
        tipo,
      });

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer:
          quantidade > 0
            ? `Vocês somaram ${money(total)} em ${tipo === "despesa" ? "despesas" : "receitas"} ${label}. A media foi ${money(mediaPorLancamento)} por lancamento e ${money(mediaPorDia)} por dia.`
            : `Nao encontrei ${tipo === "despesa" ? "despesas" : "receitas"} ${label} para calcular media.`,
        results,
      });
    }

    if (semanticInsight.plan.action === "projection") {
      const label = resolvePeriodLabel(prompt, semanticInsight.plan.timeframe);
      const periodo = applyInsightTimeframeFilters(prompt, { motivo: "periodo" }, semanticInsight.plan.timeframe);
      const from = periodo.dateFrom ?? formatDate(new Date());
      const to = periodo.dateTo ?? formatDate(new Date());
      const currentEnd = minDateString(to, formatDate(new Date()));
      const elapsedDays = daysBetweenInclusive(from, currentEnd);
      const totalDays = daysBetweenInclusive(from, to);
      const summary = await summarizeLancamentos({
        gestaoId,
        dateFrom: from,
        dateTo: to,
      });
      const currentReceitas = Number(summary.receitas ?? 0);
      const currentDespesas = Number(summary.despesas ?? 0);
      const currentSaldo = Number(summary.saldo ?? 0);
      const metric = inferProjectionMetric(prompt);
      const results = await searchLancamentos({
        gestaoId,
        dateFrom: from,
        dateTo: currentEnd,
      });

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer:
          results.length === 0
            ? `Ainda nao encontrei lancamentos suficientes ${label} para projetar um cenario.`
            : metric === "despesa"
              ? `Mantendo o ritmo atual, vocês podem fechar ${label} com cerca de ${money(currentDespesas * (totalDays / elapsedDays))} em despesas.`
              : metric === "saldo"
                ? `Mantendo o ritmo atual, o saldo projetado ${label} fica em torno de ${money(currentSaldo * (totalDays / elapsedDays))}.`
                : `Mantendo o ritmo atual, vocês podem fechar ${label} com cerca de ${money(currentReceitas * (totalDays / elapsedDays))} em entradas.`,
        results,
      });
    }

    if (semanticInsight.plan.action === "balance_check") {
      const [cashOverview, availableBalance] = await Promise.all([
        getCashOverview(gestaoId),
        getAvailableBalance(gestaoId),
      ]);
      const bankAmount = extractCurrencyAmount(prompt);
      const saldoSistema = Number(availableBalance ?? 0);
      const diferenca = bankAmount ? Number((bankAmount - saldoSistema).toFixed(2)) : null;

      return NextResponse.json({
        kind: "search",
        provider: semanticInsight.provider,
        answer:
          diferenca === null
            ? `Hoje o sistema fecha com saldo em conta de ${money(saldoSistema)}, considerando ${money(cashOverview.entradas_em_conta)} em entradas, ${money(cashOverview.despesas)} em despesas e ${money(cashOverview.saidas_da_conta)} em saidas da conta.`
            : diferenca === 0
              ? `O saldo bate. Banco e sistema estao em ${money(saldoSistema)}. A composicao atual e ${money(cashOverview.entradas_em_conta)} em entradas, ${money(cashOverview.despesas)} em despesas e ${money(cashOverview.saidas_da_conta)} em saidas da conta.`
              : `O sistema fecha em ${money(saldoSistema)}, enquanto o valor informado do banco foi ${money(bankAmount)}. A diferenca e de ${money(Math.abs(diferenca))} ${diferenca > 0 ? "a mais no banco" : "a menos no banco"}. Hoje a composicao do sistema esta em ${money(cashOverview.entradas_em_conta)} de entradas, ${money(cashOverview.despesas)} de despesas e ${money(cashOverview.saidas_da_conta)} de saidas da conta.`,
        results: [],
      });
    }
  }

  const refinedPlan = refineAssistantSearchPlan(prompt, body.previousPlan, contas, categorias);

  const planned = refinedPlan
    ? { provider: "local" as const, plan: refinedPlan }
    : await planAssistantSearch(promptWithContext, contas, categorias);
  const plan = refinedPlan
    ? planned.plan
    : stabilizeAssistantSearchPlan(prompt, planned.plan, contas, categorias);
  const provider = planned.provider;

  if (plan.intent === "latest_transaction") {
    const latest = await findLatestLancamento({
      gestaoId,
      ...plan.filters,
    });

    const fallback = latest
      ? `O ultimo lancamento foi "${latest.descricao}" em ${latest.competencia_data}, na conta ${latest.conta_nome}, no valor de ${money(latest.valor_total)}.`
      : "Nao encontrei nenhum lancamento para esse contexto.";
    const narrated = await narrate({
      fallback,
      style: latest ? "result" : "not_found",
      facts: latest
        ? [
            `Descricao: ${latest.descricao}.`,
            `Data: ${latest.competencia_data}.`,
            `Origem: ${latest.conta_nome}.`,
            `Valor: ${money(latest.valor_total)}.`,
          ]
        : [],
      baseProvider: provider,
    });

    return NextResponse.json({
      kind: "search",
      provider: narrated.provider,
      plan,
      answer: narrated.answer,
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
      kind: "search",
      provider,
      plan,
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
      kind: "search",
      provider,
      plan,
      answer: item
        ? `A maior receita encontrada foi "${item.descricao}" em ${item.competencia_data}, no valor de ${money(item.valor_total)}.`
        : "Nao encontrei receitas com esse contexto.",
      results: item ? [item] : [],
    });
  }

  if (plan.intent === "summary") {
    const resumo = await summarizeLancamentos({
      gestaoId,
      ...plan.filters,
    });
    const results = await searchLancamentos({
      gestaoId,
      ...plan.filters,
    });

    return NextResponse.json({
      kind: "search",
      provider,
      plan,
      answer:
        resumo.quantidade > 0
          ? plan.filters.tipo === "despesa"
            ? `Vocês tiveram ${money(resumo.despesas)} em despesas ${plan.filters.dateFrom && plan.filters.dateTo ? `entre ${plan.filters.dateFrom} e ${plan.filters.dateTo}` : "no contexto pedido"}.`
            : plan.filters.tipo === "receita"
              ? `Vocês tiveram ${money(resumo.receitas)} em receitas ${plan.filters.dateFrom && plan.filters.dateTo ? `entre ${plan.filters.dateFrom} e ${plan.filters.dateTo}` : "no contexto pedido"}.`
              : `Resumo do periodo: ${resumo.quantidade} lancamento(s), ${money(resumo.receitas)} em receitas, ${money(resumo.despesas)} em despesas e saldo de ${money(resumo.saldo)}.`
          : "Nao encontrei lancamentos para resumir nesse contexto.",
      results,
    });
  }

  const results = await searchLancamentos({
    gestaoId,
    ...plan.filters,
  });

  const fallback =
    results.length > 0
      ? `Encontrei ${results.length} lancamento(s) com base no que voce pediu.`
      : "Nao encontrei lancamentos com esse pedido.";
  const narrated = await narrate({
    fallback,
    style: results.length > 0 ? "result" : "not_found",
    facts: results.length > 0
      ? results.slice(0, 5).map(
          (item) =>
            `${item.descricao} em ${item.competencia_data}, ${money(item.valor_total)}, origem ${item.conta_nome}.`,
        )
      : [
          "Nenhum lancamento bateu com os filtros interpretados.",
          "Se o usuario reformular com periodo, origem, categoria ou valor, a busca tende a ficar melhor.",
        ],
    baseProvider: provider,
  });

  return NextResponse.json({
    kind: "search",
    provider: narrated.provider,
    plan,
    answer: narrated.answer,
    results,
  });
}
