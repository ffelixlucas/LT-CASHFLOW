# LT CashFlow — handoff do assistente (fontes completas)

Pacote único em Markdown para encaminhar por e-mail ou chat. Três arquivos na ordem: route da API → camada IA → repositório.

> Gerado automaticamente; o código está dentro das cercas \`\`\`typescript.

---

## `apps/web/src/app/api/assistant/route.ts`

```typescript
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

function lancamentoLabel(tipo: "receita" | "despesa" | "ajuste" | "transferencia") {
  if (tipo === "receita") {
    return "uma nova receita";
  }

  if (tipo === "despesa") {
    return "uma nova despesa";
  }

  if (tipo === "transferencia") {
    return "uma aplicacao";
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
      /\b(edita|edite|editar|altera|altere|ajusta|ajuste|corrige|corrija|marca|defina|coloca|coloque|as|os|a|o|com|como|para|pra|meio|lancamento|lancamentos|despesa|despesas|receita|receitas|gasto|gastos|entrada|entradas|compra|compras|cartao de credito|cartao credito|credito|cartao de debito|cartao debito|debito|pix|pics?|dinheiro|ted|doc|transferencia|outro)\b/g,
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
    const destino =
      refinedQuickAdd.tipo === "transferencia"
        ? contas.find((item) => item.id === refinedQuickAdd.contaDestinoId)?.nome ?? "destino selecionado"
        : null;
    const meio = refinedQuickAdd.meio ? `, meio ${refinedQuickAdd.meio}` : "";
    const detalhe = refinedQuickAdd.tipo === "transferencia" ? `, destino ${destino}` : `, categoria ${categoria}`;

    return NextResponse.json({
      kind: "quick_add",
      provider: "local",
      answer: `Atualizei o rascunho para ${lancamentoLabel(refinedQuickAdd.tipo)} de ${money(refinedQuickAdd.valorTotal)} em ${refinedQuickAdd.competenciaData}, na origem ${conta}${meio}${detalhe}. Se estiver certo, confirme para salvar.`,
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
      const destino =
        suggestion.tipo === "transferencia"
          ? contas.find((item) => item.id === suggestion.contaDestinoId)?.nome ?? "destino selecionado"
          : null;
      const meio = suggestion.meio ? `, meio ${suggestion.meio}` : "";
      const quando = `${suggestion.competenciaData}${suggestion.competenciaHora ? ` às ${suggestion.competenciaHora}` : ""}`;
      const detalhe = suggestion.tipo === "transferencia" ? `, destino ${destino}` : `, categoria ${categoria}`;

      return NextResponse.json({
        kind: "quick_add",
        provider: result.provider,
        answer: `Entendi isso como ${lancamentoLabel(suggestion.tipo)} de ${money(suggestion.valorTotal)} em ${quando}, na origem ${conta}${meio}${detalhe}. Se estiver certo, confirme para salvar.`,
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
```

---

## `apps/web/src/lib/server/ai.ts`

```typescript
import "server-only";

import { isMercadoLivreMarketplaceCharge, matchesGroceryAlimentacaoCue } from "@/lib/merchant-cues";
import {
  assistantInsightPlanSchema,
  aiSearchFilterSchema,
  assistantSearchPlanSchema,
  createAccountSuggestionSchema,
  keepAccountsSuggestionSchema,
  quickAddBatchSuggestionSchema,
  quickAddSuggestionSchema,
  renameAccountSuggestionSchema,
  type AiSearchFilter,
  type AssistantInsightPlan,
  type AssistantSearchPlan,
  type CreateAccountSuggestion,
  type KeepAccountsSuggestion,
  type QuickAddBatchSuggestion,
  type QuickAddSuggestion,
  type RenameAccountSuggestion,
} from "@ltcashflow/validation";

type SelectOption = {
  id: number;
  nome: string;
  tipo?: string;
};

type CategoriaOption = SelectOption & {
  natureza?: "receita" | "despesa" | "ambos";
};

export type AiProvider = "groq" | "openai" | "local";

type RawRecord = Record<string, unknown>;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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

function extractAmount(prompt: string) {
  const match = prompt.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{1,2})?)/);

  if (!match) {
    return null;
  }

  const amountText = match[1];

  if (!amountText) {
    return null;
  }

  const raw = amountText.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(raw);

  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractAmounts(prompt: string) {
  const matches = prompt.match(/\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+[.,]\d{1,2}/g) ?? [];

  return matches
    .map((chunk) => Number(chunk.replace(/\s/g, "").replace(/\./g, "").replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function extractDate(prompt: string) {
  const normalized = normalizeText(prompt);
  const today = new Date();

  if (normalized.includes("hoje") || normalized.includes("agora")) {
    return formatDate(today);
  }

  if (normalized.includes("ontem")) {
    return formatDate(shiftDays(today, -1));
  }

  if (normalized.includes("amanha")) {
    return formatDate(shiftDays(today, 1));
  }

  const isoMatch = prompt.match(/\b(20\d{2}-\d{2}-\d{2})\b/);

  if (isoMatch) {
    return isoMatch[1];
  }

  const brMatch = prompt.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);

  if (brMatch) {
    const dayText = brMatch[1];
    const monthText = brMatch[2];

    if (!dayText || !monthText) {
      return formatDate(today);
    }

    const day = dayText.padStart(2, "0");
    const month = monthText.padStart(2, "0");
    const year =
      brMatch[3] && brMatch[3].length === 4
        ? brMatch[3]
        : String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }

  return formatDate(today);
}

function extractTime(prompt: string) {
  const match = prompt.match(/\b(?:as|às)?\s*([01]?\d|2[0-3])[:h]([0-5]\d)\b/i);

  if (!match) {
    return null;
  }

  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

function shouldDefaultToCurrentTime(prompt: string) {
  const normalized = normalizeText(prompt);

  return (
    /\b(hoje|agora)\b/.test(normalized) ||
    !/\b(ontem|amanha|20\d{2}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/.test(normalized)
  );
}

function detectTipo(prompt: string): "receita" | "despesa" | "ajuste" | "transferencia" {
  const normalized = normalizeText(prompt);

  if (/(salario|recebi|recebimento|ganhei|entrada|pix recebido|deposito)/.test(normalized)) {
    return "receita";
  }

  if (/(aplicacao|aplicação|resgate|transferencia|transferência|investimento|porquinho)/.test(normalized)) {
    return "transferencia";
  }

  if (/(ajuste|correcao)/.test(normalized)) {
    return "ajuste";
  }

  return "despesa";
}

function detectExplicitTipo(
  prompt: string,
): "receita" | "despesa" | "ajuste" | "transferencia" | undefined {
  const normalized = normalizeText(prompt);

  if (/(salario|recebi|recebimento|ganhei|entrada|pix recebido|deposito)/.test(normalized)) {
    return "receita";
  }

  if (/(ajuste|correcao)/.test(normalized)) {
    return "ajuste";
  }

  if (/(aplicacao|aplicação|resgate|transferencia|transferência|investimento|porquinho)/.test(normalized)) {
    return "transferencia";
  }

  if (/(despesa|gastei|paguei|compra|saida|saída)/.test(normalized)) {
    return "despesa";
  }

  return undefined;
}

function detectMeio(prompt: string) {
  const normalized = normalizeText(prompt);

  if (/\bpix\b/.test(normalized) || /\bpics?\b/.test(normalized)) {
    return "pix" as const;
  }

  if (/(cartao de credito|cartão de crédito|credito|crédito)/.test(normalized)) {
    return "credito" as const;
  }

  if (/(debito|débito)/.test(normalized)) {
    return "debito" as const;
  }

  if (/(dinheiro|especie|espécie)/.test(normalized)) {
    return "dinheiro" as const;
  }

  if (/(ted|doc)/.test(normalized)) {
    return "ted_doc" as const;
  }

  if (/(transferencia|transferência)/.test(normalized)) {
    return "transferencia" as const;
  }

  return undefined;
}

function findDefaultCategory(categories: CategoriaOption[], tipo: string) {
  const outros = categories.find((item) => normalizeText(item.nome) === "outros");

  if (outros && (outros.natureza === tipo || outros.natureza === "ambos")) {
    return outros;
  }

  return categories.find((item) => item.natureza === tipo || item.natureza === "ambos") ?? categories[0] ?? null;
}

function findGenericIncomeCategory(categories: CategoriaOption[]) {
  const futureTrade = categories.find(
    (item) => normalizeText(item.nome) === "futuretrade" && (item.natureza === "receita" || item.natureza === "ambos"),
  );

  if (futureTrade) {
    return futureTrade;
  }

  const outros = categories.find(
    (item) => normalizeText(item.nome) === "outros" && (item.natureza === "receita" || item.natureza === "ambos"),
  );

  if (outros) {
    return outros;
  }

  return (
    categories.find(
      (item) =>
        (item.natureza === "receita" || item.natureza === "ambos") &&
        !["salario", "freelance"].includes(normalizeText(item.nome)),
    ) ??
    categories.find((item) => item.natureza === "receita" || item.natureza === "ambos") ??
    categories[0] ??
    null
  );
}

function hasExplicitCategoryCue(prompt: string) {
  const normalized = normalizeText(prompt);

  return /(mercado|supermercado|feira|ifood|restaurante|padaria|lanche|uber|99|combustivel|gasolina|onibus|metro|transporte|farmacia|medico|consulta|saude|aluguel|condominio|luz|agua|internet|moradia|cinema|viagem|show|lazer|bar|salario|pagamento|holerite|freela|freelance|cliente)/.test(
    normalized,
  );
}

function keywordCategoria(prompt: string, categories: CategoriaOption[], tipo: string) {
  const normalized = normalizeText(prompt);
  const byName = categories.find((item) => normalized.includes(normalizeText(item.nome)));

  if (byName) {
    return byName;
  }

  if (matchesGroceryAlimentacaoCue(normalized)) {
    const match = categories.find((category) => normalizeText(category.nome) === normalizeText("Alimentacao"));

    if (match) {
      return match;
    }
  }

  const keywordMap: Array<{ terms: RegExp; category: string }> = [
    { terms: /(uber|99|combustivel|gasolina|onibus|metro|transporte)/, category: "Transporte" },
    { terms: /(farmacia|medico|consulta|saude)/, category: "Saude" },
    { terms: /(aluguel|condominio|luz|agua|internet|moradia)/, category: "Moradia" },
    { terms: /(cinema|viagem|show|lazer|bar)/, category: "Lazer" },
    { terms: /(salario|pagamento|holerite)/, category: "Salario" },
    { terms: /(freela|freelance|cliente)/, category: "Freelance" },
  ];

  for (const item of keywordMap) {
    if (item.terms.test(normalized)) {
      const match = categories.find((category) => normalizeText(category.nome) === normalizeText(item.category));

      if (match) {
        return match;
      }
    }
  }

  return findDefaultCategory(categories, tipo);
}

function matchOption(prompt: string, options: SelectOption[]) {
  const normalized = normalizeText(prompt);
  return options.find((item) => normalized.includes(normalizeText(item.nome))) ?? options[0] ?? null;
}

function findMentionedOption(prompt: string, options: SelectOption[]) {
  const normalized = normalizeText(prompt);
  return options.find((item) => normalized.includes(normalizeText(item.nome))) ?? null;
}

function findMentionedCategoria(prompt: string, categories: CategoriaOption[]) {
  const normalized = normalizeText(prompt);
  const byName = categories.find((item) => normalized.includes(normalizeText(item.nome)));

  if (byName) {
    return byName;
  }

  const promptTokens = normalized.split(/\s+/).filter((token) => token.length >= 4);
  const byFuzzyName = categories.find((item) => {
    const categoryName = normalizeText(item.nome);

    return (
      promptTokens.some((token) => categoryName.includes(token) || token.includes(categoryName)) ||
      (categoryName === "futuretrade" && /\bfuture\b/.test(normalized))
    );
  });

  if (byFuzzyName) {
    return byFuzzyName;
  }

  if (matchesGroceryAlimentacaoCue(normalized)) {
    return categories.find((category) => normalizeText(category.nome) === normalizeText("Alimentacao")) ?? null;
  }

  const keywordMap: Array<{ terms: RegExp; category: string }> = [
    { terms: /(uber|99|combustivel|gasolina|onibus|metro|transporte)/, category: "Transporte" },
    { terms: /(farmacia|medico|consulta|saude)/, category: "Saude" },
    { terms: /(aluguel|condominio|luz|agua|internet|moradia)/, category: "Moradia" },
    { terms: /(cinema|viagem|show|lazer|bar)/, category: "Lazer" },
    { terms: /(salario|pagamento|holerite)/, category: "Salario" },
    { terms: /(freela|freelance|cliente)/, category: "Freelance" },
  ];

  for (const item of keywordMap) {
    if (item.terms.test(normalized)) {
      return (
        categories.find((category) => normalizeText(category.nome) === normalizeText(item.category)) ?? null
      );
    }
  }

  return null;
}

function normalizeSearchText(text: string | undefined) {
  if (!text) {
    return undefined;
  }

  const cleaned = text
    .replace(
      /\b(qual|quanto|quais|ultimo|ultima|maior|menor|foi|me mostra|buscar|busca|agora|so|só|apenas|somente|gastei|gastamos|recebi|recebemos|entrou|ganhei|ganhamos|minha|minhas|meus|meu|nosso|nossa|nossos|nossas|essa|esta|nesse|neste|semana|mes|mês|hoje|ontem|de|do|da|no|na|em|por|pra|para|cartao|cartão|credito|crédito|debito|débito|pix|receita|receitas|despesa|despesas|gasto|gastos)\b/gi,
      " ",
    )
    .replace(/[?.,!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 2 ? cleaned : undefined;
}

function promptToDescription(prompt: string) {
  const cleaned = prompt
    .replace(/\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{1,2})?/g, "")
    .replace(/\b(hoje|agora|ontem|amanha)\b/gi, "")
    .replace(/\b(no|na|de|do|da|para)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "Lancamento rapido";
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function defaultDescriptionForPrompt(
  prompt: string,
  tipo: "receita" | "despesa" | "ajuste" | "transferencia",
  meio?: QuickAddSuggestion["meio"],
) {
  const normalized = normalizeText(prompt);

  if (tipo === "receita" && meio === "pix") {
    return "Entrada de Pix";
  }

  if (tipo === "transferencia") {
    if (/(resgate)/.test(normalized)) {
      return "Resgate de investimento";
    }

    return "Aplicacao financeira";
  }

  if (/(onibus|ônibus|transp|transporte)/.test(normalized)) {
    return "Onibus transporte coletivo";
  }

  if (isMercadoLivreMarketplaceCharge(normalized)) {
    return "Mercado Livre";
  }

  if (/(superdia|mercado|supermercado|feira|padaria|ifood|restaurante)/.test(normalized)) {
    return "Mercado";
  }

  if (/(estorno)/.test(normalized)) {
    return "Estorno";
  }

  return promptToDescription(prompt);
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

function sanitizeAccountName(name: string, institution?: string) {
  const cleaned = name
    .replace(/^\s*(a|o|uma|um)\s+/i, "")
    .replace(/^\s*(conta|cartao|cartão)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned && institution) {
    return institution;
  }

  return toTitleCase(cleaned || name);
}

function normalizeAccountReference(value: string) {
  return normalizeText(value)
    .replace(/\b(origem|origens|conta|contas|banco)\b/g, " ")
    .replace(/\b(cartao de credito|cartão de crédito|cartao credito|cartao|cartão|credito|crédito)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asObject(value: unknown): RawRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : null;
}

function normalizePositiveNumber(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", ".").trim())
        : NaN;

  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalTime(value: unknown) {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (!match) {
    return undefined;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return undefined;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTipo(value: unknown) {
  const normalized = normalizeText(String(value ?? ""));

  if (["receita", "entrada", "ganho"].includes(normalized)) {
    return "receita" as const;
  }

  if (["despesa", "gasto", "saida", "saída"].includes(normalized)) {
    return "despesa" as const;
  }

  if (["ajuste", "correcao", "correção"].includes(normalized)) {
    return "ajuste" as const;
  }

  return undefined;
}

function normalizeIntent(value: unknown) {
  const normalized = normalizeText(String(value ?? ""));

  if (
    [
      "latest_transaction",
      "latest",
      "ultimo_lancamento",
      "ultimolancamento",
      "obterultimolancamento",
    ].includes(normalized)
  ) {
    return "latest_transaction" as const;
  }

  if (
    [
      "largest_expense",
      "largestexpense",
      "maiordespesa",
      "obtermaiordespesa",
    ].includes(normalized)
  ) {
    return "largest_expense" as const;
  }

  if (
    [
      "largest_income",
      "largestincome",
      "maiorreceita",
      "obtermaiorreceita",
    ].includes(normalized)
  ) {
    return "largest_income" as const;
  }

  if (["summary", "resumo", "sumario", "sumarizar"].includes(normalized)) {
    return "summary" as const;
  }

  if (["search", "busca", "buscar", "consulta"].includes(normalized)) {
    return "search" as const;
  }

  return undefined;
}

function normalizeTimeframe(value: unknown) {
  const normalized = normalizeText(String(value ?? ""));

  if (["today", "hoje"].includes(normalized)) return "today" as const;
  if (["yesterday", "ontem"].includes(normalized)) return "yesterday" as const;
  if (
    [
      "this_week",
      "esta_semana",
      "essa_semana",
      "nessa_semana",
      "semana",
      "semanal",
      "semanais",
      "por semana",
      "por_semana",
      "semanis",
    ].includes(normalized)
  ) {
    return "this_week" as const;
  }
  if (["last_week", "semana_passada"].includes(normalized)) return "last_week" as const;
  if (["last_7_days", "ultimos_7_dias", "ultimos7dias"].includes(normalized)) return "last_7_days" as const;
  if (
    [
      "this_month",
      "este_mes",
      "esse_mes",
      "nesse_mes",
      "mes",
      "mensal",
      "mensais",
      "por mes",
      "por mês",
      "por_mes",
    ].includes(normalized)
  ) {
    return "this_month" as const;
  }
  if (["last_month", "mes_passado"].includes(normalized)) return "last_month" as const;
  if (["all_time", "alltime", "geral", "todo_periodo", "todo_o_periodo"].includes(normalized)) {
    return "all_time" as const;
  }

  return "all_time" as const;
}

function normalizeInsightAction(value: unknown) {
  const normalized = normalizeText(String(value ?? ""));

  if (["chat", "conversa", "info"].includes(normalized)) return "chat" as const;
  if (["inventory", "inventario", "listar"].includes(normalized)) return "inventory" as const;
  if (["latest_transaction", "latest", "ultimo_lancamento"].includes(normalized)) {
    return "latest_transaction" as const;
  }
  if (["largest_expense", "maior_despesa"].includes(normalized)) return "largest_expense" as const;
  if (["largest_income", "maior_receita"].includes(normalized)) return "largest_income" as const;
  if (["summary", "resumo"].includes(normalized)) return "summary" as const;
  if (["top_spend", "maior_gasto_categoria", "top_gasto"].includes(normalized)) return "top_spend" as const;
  if (["income_by_origin", "entradas_por_origem", "origem_entradas"].includes(normalized)) {
    return "income_by_origin" as const;
  }
  if (["top_income_entries", "melhores_entradas", "maiores_entradas"].includes(normalized)) {
    return "top_income_entries" as const;
  }
  if (["top_spend_day", "dia_com_mais_gasto", "maior_gasto_por_dia"].includes(normalized)) {
    return "top_spend_day" as const;
  }
  if (["risk_review", "risco", "insight_risco"].includes(normalized)) return "risk_review" as const;
  if (
    ["percentage", "percentual", "calcular_percentual", "income_percentage", "percentual_receita", "dez_por_cento"].includes(
      normalized,
    )
  ) {
    return "percentage" as const;
  }
  if (["average", "media", "media_receita", "media_ganho", "media_entrada"].includes(normalized)) {
    return "average" as const;
  }
  if (["projection", "projecao", "projeção", "ritmo", "cenario", "cenário", "simulacao", "simulação"].includes(normalized)) {
    return "projection" as const;
  }
  if (["income_percentage", "percentual_receita", "dez_por_cento"].includes(normalized)) {
    return "income_percentage" as const;
  }
  if (["balance_check", "conciliacao_saldo", "saldo_banco"].includes(normalized)) {
    return "balance_check" as const;
  }
  if (["search", "busca"].includes(normalized)) return "search" as const;

  return "search" as const;
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
  const numericMatch = normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);

  if (numericMatch?.[1]) {
    const parsed = Number(numericMatch[1].replace(",", "."));
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

  const token = wordMatch[1].replace(/\s+/g, "");
  return PERCENTAGE_WORDS[token] ?? null;
}

function detectInsightTimeframe(prompt: string) {
  const normalized = normalizeText(prompt);

  if (normalized.includes("semana passada")) return "last_week" as const;
  if (
    /(esta semana|essa semana|nessa semana|da semana|na semana|por semana|semanal|semanais|semanis)/.test(normalized)
  ) {
    return "this_week" as const;
  }
  if (normalized.includes("ultimos 7 dias") || normalized.includes("últimos 7 dias")) {
    return "last_7_days" as const;
  }
  if (normalized.includes("mes passado")) return "last_month" as const;
  if (/(este mes|esse mes|nesse mes|do mes|no mes|por mes|mensal|mensais)/.test(normalized)) {
    return "this_month" as const;
  }
  if (normalized.includes("hoje")) return "today" as const;
  if (normalized.includes("ontem")) return "yesterday" as const;

  return "all_time" as const;
}

function inferInsightTipo(prompt: string) {
  const normalized = normalizeText(prompt);

  if (/(ganhei|ganho|ganhos|receita|receitas|entrada|entradas|recebi|recebimentos)/.test(normalized)) {
    return "receita" as const;
  }

  if (/(gasto|gastos|despesa|despesas|saida|saidas|paguei|pagamos)/.test(normalized)) {
    return "despesa" as const;
  }

  return undefined;
}

function normalizeRemoteInsightPlan(remote: unknown): AssistantInsightPlan | null {
  const raw = asObject(remote);

  if (!raw) {
    return null;
  }

  return assistantInsightPlanSchema.parse({
    action: normalizeInsightAction(raw.action),
    timeframe: normalizeTimeframe(raw.timeframe),
    tipo: normalizeTipo(raw.tipo),
    text: normalizeOptionalString(raw.text),
    contaId: normalizePositiveNumber(raw.contaId),
    categoriaId: normalizePositiveNumber(raw.categoriaId),
    minValor: normalizePositiveNumber(raw.minValor),
    maxValor: normalizePositiveNumber(raw.maxValor),
    percentage:
      typeof raw.percentage === "number"
        ? raw.percentage
        : typeof raw.percentage === "string"
          ? Number(raw.percentage.replace(",", "."))
          : undefined,
    answerHint:
      normalizeOptionalString(raw.answerHint) ??
      "Responder de forma objetiva com base nos dados reais do sistema.",
    motivo:
      normalizeOptionalString(raw.motivo) ??
      "Plano semantico interpretado pela IA para consulta analitica.",
  });
}

function normalizeRemoteSearchPlan(remote: unknown): AssistantSearchPlan | null {
  const raw = asObject(remote);

  if (!raw) {
    return null;
  }

  const rawFilters = asObject(raw.filters) ?? {};
  const intent = normalizeIntent(raw.intent) ?? "search";
  const minValor = normalizePositiveNumber(rawFilters.minValor);
  const maxValor = normalizePositiveNumber(rawFilters.maxValor);

  return assistantSearchPlanSchema.parse({
    intent,
    filters: {
      text: normalizeOptionalString(rawFilters.text),
      tipo: normalizeTipo(rawFilters.tipo),
      meio: detectMeio(String(rawFilters.meio ?? "")),
      contaId: normalizePositiveNumber(rawFilters.contaId),
      categoriaId: normalizePositiveNumber(rawFilters.categoriaId),
      minValor,
      maxValor,
      dateFrom: normalizeOptionalString(rawFilters.dateFrom),
      dateTo: normalizeOptionalString(rawFilters.dateTo),
      motivo:
        normalizeOptionalString(rawFilters.motivo) ??
        "Plano interpretado pela IA e normalizado para os filtros do sistema.",
    },
    answerHint:
      normalizeOptionalString(raw.answerHint) ??
      "Responder com base nos lancamentos encontrados no contexto pedido.",
  });
}

function normalizeRemoteAssistantReply(remote: unknown) {
  const raw = asObject(remote);

  if (!raw) {
    return null;
  }

  const answer = normalizeOptionalString(raw.answer);

  if (!answer) {
    return null;
  }

  return { answer };
}

function normalizeRemoteQuickAddSuggestion(remote: unknown): QuickAddSuggestion | null {
  const raw = asObject(remote);

  if (!raw) {
    return null;
  }

  const valorTotal = normalizePositiveNumber(raw.valorTotal);
  const contaId = normalizePositiveNumber(raw.contaId);
  const categoriaId = normalizePositiveNumber(raw.categoriaId);

  if (!valorTotal || !contaId || !categoriaId) {
    return null;
  }

  return quickAddSuggestionSchema.parse({
    descricao: normalizeOptionalString(raw.descricao) ?? "Lancamento rapido",
    tipo: normalizeTipo(raw.tipo) ?? "despesa",
    status:
      raw.status === "previsto" || raw.status === "pendente" || raw.status === "liquidado"
        ? raw.status
        : "liquidado",
    meio: detectMeio(String(raw.meio ?? "")),
    valorTotal,
    competenciaData:
      normalizeOptionalString(raw.competenciaData) ?? formatDate(new Date()),
    competenciaHora: normalizeOptionalTime(raw.competenciaHora),
    vencimentoData: normalizeOptionalString(raw.vencimentoData),
    contaId,
    categoriaId,
    confianca:
      typeof raw.confianca === "number" && raw.confianca >= 0 && raw.confianca <= 1
        ? raw.confianca
        : 0.7,
    motivo:
      normalizeOptionalString(raw.motivo) ??
      "Rascunho interpretado pela IA e normalizado para o sistema.",
  });
}

function normalizeAccountType(value: unknown) {
  const normalized = normalizeText(String(value ?? ""));

  if (["carteira"].includes(normalized)) return "carteira" as const;
  if (["corrente", "conta corrente", "banco"].includes(normalized)) return "corrente" as const;
  if (["poupanca", "poupança"].includes(normalized)) return "poupanca" as const;
  if (["cartao_credito", "cartao de credito", "cartão de crédito", "cartao"].includes(normalized)) {
    return "cartao_credito" as const;
  }
  if (["investimento", "corretora"].includes(normalized)) return "investimento" as const;
  if (["caixa"].includes(normalized)) return "caixa" as const;
  if (["outro"].includes(normalized)) return "outro" as const;

  return undefined;
}

function normalizeRemoteCreateAccountSuggestion(remote: unknown): CreateAccountSuggestion | null {
  const raw = asObject(remote);

  if (!raw) {
    return null;
  }

  const tipo = normalizeAccountType(raw.tipo);

  if (!tipo) {
    return null;
  }

  const instituicao = normalizeOptionalString(raw.instituicao);

  return createAccountSuggestionSchema.parse({
    nome: sanitizeAccountName(normalizeOptionalString(raw.nome) ?? "Nova conta", instituicao),
    tipo,
    instituicao,
    saldoInicial: normalizePositiveNumber(raw.saldoInicial) ?? 0,
    confianca:
      typeof raw.confianca === "number" && raw.confianca >= 0 && raw.confianca <= 1
        ? raw.confianca
        : 0.72,
    motivo:
      normalizeOptionalString(raw.motivo) ??
      "Rascunho de conta interpretado pela IA e normalizado para o sistema.",
  });
}

function hasExplicitDateCue(prompt: string) {
  return /\b(hoje|agora|ontem|amanha|20\d{2}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i.test(
    prompt,
  );
}

function findQuickAddConta(prompt: string, contas: SelectOption[]) {
  const explicit = findMentionedOption(prompt, contas);

  if (explicit) {
    return explicit;
  }

  const normalized = normalizeText(prompt);
  const wantsLucas = /\blucas\b/.test(normalized);

  if (/\bpix\b/.test(normalized) || /\bpic\b/.test(normalized)) {
    return (
      contas.find(
        (item) =>
          item.tipo !== "cartao_credito" &&
          /\binter\b/.test(normalizeText(item.nome)) &&
          (!wantsLucas || /\blucas\b/.test(normalizeText(item.nome))),
      ) ??
      contas.find(
        (item) =>
          item.tipo !== "cartao_credito" &&
          (!wantsLucas || /\blucas\b/.test(normalizeText(item.nome))),
      ) ??
      null
    );
  }

  if (/(cartao de credito|cartão de crédito|credito|crédito|cartao|cartão)/.test(normalized)) {
    return contas.find((item) => item.tipo === "cartao_credito" || /(credito|crédito|cartao|cartão)/.test(normalizeText(item.nome))) ?? null;
  }

  return null;
}

function findPreferredContaByFlow(
  prompt: string,
  contas: SelectOption[],
  tipo: "receita" | "despesa" | "ajuste" | "transferencia",
  meio?: QuickAddSuggestion["meio"],
) {
  const normalized = normalizeText(prompt);
  const wantsLucas = /\blucas\b/.test(normalized);
  const nonCreditLucas = contas.filter(
    (item) => item.tipo !== "cartao_credito" && (!wantsLucas || /\blucas\b/.test(normalizeText(item.nome))),
  );

  if (tipo === "receita" || meio === "pix" || meio === "transferencia" || meio === "ted_doc") {
    return (
      nonCreditLucas.find((item) => /\binter\b/.test(normalizeText(item.nome))) ??
      nonCreditLucas[0] ??
      contas.find((item) => item.tipo !== "cartao_credito") ??
      null
    );
  }

  if (tipo === "despesa" && meio === "credito") {
    return (
      contas.find((item) => item.tipo === "cartao_credito") ??
      contas.find((item) => /(credito|crédito|cartao|cartão)/.test(normalizeText(item.nome))) ??
      null
    );
  }

  return null;
}

function findPreferredTransferDestination(prompt: string, contas: SelectOption[], sourceContaId?: number) {
  const normalized = normalizeText(prompt);
  const candidates = contas.filter(
    (item) => item.id !== sourceContaId && (item.tipo === "poupanca" || item.tipo === "investimento"),
  );

  if (candidates.length === 0) {
    return null;
  }

  return (
    candidates.find((item) => /porq|reserva|invest|cdb/.test(normalizeText(item.nome))) ??
    candidates.find((item) => normalized.includes(normalizeText(item.nome).slice(0, 8))) ??
    candidates[0] ??
    null
  );
}

function applyQuickAddPromptOverrides(
  prompt: string,
  suggestion: QuickAddSuggestion,
  contas: SelectOption[],
  categorias: CategoriaOption[],
) {
  const next = { ...suggestion };
  const explicitTipo = detectExplicitTipo(prompt);
  const detectedTipo = explicitTipo ?? next.tipo;
  const explicitMeio = detectMeio(prompt);
  const detectedMeio = explicitMeio ?? next.meio;
  const explicitCategoria = findMentionedCategoria(prompt, categorias);
  const explicitConta = findQuickAddConta(prompt, contas);
  const preferredConta = explicitConta ?? findPreferredContaByFlow(prompt, contas, detectedTipo, detectedMeio);
  const preferredTransferDestination =
    detectedTipo === "transferencia"
      ? findPreferredTransferDestination(prompt, contas, preferredConta?.id)
      : null;
  const amount = extractAmount(prompt);

  next.tipo = detectedTipo;
  next.meio = detectedMeio;

  if (
    next.tipo === "receita" &&
    !explicitMeio &&
    /(recebimento|recebi|recebido|pix recebido|mais um recebimento)/.test(normalizeText(prompt))
  ) {
    next.meio = "pix";
  }

  if (preferredConta) {
    next.contaId = preferredConta.id;
  }

  if (detectedTipo === "transferencia") {
    if (preferredTransferDestination) {
      next.contaDestinoId = preferredTransferDestination.id;
    }
    next.categoriaId = undefined;
  } else if (explicitCategoria) {
    next.categoriaId = explicitCategoria.id;
  } else {
    const inferredCategoria =
      detectedTipo === "receita" && !hasExplicitCategoryCue(prompt)
        ? findGenericIncomeCategory(categorias)
        : keywordCategoria(prompt, categorias, detectedTipo);

    if (inferredCategoria) {
      next.categoriaId = inferredCategoria.id;
    }
  }

  if (hasExplicitDateCue(prompt)) {
    const explicitDate = extractDate(prompt);

    if (explicitDate) {
      next.competenciaData = explicitDate;
    }
  } else {
    next.competenciaData = formatDate(new Date());
  }

  const explicitTime = extractTime(prompt);

  if (explicitTime) {
    next.competenciaHora = explicitTime;
  } else if (!next.competenciaHora && shouldDefaultToCurrentTime(prompt)) {
    next.competenciaHora = formatTime(new Date());
  }

  if (amount) {
    next.valorTotal = amount;
  }

  return quickAddSuggestionSchema.parse(next);
}

function localQuickAdd(prompt: string, contas: SelectOption[], categorias: CategoriaOption[]) {
  const tipo = detectTipo(prompt);
  const valorTotal = extractAmount(prompt) ?? 0;
  const conta = findQuickAddConta(prompt, contas) ?? matchOption(prompt, contas);
  const categoria = findMentionedCategoria(prompt, categorias) ?? keywordCategoria(prompt, categorias, tipo);

  return applyQuickAddPromptOverrides(
    prompt,
    quickAddSuggestionSchema.parse({
      descricao: promptToDescription(prompt),
      tipo,
      status: "liquidado",
      meio: detectMeio(prompt),
      valorTotal,
      competenciaData: extractDate(prompt),
      competenciaHora: extractTime(prompt) ?? (shouldDefaultToCurrentTime(prompt) ? formatTime(new Date()) : undefined),
      contaId: conta?.id,
      categoriaId: categoria?.id,
      confianca: valorTotal && conta && categoria ? 0.78 : 0.45,
      motivo: conta && categoria
        ? "Interpretei valor, data e associei a conta e categoria mais provaveis."
        : "Interpretei parte do comando, mas usei defaults pela falta de contexto suficiente.",
    }),
    contas,
    categorias,
  );
}

function localQuickAddBatch(prompt: string, contas: SelectOption[], categorias: CategoriaOption[]) {
  const amounts = extractAmounts(prompt);

  if (amounts.length < 2) {
    throw new Error("Nao encontrei um lote valido de valores para criar varios lancamentos.");
  }

  const base = localQuickAdd(prompt, contas, categorias);
  const descricao = defaultDescriptionForPrompt(prompt, base.tipo, base.meio);
  const items = amounts.map((valorTotal) =>
    quickAddSuggestionSchema.parse({
      ...base,
      descricao,
      valorTotal,
      motivo: `Item do lote interpretado a partir do comando original com valor ${valorTotal.toFixed(2)}.`,
    }),
  );

  return quickAddBatchSuggestionSchema.parse({
    items,
    quantidade: items.length,
    valorTotalLote: items.reduce((sum, item) => sum + item.valorTotal, 0),
    confianca: base.confianca,
    motivo: "Interpretei o comando como criacao em lote de varios lancamentos com o mesmo contexto operacional.",
  });
}

function detectAccountType(prompt: string) {
  const normalized = normalizeText(prompt);

  if (/(cartao|cartão|credito|crédito)/.test(normalized)) return "cartao_credito" as const;
  if (/(poupanca|poupança)/.test(normalized)) return "poupanca" as const;
  if (/(investimento|corretora)/.test(normalized)) return "investimento" as const;
  if (/\bcaixa\b/.test(normalized)) return "caixa" as const;
  if (/\bcarteira\b/.test(normalized)) return "carteira" as const;
  if (/(banco|conta)/.test(normalized)) return "corrente" as const;

  return "outro" as const;
}

function detectInstitution(prompt: string) {
  const normalized = normalizeText(prompt);
  const knownInstitutions = [
    "Banco Inter",
    "Nubank",
    "Caixa",
    "Bradesco",
    "Itaú",
    "Itau",
    "Santander",
    "BB",
    "Banco do Brasil",
    "C6",
    "PicPay",
    "Mercado Pago",
    "Neon",
    "XP",
  ];

  return knownInstitutions.find((item) => normalized.includes(normalizeText(item)));
}

function promptToAccountName(prompt: string) {
  const cleaned = prompt
    .replace(/\b(adiciona|adicione|cria|crie|cadastra|cadastre|abre|abra)\b/gi, " ")
    .replace(/\b(a|o|uma|um|nova|novo|minha|meu)\b/gi, " ")
    .replace(/\b(conta|cartao|cartão|como|chamada|com nome)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "Nova conta";
  }

  return sanitizeAccountName(cleaned);
}

function localCreateAccount(prompt: string): CreateAccountSuggestion {
  const institution = detectInstitution(prompt);
  const name = promptToAccountName(prompt);

  return createAccountSuggestionSchema.parse({
    nome: name,
    tipo: detectAccountType(prompt),
    instituicao: institution,
    saldoInicial: extractAmount(prompt) ?? 0,
    confianca: institution ? 0.84 : 0.7,
    motivo: "Interpretei o pedido como criacao de conta e extraí nome, tipo e instituicao mais provaveis.",
  });
}

function localRenameAccount(prompt: string, contas: SelectOption[]): RenameAccountSuggestion | null {
  const normalized = normalizeText(prompt);
  const renameMatch = normalized.match(
    /(?:altera|altera a|alterar|renomeia|renomear|muda|mudar)\s+(.+?)\s+(?:para|pra)\s+(.+)/,
  );

  if (!renameMatch) {
    return null;
  }

  const currentNameFragment = renameMatch[1]?.trim();
  const newNameFragment = renameMatch[2]?.trim();

  if (!currentNameFragment || !newNameFragment) {
    return null;
  }

  const conta =
    contas.find((item) => normalizeText(item.nome) === currentNameFragment) ??
    contas.find((item) => normalizeText(item.nome).includes(currentNameFragment)) ??
    contas.find((item) => currentNameFragment.includes(normalizeText(item.nome))) ??
    null;

  if (!conta) {
    return null;
  }

  return renameAccountSuggestionSchema.parse({
    contaId: conta.id,
    nomeAtual: conta.nome,
    novoNome: sanitizeAccountName(newNameFragment),
    confianca: 0.9,
    motivo: "Interpretei o pedido como renomeacao de conta a partir do nome atual e do novo nome informados.",
  });
}

function localKeepAccounts(prompt: string, contas: SelectOption[]): KeepAccountsSuggestion | null {
  const normalized = normalizeText(prompt);

  if (!/(manter|deixa|deixar|ficar|usa|usar).*(apenas|so|só)/.test(normalized)) {
    return null;
  }

  const normalizedPromptReference = normalizeAccountReference(prompt);
  const matched = contas.filter((conta) => {
    const fullName = normalizeText(conta.nome);
    const reference = normalizeAccountReference(conta.nome);

    return (
      normalized.includes(fullName) ||
      normalizedPromptReference.includes(reference) ||
      reference.includes(normalizedPromptReference) ||
      reference
        .split(" ")
        .filter(Boolean)
        .every((token) => normalizedPromptReference.includes(token))
    );
  });

  if (matched.length === 0) {
    return null;
  }

  const uniqueMatched = matched.filter(
    (conta, index, list) => list.findIndex((item) => item.id === conta.id) === index,
  );
  const desativar = contas.filter((conta) => !uniqueMatched.some((item) => item.id === conta.id));

  return keepAccountsSuggestionSchema.parse({
    manterContaIds: uniqueMatched.map((item) => item.id),
    manterNomes: uniqueMatched.map((item) => item.nome),
    desativarContaIds: desativar.map((item) => item.id),
    desativarNomes: desativar.map((item) => item.nome),
    confianca: 0.88,
    motivo: "Interpretei o pedido como manter somente as origens citadas e desativar as demais.",
  });
}

function buildFilterFromPrompt(
  prompt: string,
  contas: SelectOption[],
  categorias: CategoriaOption[],
) {
  const normalized = normalizeText(prompt);
  const conta = findMentionedOption(prompt, contas);
  const categoria = findMentionedCategoria(prompt, categorias);
  const amount = extractAmount(prompt);
  const meio = detectMeio(prompt);
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  if (normalized.includes("semana passada")) {
    const bounds = weekBounds(-1);
    dateFrom = bounds.from;
    dateTo = bounds.to;
  } else if (normalized.includes("esta semana") || normalized.includes("essa semana") || normalized.includes("nessa semana") || normalized.includes("da semana")) {
    const bounds = weekBounds(0);
    dateFrom = bounds.from;
    dateTo = bounds.to;
  } else if (normalized.includes("ultimos 7 dias") || normalized.includes("últimos 7 dias")) {
    const bounds = rollingDaysBounds(7);
    dateFrom = bounds.from;
    dateTo = bounds.to;
  } else if (normalized.includes("mes passado")) {
    const bounds = monthBounds(-1);
    dateFrom = bounds.from;
    dateTo = bounds.to;
  } else if (normalized.includes("este mes") || normalized.includes("nesse mes")) {
    const bounds = monthBounds(0);
    dateFrom = bounds.from;
    dateTo = bounds.to;
  } else if (normalized.includes("hoje")) {
    dateFrom = formatDate(new Date());
    dateTo = formatDate(new Date());
  } else if (normalized.includes("ontem")) {
    const yesterday = formatDate(shiftDays(new Date(), -1));
    dateFrom = yesterday;
    dateTo = yesterday;
  }

  const tipo = /(receita|receitas|ganhos|entradas)/.test(normalized)
    ? "receita"
    : /(despesa|despesas|gasto|gastos)/.test(normalized)
      ? "despesa"
      : undefined;

  const minValor =
    /(acima de|maior que|mais de)/.test(normalized) && amount ? amount : undefined;
  const maxValor =
    /(abaixo de|menor que|ate)/.test(normalized) && amount ? amount : undefined;

  const text = normalizeSearchText(prompt);

  return aiSearchFilterSchema.parse({
    text,
    tipo,
    meio,
    contaId: conta?.id,
    categoriaId: categoria?.id,
    minValor,
    maxValor,
    dateFrom,
    dateTo,
    motivo: "Interpretei os filtros mais provaveis a partir do texto informado.",
  });
}

function mergeSearchFilters(base: AiSearchFilter, update: Partial<AiSearchFilter>) {
  return aiSearchFilterSchema.parse({
    ...base,
    ...update,
    motivo: update.motivo ?? base.motivo,
  });
}

function clearFiltersWithoutExplicitMention(
  prompt: string,
  filters: AiSearchFilter,
  contas: SelectOption[],
  categorias: CategoriaOption[],
) {
  const explicitConta = findMentionedOption(prompt, contas);
  const explicitCategoria = findMentionedCategoria(prompt, categorias);
  const normalized = normalizeText(prompt);
  const genericSearch =
    /(ultimo|ultima|mais recente|maior despesa|despesa maior|maior receita|quanto gastei|quanto recebi|quanto entrou)/.test(
      normalized,
    );

  return aiSearchFilterSchema.parse({
    ...filters,
    contaId: explicitConta ? filters.contaId : undefined,
    categoriaId: explicitCategoria ? filters.categoriaId : undefined,
    meio: detectMeio(prompt) ?? filters.meio,
    text: genericSearch ? undefined : normalizeSearchText(filters.text),
    motivo: filters.motivo,
  });
}

function extractRelativeDateFilter(prompt: string) {
  const normalized = normalizeText(prompt);

  if (normalized.includes("semana passada")) {
    const bounds = weekBounds(-1);
    return {
      dateFrom: bounds.from,
      dateTo: bounds.to,
    };
  }

  if (
    normalized.includes("esta semana") ||
    normalized.includes("essa semana") ||
    normalized.includes("nessa semana") ||
    normalized.includes("da semana")
  ) {
    const bounds = weekBounds(0);
    return {
      dateFrom: bounds.from,
      dateTo: bounds.to,
    };
  }

  if (normalized.includes("ultimos 7 dias") || normalized.includes("últimos 7 dias")) {
    const bounds = rollingDaysBounds(7);
    return {
      dateFrom: bounds.from,
      dateTo: bounds.to,
    };
  }

  if (normalized.includes("mes passado")) {
    const bounds = monthBounds(-1);
    return {
      dateFrom: bounds.from,
      dateTo: bounds.to,
    };
  }

  if (normalized.includes("este mes") || normalized.includes("nesse mes")) {
    const bounds = monthBounds(0);
    return {
      dateFrom: bounds.from,
      dateTo: bounds.to,
    };
  }

  if (normalized.includes("hoje")) {
    const today = formatDate(new Date());
    return {
      dateFrom: today,
      dateTo: today,
    };
  }

  if (normalized.includes("ontem")) {
    const yesterday = formatDate(shiftDays(new Date(), -1));
    return {
      dateFrom: yesterday,
      dateTo: yesterday,
    };
  }

  return null;
}

function looksLikeSearchRefinement(prompt: string) {
  const normalized = normalizeText(prompt);

  return (
    /^(e |agora|mas|so |só |apenas|somente)/.test(normalized) ||
    /\b(despesa|despesas|receita|receitas|mercado|farmacia|lazer|moradia|transporte|saude|salario|freelance)\b/.test(
      normalized,
    ) ||
    /\b(este mes|nesse mes|mes passado|hoje|ontem|acima de|abaixo de|na conta|no cartao|cartao|conta)\b/.test(
      normalized,
    )
  );
}

export function refineAssistantSearchPlan(
  prompt: string,
  previousPlan: AssistantSearchPlan | undefined,
  contas: SelectOption[],
  categorias: CategoriaOption[],
) {
  if (!previousPlan || !looksLikeSearchRefinement(prompt)) {
    return null;
  }

  const normalized = normalizeText(prompt);
  const explicitConta = findMentionedOption(prompt, contas);
  const explicitCategoria = findMentionedCategoria(prompt, categorias);
  const amount = extractAmount(prompt);
  const dateFilter = extractRelativeDateFilter(prompt);
  const explicitMeio = detectMeio(prompt);

  const update: Partial<AiSearchFilter> = {
    motivo: "Refinei os filtros com base no contexto anterior da conversa.",
  };

  if (/\b(receita|receitas)\b/.test(normalized)) {
    update.tipo = "receita";
  } else if (/\b(despesa|despesas|gasto|gastos)\b/.test(normalized)) {
    update.tipo = "despesa";
  } else if (/\b(ajuste|ajustes)\b/.test(normalized)) {
    update.tipo = "ajuste";
  } else if (/\b(todos|todas|geral)\b/.test(normalized)) {
    update.tipo = undefined;
  }

  if (explicitConta) {
    update.contaId = explicitConta.id;
  }

  if (explicitCategoria) {
    update.categoriaId = explicitCategoria.id;
  }

  if (explicitMeio) {
    update.meio = explicitMeio;
  }

  if (dateFilter) {
    update.dateFrom = dateFilter.dateFrom;
    update.dateTo = dateFilter.dateTo;
  }

  if (/(acima de|maior que|mais de)/.test(normalized) && amount) {
    update.minValor = amount;
  }

  if (/(abaixo de|menor que|ate)/.test(normalized) && amount) {
    update.maxValor = amount;
  }

  const text = normalizeSearchText(prompt);

  if (text && !/^(e|agora|mas|so|só|apenas|somente)$/i.test(text)) {
    update.text = text;
  }

  return assistantSearchPlanSchema.parse({
    intent: previousPlan.intent,
    filters: mergeSearchFilters(previousPlan.filters, update),
    answerHint: previousPlan.answerHint,
  });
}

export function stabilizeAssistantSearchPlan(
  prompt: string,
  plan: AssistantSearchPlan,
  contas: SelectOption[],
  categorias: CategoriaOption[],
) {
  return assistantSearchPlanSchema.parse({
    ...plan,
    filters: clearFiltersWithoutExplicitMention(prompt, plan.filters, contas, categorias),
  });
}

function localSearchPlan(
  prompt: string,
  contas: SelectOption[],
  categorias: CategoriaOption[],
): AssistantSearchPlan {
  const normalized = normalizeText(prompt);
  const filters = buildFilterFromPrompt(prompt, contas, categorias);

  if (/(resumo|resumir|resuma|sumario|sumário|visao geral|visão geral)/.test(normalized)) {
    return assistantSearchPlanSchema.parse({
      intent: "summary",
      filters: {
        ...filters,
      },
      answerHint: "Montar um resumo financeiro do periodo pedido com receitas, despesas e saldo.",
    });
  }

  if (/(ultimo|ultima|mais recente).*(lancamento|compra|movimentacao)|qual foi o ultimo/.test(normalized)) {
    return assistantSearchPlanSchema.parse({
      intent: "latest_transaction",
      filters: {
        ...filters,
        text: undefined,
      },
      answerHint: "Encontrar o lancamento mais recente com base no contexto atual.",
    });
  }

  if (/(maior gasto|gasto mais alto|despesa mais alta|despesa maior)/.test(normalized)) {
    return assistantSearchPlanSchema.parse({
      intent: "largest_expense",
      filters: {
        ...filters,
        tipo: "despesa",
      },
      answerHint: "Encontrar a maior despesa dentro dos filtros entendidos.",
    });
  }

  if (/(maior receita|receita mais alta|ganho mais alto|entrada maior)/.test(normalized)) {
    return assistantSearchPlanSchema.parse({
      intent: "largest_income",
      filters: {
        ...filters,
        tipo: "receita",
      },
      answerHint: "Encontrar a maior receita dentro dos filtros entendidos.",
    });
  }

  if (/(quanto gastei|quanto gastamos|total gasto|quanto foi gasto|quanto recebi|quanto entrou|total de receitas)/.test(normalized)) {
    const tipo = /(recebi|entrou|receitas)/.test(normalized) ? "receita" : "despesa";

    return assistantSearchPlanSchema.parse({
      intent: "summary",
      filters: {
        ...filters,
        tipo,
        meio: filters.meio,
        text: filters.categoriaId ? undefined : filters.text,
      },
      answerHint: "Calcular um total resumido dentro do periodo e contexto pedidos.",
    });
  }

  return assistantSearchPlanSchema.parse({
    intent: "search",
    filters,
    answerHint: "Executar busca de lancamentos usando os filtros interpretados.",
  });
}

async function callOpenAICompatibleJson<T>({
  apiKey,
  baseUrl,
  model,
  system,
  prompt,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  prompt: string;
}) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: {
        type: "json_object",
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const jsonText = data.choices?.[0]?.message?.content as string | undefined;

  if (!jsonText) {
    return null;
  }

  return JSON.parse(jsonText) as T;
}

function getAiRuntime() {
  if (process.env.GROQ_API_KEY) {
    return {
      provider: "groq" as const,
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai" as const,
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    };
  }

  return null;
}

export async function suggestQuickAdd(
  prompt: string,
  contas: SelectOption[],
  categorias: CategoriaOption[],
): Promise<{ provider: AiProvider; suggestion: QuickAddSuggestion }> {
  const system = `Converta o texto do usuario em um rascunho de lancamento financeiro.
Responda apenas com JSON valido contendo:
descricao, tipo, status, meio, valorTotal, competenciaData, competenciaHora, vencimentoData, contaId, categoriaId, confianca, motivo.
Valores aceitos:
- tipo: receita, despesa ou ajuste
- status: previsto, pendente ou liquidado
- meio: pix, debito, credito, dinheiro, ted_doc, transferencia ou outro
Use apenas ids de conta e categoria fornecidos no contexto.
Contexto contas: ${JSON.stringify(contas)}
Contexto categorias: ${JSON.stringify(categorias)}`;

  const runtime = getAiRuntime();

  try {
    if (runtime) {
      const remote = await callOpenAICompatibleJson<QuickAddSuggestion>({
        apiKey: runtime.apiKey,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        system,
        prompt,
      });

      if (remote) {
        const normalized = normalizeRemoteQuickAddSuggestion(remote);

        if (!normalized) {
          throw new Error("Invalid remote quick add payload.");
        }

        return {
          provider: runtime.provider,
          suggestion: applyQuickAddPromptOverrides(prompt, normalized, contas, categorias),
        };
      }
    }
  } catch {
    // fallback below
  }

  return {
    provider: "local",
    suggestion: localQuickAdd(prompt, contas, categorias),
  };
}

export async function suggestQuickAddBatch(
  prompt: string,
  contas: SelectOption[],
  categorias: CategoriaOption[],
): Promise<{ provider: AiProvider; suggestion: QuickAddBatchSuggestion }> {
  return {
    provider: "local",
    suggestion: localQuickAddBatch(prompt, contas, categorias),
  };
}

export function refineQuickAddSuggestion(
  prompt: string,
  previousSuggestion: QuickAddSuggestion | undefined,
  contas: SelectOption[],
  categorias: CategoriaOption[],
) {
  if (!previousSuggestion) {
    return null;
  }

  const normalized = normalizeText(prompt);
  const destructiveWords = /(apaga|apague|remove|remova|exclui|excluir|deleta|deletar)/.test(
    normalized,
  );
  const explicitMeio = detectMeio(prompt);
  const explicitCategoria = findMentionedCategoria(prompt, categorias);
  const explicitConta = findQuickAddConta(prompt, contas);
  const explicitTipo = detectExplicitTipo(prompt);
  const looksLikeRefinement =
    /\b(categoria|origem|conta|cartao|cartão|hoje|agora|ontem|amanha|receita|despesa|valor|tipo)\b/.test(
      normalized,
    ) ||
    hasExplicitDateCue(prompt) ||
    Boolean(explicitMeio || explicitCategoria || explicitConta || explicitTipo) ||
    /(rascunho|draft|ajusta o rascunho|altera o rascunho|corrige o rascunho|pra pix|para pix)/.test(normalized);

  if (!looksLikeRefinement || destructiveWords) {
    return null;
  }

  return applyQuickAddPromptOverrides(prompt, previousSuggestion, contas, categorias);
}

export async function suggestCreateAccount(
  prompt: string,
): Promise<{ provider: AiProvider; suggestion: CreateAccountSuggestion }> {
  const system = `Converta o texto do usuario em um rascunho de nova conta financeira.
Responda apenas com JSON valido contendo:
nome, tipo, instituicao, saldoInicial, confianca, motivo.
Valores aceitos para tipo:
- carteira
- corrente
- poupanca
- cartao_credito
- investimento
- caixa
- outro`;

  const runtime = getAiRuntime();

  try {
    if (runtime) {
      const remote = await callOpenAICompatibleJson<CreateAccountSuggestion>({
        apiKey: runtime.apiKey,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        system,
        prompt,
      });

      if (remote) {
        const normalized = normalizeRemoteCreateAccountSuggestion(remote);

        if (!normalized) {
          throw new Error("Invalid remote create account payload.");
        }

        return {
          provider: runtime.provider,
          suggestion: normalized,
        };
      }
    }
  } catch {
    // fallback below
  }

  return {
    provider: "local",
    suggestion: localCreateAccount(prompt),
  };
}

export async function suggestRenameAccount(
  prompt: string,
  contas: SelectOption[],
): Promise<{ provider: AiProvider; suggestion: RenameAccountSuggestion }> {
  const suggestion = localRenameAccount(prompt, contas);

  if (!suggestion) {
    throw new Error("Nao consegui interpretar a renomeacao da conta.");
  }

  return {
    provider: "local",
    suggestion,
  };
}

export async function suggestKeepAccounts(
  prompt: string,
  contas: SelectOption[],
): Promise<{ provider: AiProvider; suggestion: KeepAccountsSuggestion }> {
  const suggestion = localKeepAccounts(prompt, contas);

  if (!suggestion) {
    throw new Error("Nao consegui interpretar quais origens devem permanecer ativas.");
  }

  return {
    provider: "local",
    suggestion,
  };
}

function localInsightPlan(
  prompt: string,
  contas: SelectOption[],
  categorias: CategoriaOption[],
): AssistantInsightPlan {
  const normalized = normalizeText(prompt);
  const filters = buildFilterFromPrompt(prompt, contas, categorias);
  const dateFilter = extractRelativeDateFilter(prompt);
  const timeframe = detectInsightTimeframe(prompt);

  if (
    /(o que voce faz|o que vc faz|como voce ajuda|como vc ajuda|o que consegue fazer|o que eu posso pedir|como posso usar|me ajuda a usar|me ajude a usar|que tipo de comando|quais comandos)/.test(
      normalized,
    )
  ) {
    return assistantInsightPlanSchema.parse({
      action: "chat",
      timeframe: "all_time",
      answerHint: "Explicar capacidades do assistente com exemplos práticos e linguagem natural.",
      motivo: "Pedido de ajuda geral sobre o assistente identificado localmente.",
    });
  }

  if (/(resumo|resumir|resuma|sumario|sumário|balanco|balanço|visao geral|visão geral)/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "summary",
      timeframe,
      ...filters,
      answerHint: "Gerar um resumo financeiro do periodo pedido.",
      motivo: "Pergunta de resumo financeiro identificada localmente.",
    });
  }

  if (
    /(com o que .*(gastei|gastamos) mais|onde .*(gastei|gastamos) mais|aonde .*(gastei|gastamos) mais|maior gasto|despesa mais alta|gasto mais alto)/.test(normalized)
  ) {
    return assistantInsightPlanSchema.parse({
      action: "top_spend",
      timeframe,
      tipo: "despesa",
      ...filters,
      answerHint: "Apontar categoria e despesa de maior peso no periodo.",
      motivo: "Pergunta sobre maior gasto identificada localmente.",
    });
  }

  if (/(entrada|entradas|receita|receitas|ganhei|recebi)/.test(normalized) && /(por onde|de onde|origem|origens|vieram|veio)/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "income_by_origin",
      timeframe,
      tipo: "receita",
      ...filters,
      answerHint: "Resumir entradas por origem e deixar claro o periodo consultado.",
      motivo: "Pergunta sobre entradas por origem identificada localmente.",
    });
  }

  if (/(melhores entradas|maiores entradas|maior entrada|entrada mais alta|por qual metodo|por qual metodo entraram)/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "top_income_entries",
      timeframe,
      tipo: "receita",
      ...filters,
      answerHint: "Listar as principais entradas com valor, data, meio e origem.",
      motivo: "Pergunta sobre melhores entradas identificada localmente.",
    });
  }

  if (/(qual o dia|que dia|dia que).*(gastei|gastamos|mais dinheiro|maior gasto)/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "top_spend_day",
      timeframe,
      tipo: "despesa",
      ...filters,
      answerHint: "Apontar o dia com maior gasto no periodo consultado.",
      motivo: "Pergunta sobre dia com maior gasto identificada localmente.",
    });
  }

  if (/(tomar cuidado|ficar atento|preocupa|preocupando|onde devo cortar|maior risco)/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "risk_review",
      timeframe: timeframe === "all_time" ? "this_month" : timeframe,
      tipo: "despesa",
      ...filters,
      answerHint: "Apontar categorias de despesa que merecem atencao.",
      motivo: "Pergunta de alerta financeiro identificada localmente.",
    });
  }

  const requestedPercentage = extractRequestedPercentage(prompt);

  if (requestedPercentage && inferInsightTipo(prompt)) {
    return assistantInsightPlanSchema.parse({
      action: "percentage",
      timeframe: timeframe === "all_time" ? "this_month" : timeframe,
      tipo: inferInsightTipo(prompt),
      percentage: requestedPercentage,
      ...filters,
      answerHint: "Calcular o percentual pedido sobre o total do periodo.",
      motivo: "Pergunta de percentual financeiro identificada localmente.",
    });
  }

  if (/(media|média)/.test(normalized) && inferInsightTipo(prompt)) {
    return assistantInsightPlanSchema.parse({
      action: "average",
      timeframe: timeframe === "all_time" ? "this_month" : timeframe,
      tipo: inferInsightTipo(prompt),
      ...filters,
      answerHint: "Calcular media por lancamento e media diaria no periodo pedido.",
      motivo: "Pergunta de media financeira identificada localmente.",
    });
  }

  if (/(nesse ritmo|neste ritmo|se continuar|se continuarmos|projecao|projeção|cenario|cenário|simular|simulação)/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "projection",
      timeframe: timeframe === "all_time" ? "this_month" : timeframe,
      tipo: inferInsightTipo(prompt),
      ...filters,
      answerHint: "Projetar o fechamento do periodo mantendo o ritmo atual.",
      motivo: "Pergunta de projeção financeira identificada localmente.",
    });
  }

  if (/(saldo.*(banco|conta).*(diferente|errado|faltando|sobrando)|no meu banco.*(faltando|sobrando)|saldo em conta|quanto tenho no banco)/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "balance_check",
      timeframe: "all_time",
      answerHint: "Comparar saldo em conta, entradas, despesas e saidas da conta para explicar divergencias.",
      motivo: "Pergunta de conciliacao de saldo identificada localmente.",
    });
  }

  if (/(ultimo|ultima|mais recente).*(lancamento|compra|movimentacao)|qual foi o ultimo/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "latest_transaction",
      timeframe,
      tipo: filters.tipo,
      text: undefined,
      contaId: filters.contaId,
      categoriaId: filters.categoriaId,
      minValor: filters.minValor,
      maxValor: filters.maxValor,
      answerHint: "Encontrar o lancamento mais recente.",
      motivo: "Pergunta sobre ultimo lancamento identificada localmente.",
    });
  }

  if (/(maior gasto|gasto mais alto|despesa mais alta|despesa maior)/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "largest_expense",
      timeframe,
      tipo: "despesa",
      ...filters,
      answerHint: "Encontrar a maior despesa.",
      motivo: "Pergunta sobre maior despesa identificada localmente.",
    });
  }

  if (/(maior receita|receita mais alta|ganho mais alto|entrada maior)/.test(normalized)) {
    return assistantInsightPlanSchema.parse({
      action: "largest_income",
      timeframe,
      tipo: "receita",
      ...filters,
      answerHint: "Encontrar a maior receita.",
      motivo: "Pergunta sobre maior receita identificada localmente.",
    });
  }

  return assistantInsightPlanSchema.parse({
    action: "search",
    timeframe,
    tipo: filters.tipo,
    text: filters.text,
    contaId: filters.contaId,
    categoriaId: filters.categoriaId,
    minValor: filters.minValor,
    maxValor: filters.maxValor,
    answerHint: "Executar busca de lancamentos.",
    motivo: dateFilter ? "Busca com periodo interpretado localmente." : "Busca geral identificada localmente.",
  });
}

export async function planAssistantInsight(
  prompt: string,
  contas: SelectOption[],
  categorias: CategoriaOption[],
): Promise<{ provider: AiProvider; plan: AssistantInsightPlan }> {
  const system = `Classifique a mensagem do usuario em uma acao de assistente financeiro.
Responda apenas com JSON valido contendo:
action, timeframe, tipo, text, contaId, categoriaId, minValor, maxValor, percentage, answerHint, motivo.
Valores aceitos para action:
- chat
- inventory
- latest_transaction
- largest_expense
- largest_income
- summary
- top_spend
 - income_by_origin
 - top_income_entries
 - top_spend_day
- risk_review
- percentage
- average
- projection
 - balance_check
- search
Valores aceitos para timeframe:
- all_time
- today
- yesterday
- this_week
- last_week
- last_7_days
- this_month
- last_month
Use apenas ids de conta e categoria fornecidos no contexto.
Data atual: ${formatDate(new Date())}
Contexto contas: ${JSON.stringify(contas)}
Contexto categorias: ${JSON.stringify(categorias)}`;

  const runtime = getAiRuntime();

  try {
    if (runtime) {
      const remote = await callOpenAICompatibleJson<AssistantInsightPlan>({
        apiKey: runtime.apiKey,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        system,
        prompt,
      });

      if (remote) {
        const normalized = normalizeRemoteInsightPlan(remote);

        if (!normalized) {
          throw new Error("Invalid remote insight payload.");
        }

        return {
          provider: runtime.provider,
          plan: normalized,
        };
      }
    }
  } catch {
    // fallback below
  }

  return {
    provider: "local",
    plan: localInsightPlan(prompt, contas, categorias),
  };
}

export async function planAssistantSearch(
  prompt: string,
  contas: SelectOption[],
  categorias: CategoriaOption[],
): Promise<{ provider: AiProvider; plan: AssistantSearchPlan }> {
  const system = `Converta o texto do usuario em um plano de consulta de lancamentos.
Responda apenas com JSON valido contendo:
intent, filters, answerHint.
Valores aceitos para intent:
- search
- latest_transaction
- largest_expense
- largest_income
- summary
Em filters, use:
text, tipo, contaId, categoriaId, minValor, maxValor, dateFrom, dateTo, motivo.
Valores aceitos para tipo:
- receita
- despesa
- ajuste
Se algum filtro nao existir, retorne null ou omita o campo.
Use apenas ids de conta e categoria fornecidos no contexto.
Contexto contas: ${JSON.stringify(contas)}
Contexto categorias: ${JSON.stringify(categorias)}`;

  const runtime = getAiRuntime();

  try {
    if (runtime) {
      const remote = await callOpenAICompatibleJson<AssistantSearchPlan>({
        apiKey: runtime.apiKey,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        system,
        prompt,
      });

      if (remote) {
        const normalized = normalizeRemoteSearchPlan(remote);

        if (!normalized) {
          throw new Error("Invalid remote search payload.");
        }

        return {
          provider: runtime.provider,
          plan: normalized,
        };
      }
    }
  } catch {
    // fallback below
  }

  return {
    provider: "local",
    plan: localSearchPlan(prompt, contas, categorias),
  };
}

export async function composeAssistantReply(input: {
  prompt: string;
  fallback: string;
  facts?: string[];
  style?: "chat" | "result" | "not_found";
}): Promise<{ provider: AiProvider; answer: string }> {
  const runtime = getAiRuntime();

  if (!runtime) {
    return {
      provider: "local",
      answer: input.fallback,
    };
  }

  const system = `Voce e o assistente do LT CashFlow.
Responda em pt-BR, com tom humano, claro e objetivo.
Regras:
- use apenas os fatos fornecidos
- nao invente numeros, datas, lancamentos ou capacidades
- se o estilo for not_found, explique de forma natural e sugira como o usuario pode reformular
- se o estilo for chat, fale como assistente do produto e cite exemplos praticos
- mantenha a resposta curta, util e conversacional
Responda apenas com JSON valido no formato: {"answer":"..."}.`;

  const prompt = `Estilo: ${input.style ?? "result"}

Pedido do usuario:
${input.prompt}

Fatos confirmados:
${(input.facts ?? []).map((fact) => `- ${fact}`).join("\n") || "- Nenhum fato adicional."}

Resposta base obrigatoriamente fiel:
${input.fallback}`;

  try {
    const remote = await callOpenAICompatibleJson<{ answer?: string }>({
      apiKey: runtime.apiKey,
      baseUrl: runtime.baseUrl,
      model: runtime.model,
      system,
      prompt,
    });

    const normalized = normalizeRemoteAssistantReply(remote);

    if (normalized) {
      return {
        provider: runtime.provider,
        answer: normalized.answer,
      };
    }
  } catch {
    // fallback below
  }

  return {
    provider: "local",
    answer: input.fallback,
  };
}
```

---

## `apps/web/src/lib/server/repository.ts`

```typescript
import "server-only";

import type { LancamentoMeio } from "@ltcashflow/validation";
import { pool } from "@ltcashflow/db";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type UserRow = RowDataPacket & {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
};

export type GestaoRow = RowDataPacket & {
  id: number;
  nome: string;
  descricao: string | null;
  tipo: "pessoal" | "familiar" | "profissional" | "projeto";
  inicio_em?: Date;
  percentual_reserva: string | null;
  papel?: GestaoMemberRole;
};

export type GestaoMemberRole = "proprietario" | "administrador" | "editor" | "visualizador";

export type ContaRow = RowDataPacket & {
  id: number;
  nome: string;
  tipo: string;
  instituicao: string | null;
  saldo_inicial: string | null;
  saldo_inicial_em: string | null;
};

export type CategoriaRow = RowDataPacket & {
  id: number;
  nome: string;
  natureza: "receita" | "despesa" | "ambos";
};

export type LancamentoRow = RowDataPacket & {
  id: number;
  conta_id: number;
  conta_destino_id: number | null;
  conta_destino_tipo: string | null;
  categoria_id: number | null;
  criado_por_usuario_id: number | null;
  tipo: string;
  status: string;
  meio: LancamentoMeio | null;
  descricao: string;
  valor_total: string;
  competencia_data: string;
  competencia_hora: string | null;
  vencimento_data: string | null;
  categoria_nome: string | null;
  conta_nome: string;
  conta_destino_nome: string | null;
  conta_tipo: string;
  is_abertura?: boolean;
};

type LancamentoListItem = {
  id: number;
  conta_id: number;
  conta_destino_id: number | null;
  conta_destino_tipo: string | null;
  categoria_id: number | null;
  criado_por_usuario_id: number | null;
  tipo: string;
  status: string;
  meio: LancamentoMeio | null;
  descricao: string;
  valor_total: string;
  competencia_data: string;
  competencia_hora: string | null;
  vencimento_data: string | null;
  categoria_nome: string | null;
  conta_nome: string;
  conta_destino_nome: string | null;
  conta_tipo: string;
  is_abertura?: boolean;
};

export type SearchLancamentosInput = {
  gestaoId: number;
  text?: string;
  tipo?: "receita" | "despesa" | "ajuste" | "transferencia";
  meio?: "pix" | "debito" | "credito" | "dinheiro" | "ted_doc" | "transferencia" | "outro";
  contaId?: number;
  categoriaId?: number;
  minValor?: number;
  maxValor?: number;
  dateFrom?: string;
  dateTo?: string;
};

export type SummaryRow = RowDataPacket & {
  receitas: string | null;
  despesas: string | null;
  saldo: string | null;
};

export type AvailableBalanceRow = RowDataPacket & {
  saldo_disponivel: string | null;
};

export type CashOverviewRow = RowDataPacket & {
  entradas_em_conta: string | null;
  despesas: string | null;
  saidas_da_conta: string | null;
};

export type PeriodResumoRow = RowDataPacket & {
  receitas: string | null;
  despesas: string | null;
  guardado: string | null;
  credito: string | null;
  debito: string | null;
  pix: string | null;
  total: string | null;
  abertura: string | null;
};

export type ContaCorrentePeriodoResumoRow = RowDataPacket & {
  entradas: string | null;
  saidas: string | null;
  guardado: string | null;
  debito: string | null;
  pix: string | null;
  credito: string | null;
  saldo: string | null;
};

export type GestaoMembroResumoRow = RowDataPacket & {
  usuario_id: number;
  nome: string;
  email: string;
  papel: GestaoMemberRole;
  status: "ativo" | "inativo";
  receitas: string | null;
  despesas: string | null;
  total: string | null;
  movimentos: number;
};

/** Saldos agregados por natureza da conta (sem cartão de crédito). */
export type GestaoSaldosPorBucket = {
  disponivel: string;
  poupanca: string;
  investimento: string;
};

export type CashAccountBreakdownRow = RowDataPacket & {
  id: number;
  nome: string;
  tipo: string;
  saldo_inicial: string | null;
  entradas_em_conta: string | null;
  despesas: string | null;
  saidas_da_conta: string | null;
  saldo_atual: string | null;
  quantidade_movimentos: number;
};

export type CreditCardAccountRow = RowDataPacket & {
  id: number;
  nome: string;
  tipo: string;
  limite_credito: string | null;
  fechamento_dia: number | null;
  vencimento_dia: number | null;
};

export type CreditCardStatementMovementRow = RowDataPacket & {
  id: number;
  conta_id: number;
  conta_destino_id: number | null;
  tipo: "receita" | "despesa" | "transferencia" | "ajuste";
  status: "previsto" | "pendente" | "liquidado" | "cancelado";
  valor_total: string;
  competencia_data: string;
};

type SqlFilters = {
  conditions: string[];
  params: Array<string | number>;
};

async function registerAudit(input: {
  userId?: number;
  gestaoId: number;
  action: string;
  module: string;
  entity: string;
  entityId?: number;
  details?: Record<string, unknown>;
}) {
  try {
    await pool.query(
      `
        INSERT INTO auditoria (
          usuario_id,
          gestao_id,
          acao,
          modulo,
          entidade,
          entidade_id,
          origem,
          detalhes
        ) VALUES (?, ?, ?, ?, ?, ?, 'app_web', ?)
      `,
      [
        input.userId && input.userId > 0 ? input.userId : null,
        input.gestaoId,
        input.action,
        input.module,
        input.entity,
        input.entityId ?? null,
        input.details ? JSON.stringify(input.details) : null,
      ],
    );
  } catch {
    // Auditoria nunca deve bloquear o fluxo financeiro principal.
  }
}

const ORDER_BY_LANCAMENTO_RECIENTE_DESC =
  "l.competencia_data DESC, COALESCE(l.competencia_hora, TIME(l.criado_em)) DESC, l.criado_em DESC";
const ORDER_BY_LANCAMENTO_RECIENTE_ASC =
  "l.competencia_data ASC, COALESCE(l.competencia_hora, TIME(l.criado_em)) ASC, l.criado_em ASC";

/** Inclui lançamentos em que a conta aparece como origem ou destino (transferências). */
const JOIN_LANCAMENTOS_NA_CONTA =
  "LEFT JOIN lancamentos l ON (l.conta_id = ct.id OR l.conta_destino_id = ct.id)";

/** Variação de saldo por lançamento na conta `ct` após `JOIN_LANCAMENTOS_NA_CONTA`. */
const CASE_DELTA_SALDO_NA_CONTA = `
  CASE
    WHEN l.status = 'cancelado' THEN 0
    WHEN l.tipo = 'receita' THEN l.valor_total
    WHEN l.tipo = 'despesa' THEN -l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_id = ct.id THEN -l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_destino_id = ct.id THEN l.valor_total
    ELSE 0
  END
`;

const CASE_ENTRADA_NA_CONTA = `
  CASE
    WHEN l.status = 'cancelado' THEN 0
    WHEN l.tipo = 'receita' THEN l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_destino_id = ct.id THEN l.valor_total
    ELSE 0
  END
`;

const CASE_DESPESA_SEM_SAIDA_CONTA = `
  CASE
    WHEN l.status = 'cancelado' THEN 0
    WHEN l.tipo = 'despesa' AND COALESCE(c.nome, '') <> 'Saida da conta' THEN l.valor_total
    ELSE 0
  END
`;

const CASE_SAIDA_DA_CONTA_AGREGADA = `
  CASE
    WHEN l.status = 'cancelado' THEN 0
    WHEN l.tipo = 'despesa' AND c.nome = 'Saida da conta' THEN l.valor_total
    WHEN l.tipo = 'transferencia' AND l.conta_id = ct.id THEN l.valor_total
    ELSE 0
  END
`;

async function syncGestaoInicioEm(connection: PoolConnection, gestaoId: number) {
  await connection.query(
    `
      UPDATE gestoes g
      SET g.inicio_em = (
        SELECT MIN(l.competencia_data)
        FROM lancamentos l
        WHERE l.gestao_id = g.id
          AND l.status <> 'cancelado'
      )
      WHERE g.id = ?
    `,
    [gestaoId],
  );
}

export async function findUserByEmail(email: string) {
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT id, nome, email, senha_hash
      FROM usuarios
      WHERE email = ?
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  const [rows] = await pool.query<UserRow[]>(
    `
      SELECT id, nome, email, senha_hash
      FROM usuarios
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
}

export async function createUser(input: {
  nome: string;
  email: string;
  senhaHash: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO usuarios (nome, email, senha_hash)
      VALUES (?, ?, ?)
    `,
    [input.nome, input.email, input.senhaHash],
  );

  return result.insertId;
}

export async function listUserGestoes(userId: number) {
  const [rows] = await pool.query<GestaoRow[]>(
    `
      SELECT g.id, g.nome, g.descricao, g.tipo, g.inicio_em, g.percentual_reserva, gm.papel
      FROM gestoes g
      INNER JOIN gestao_membros gm
        ON gm.gestao_id = g.id
      WHERE gm.usuario_id = ?
        AND gm.status = 'ativo'
        AND g.status = 'ativa'
      ORDER BY g.criado_em ASC
    `,
    [userId],
  );

  return rows;
}

export type GestaoMemberRow = RowDataPacket & {
  usuario_id: number;
  nome: string;
  email: string;
  papel: GestaoMemberRole;
  status: "ativo" | "inativo";
};

export async function listGestaoMembros(gestaoId: number) {
  const [rows] = await pool.query<GestaoMemberRow[]>(
    `
      SELECT
        gm.usuario_id,
        u.nome,
        u.email,
        gm.papel,
        gm.status
      FROM gestao_membros gm
      INNER JOIN usuarios u
        ON u.id = gm.usuario_id
      WHERE gm.gestao_id = ?
      ORDER BY
        CASE gm.papel
          WHEN 'proprietario' THEN 1
          WHEN 'administrador' THEN 2
          WHEN 'editor' THEN 3
          ELSE 4
        END,
        u.nome ASC
    `,
    [gestaoId],
  );

  return rows;
}

export async function updateGestaoMembroPapel(input: {
  gestaoId: number;
  changedByUserId: number;
  memberUserId: number;
  papel: GestaoMemberRole;
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [targetRows] = await connection.query<Array<RowDataPacket & { papel: GestaoMemberRole }>>(
      `
        SELECT papel
        FROM gestao_membros
        WHERE gestao_id = ?
          AND usuario_id = ?
          AND status = 'ativo'
        LIMIT 1
      `,
      [input.gestaoId, input.memberUserId],
    );

    const target = targetRows[0];

    if (!target) {
      await connection.rollback();
      return false;
    }

    if (target.papel === "proprietario" && input.papel !== "proprietario") {
      const [ownerRows] = await connection.query<Array<RowDataPacket & { total: number }>>(
        `
          SELECT COUNT(*) AS total
          FROM gestao_membros
          WHERE gestao_id = ?
            AND status = 'ativo'
            AND papel = 'proprietario'
        `,
        [input.gestaoId],
      );

      const ownerCount = Number(ownerRows[0]?.total ?? 0);
      if (ownerCount <= 1) {
        await connection.rollback();
        return false;
      }
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        UPDATE gestao_membros
        SET papel = ?
        WHERE gestao_id = ?
          AND usuario_id = ?
          AND status = 'ativo'
      `,
      [input.papel, input.gestaoId, input.memberUserId],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    await connection.commit();

    await registerAudit({
      userId: input.changedByUserId,
      gestaoId: input.gestaoId,
      action: "update_role",
      module: "gestoes",
      entity: "gestao_membro",
      entityId: input.memberUserId,
      details: { papel: input.papel },
    });

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function userHasGestaoAccess(userId: number, gestaoId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM gestao_membros
      WHERE usuario_id = ?
        AND gestao_id = ?
        AND status = 'ativo'
      LIMIT 1
    `,
    [userId, gestaoId],
  );

  return rows.length > 0;
}

export async function getUserGestaoRole(
  userId: number,
  gestaoId: number,
): Promise<GestaoMemberRole | null> {
  const [rows] = await pool.query<Array<RowDataPacket & { papel: GestaoMemberRole }>>(
    `
      SELECT papel
      FROM gestao_membros
      WHERE usuario_id = ?
        AND gestao_id = ?
        AND status = 'ativo'
      LIMIT 1
    `,
    [userId, gestaoId],
  );

  return rows[0]?.papel ?? null;
}

export async function createGestaoWithDefaults(input: {
  userId: number;
  nome: string;
  descricao?: string;
  tipo: "pessoal" | "familiar" | "profissional" | "projeto";
  inicioEm?: string | null;
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

  const [gestaoResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO gestoes (nome, descricao, tipo, inicio_em, percentual_reserva, criado_por_usuario_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [input.nome, input.descricao ?? null, input.tipo, input.inicioEm ?? null, 10, input.userId],
    );

    const gestaoId = gestaoResult.insertId;

    await connection.query(
      `
        INSERT INTO gestao_membros (gestao_id, usuario_id, papel)
        VALUES (?, ?, 'proprietario')
      `,
      [gestaoId, input.userId],
    );

    await connection.query(
      `
        INSERT INTO contas (gestao_id, criado_por_usuario_id, nome, tipo, instituicao, saldo_inicial)
        VALUES (?, ?, 'Conta principal', 'corrente', 'Manual', 0.00)
      `,
      [gestaoId, input.userId],
    );

    const categoriasPadrao = [
      ["Salario", "receita"],
      ["Freelance", "receita"],
      ["Moradia", "despesa"],
      ["Alimentacao", "despesa"],
      ["Transporte", "despesa"],
      ["Saude", "despesa"],
      ["Lazer", "despesa"],
      ["Saida da conta", "despesa"],
      ["Outros", "ambos"],
    ];

    for (const [nome, natureza] of categoriasPadrao) {
      await connection.query(
        `
          INSERT INTO categorias (gestao_id, criada_por_usuario_id, nome, natureza, sistema)
          VALUES (?, ?, ?, ?, 1)
        `,
        [gestaoId, input.userId, nome, natureza],
      );
    }

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId,
      action: "create",
      module: "gestoes",
      entity: "gestao",
      entityId: gestaoId,
      details: { tipo: input.tipo, nome: input.nome },
    });

    return gestaoId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createGestaoWithOpeningBalances(input: {
  userId: number;
  nome: string;
  descricao?: string;
  tipo: "pessoal" | "familiar" | "profissional" | "projeto";
  inicioEm: string | null;
  contas: Array<{
    nome: string;
    tipo: "carteira" | "corrente" | "poupanca" | "cartao_credito" | "investimento" | "caixa" | "outro";
    instituicao?: string | null;
    saldoInicial: number;
    cartaoLimiteCredito?: number | null;
    cartaoFechamentoDia?: number | null;
    cartaoVencimentoDia?: number | null;
  }>;
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [gestaoResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO gestoes (nome, descricao, tipo, inicio_em, percentual_reserva, criado_por_usuario_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [input.nome, input.descricao ?? null, input.tipo, input.inicioEm ?? null, 10, input.userId],
    );

    const gestaoId = gestaoResult.insertId;

    await connection.query(
      `
        INSERT INTO gestao_membros (gestao_id, usuario_id, papel)
        VALUES (?, ?, 'proprietario')
      `,
      [gestaoId, input.userId],
    );

    for (const conta of input.contas) {
      await connection.query(
        `
          INSERT INTO contas (
            gestao_id,
            criado_por_usuario_id,
            nome,
            tipo,
            instituicao,
            saldo_inicial,
            limite_credito,
            fechamento_dia,
            vencimento_dia
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          gestaoId,
          input.userId,
          conta.nome,
          conta.tipo,
          conta.instituicao ?? "Manual",
          conta.tipo === "cartao_credito" && conta.saldoInicial > 0 ? -Math.abs(conta.saldoInicial) : conta.saldoInicial,
          conta.tipo === "cartao_credito" ? conta.cartaoLimiteCredito ?? null : null,
          conta.tipo === "cartao_credito" ? conta.cartaoFechamentoDia ?? null : null,
          conta.tipo === "cartao_credito" ? conta.cartaoVencimentoDia ?? null : null,
        ],
      );
    }

    const categoriasPadrao = [
      ["Salario", "receita"],
      ["Freelance", "receita"],
      ["Moradia", "despesa"],
      ["Alimentacao", "despesa"],
      ["Transporte", "despesa"],
      ["Saude", "despesa"],
      ["Lazer", "despesa"],
      ["Saida da conta", "despesa"],
      ["Outros", "ambos"],
    ];

    for (const [nome, natureza] of categoriasPadrao) {
      await connection.query(
        `
          INSERT INTO categorias (gestao_id, criada_por_usuario_id, nome, natureza, sistema)
          VALUES (?, ?, ?, ?, 1)
        `,
        [gestaoId, input.userId, nome, natureza],
      );
    }

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId,
      action: "create",
      module: "gestoes",
      entity: "gestao",
      entityId: gestaoId,
        details: {
          tipo: input.tipo,
          nome: input.nome,
          inicioEm: input.inicioEm,
          openingBalances: input.contas.map((conta) => ({
            nome: conta.nome,
            tipo: conta.tipo,
            saldoInicial: conta.saldoInicial,
          })),
        },
      });

    return gestaoId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listContas(gestaoId: number) {
  const [rows] = await pool.query<ContaRow[]>(
    `
      SELECT id, nome, tipo, instituicao, COALESCE(saldo_inicial, 0) AS saldo_inicial, DATE_FORMAT(saldo_inicial_em, '%Y-%m-%d') AS saldo_inicial_em
      FROM contas
      WHERE gestao_id = ?
        AND ativa = 1
      ORDER BY criado_em ASC
    `,
    [gestaoId],
  );

  return rows;
}

function compareLancamentosDesc(a: LancamentoListItem, b: LancamentoListItem) {
  const dateDiff = b.competencia_data.localeCompare(a.competencia_data);

  if (dateDiff !== 0) {
    return dateDiff;
  }

  const timeA = a.competencia_hora ?? "00:00";
  const timeB = b.competencia_hora ?? "00:00";
  const timeDiff = timeB.localeCompare(timeA);

  if (timeDiff !== 0) {
    return timeDiff;
  }

  return b.id - a.id;
}

function buildOpeningLancamentos(
  contas: ContaRow[],
  input?: { contaId?: number; dateFrom?: string; dateTo?: string },
): LancamentoListItem[] {
  return contas.flatMap((conta) => {
    const saldoInicial = Number(conta.saldo_inicial ?? 0);
    const aberturaEm = conta.saldo_inicial_em;

    if (!aberturaEm || saldoInicial === 0) {
      return [];
    }

    if (input?.contaId && input.contaId !== conta.id) {
      return [];
    }

    if (input?.dateFrom && aberturaEm < input.dateFrom) {
      return [];
    }

    if (input?.dateTo && aberturaEm > input.dateTo) {
      return [];
    }

    return [
      {
        id: -1_000_000 - conta.id,
        conta_id: conta.id,
        conta_destino_id: null,
        conta_destino_tipo: null,
        categoria_id: null,
        criado_por_usuario_id: null,
        tipo: "abertura",
        status: "liquidado",
        meio: null,
        descricao: conta.tipo === "cartao_credito" ? "Abertura do cartao" : "Abertura da conta",
        valor_total: saldoInicial.toFixed(2),
        competencia_data: aberturaEm,
        competencia_hora: "00:00",
        vencimento_data: aberturaEm,
        categoria_nome: "Abertura",
        conta_nome: conta.nome,
        conta_destino_nome: null,
        conta_tipo: conta.tipo,
        is_abertura: true,
      } satisfies LancamentoListItem,
    ];
  });
}

export async function listCategorias(gestaoId: number) {
  const [rows] = await pool.query<CategoriaRow[]>(
    `
      SELECT id, nome, natureza
      FROM categorias
      WHERE gestao_id = ?
        AND ativa = 1
      ORDER BY nome ASC
    `,
    [gestaoId],
  );

  return rows;
}

export async function createConta(input: {
  gestaoId: number;
  userId: number;
  nome: string;
  tipo: string;
  instituicao?: string;
  saldoInicial: number;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO contas (gestao_id, criado_por_usuario_id, nome, tipo, instituicao, saldo_inicial)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [input.gestaoId, input.userId, input.nome, input.tipo, input.instituicao ?? null, input.saldoInicial],
  );

  await registerAudit({
    userId: input.userId,
    gestaoId: input.gestaoId,
    action: "create",
    module: "contas",
    entity: "conta",
    entityId: result.insertId,
    details: { nome: input.nome, tipo: input.tipo },
  });

  return result.insertId;
}

export async function updateContaNome(input: {
  gestaoId: number;
  contaId: number;
  nome: string;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE contas
      SET nome = ?
      WHERE id = ?
        AND gestao_id = ?
        AND ativa = 1
    `,
    [input.nome, input.contaId, input.gestaoId],
  );

  if (result.affectedRows > 0) {
    await registerAudit({
      userId: undefined,
      gestaoId: input.gestaoId,
      action: "update",
      module: "contas",
      entity: "conta",
      entityId: input.contaId,
      details: { nome: input.nome },
    });
  }

  return result.affectedRows > 0;
}

export async function updateGestaoPercentualReserva(input: {
  gestaoId: number;
  userId: number;
  percentualReserva: number;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE gestoes
      SET percentual_reserva = ?
      WHERE id = ?
        AND status = 'ativa'
    `,
    [input.percentualReserva, input.gestaoId],
  );

  if (result.affectedRows > 0) {
    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "update",
      module: "gestoes",
      entity: "gestao",
      entityId: input.gestaoId,
      details: { percentualReserva: input.percentualReserva },
    });
  }

  return result.affectedRows > 0;
}

export async function updateContaSaldoInicial(input: {
  gestaoId: number;
  contaId: number;
  saldoInicial: number;
  saldoInicialEm?: string | null;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE contas
      SET saldo_inicial = ?, saldo_inicial_em = ?
      WHERE id = ?
        AND gestao_id = ?
        AND ativa = 1
    `,
    [input.saldoInicial, input.saldoInicialEm ?? null, input.contaId, input.gestaoId],
  );

  if (result.affectedRows > 0) {
    await registerAudit({
      userId: undefined,
      gestaoId: input.gestaoId,
      action: "update",
      module: "contas",
      entity: "conta",
      entityId: input.contaId,
      details: { saldoInicial: input.saldoInicial, saldoInicialEm: input.saldoInicialEm ?? null },
    });
  }

  return result.affectedRows > 0;
}

export async function deactivateContasExcept(input: {
  gestaoId: number;
  keepContaIds: number[];
}) {
  if (input.keepContaIds.length === 0) {
    return 0;
  }

  const placeholders = input.keepContaIds.map(() => "?").join(", ");
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE contas
      SET ativa = 0
      WHERE gestao_id = ?
        AND ativa = 1
        AND id NOT IN (${placeholders})
    `,
    [input.gestaoId, ...input.keepContaIds],
  );

  if (result.affectedRows > 0) {
    await registerAudit({
      userId: undefined,
      gestaoId: input.gestaoId,
      action: "deactivate",
      module: "contas",
      entity: "conta",
      details: { keepContaIds: input.keepContaIds, affectedRows: result.affectedRows },
    });
  }

  return result.affectedRows;
}

export async function createCategoria(input: {
  gestaoId: number;
  userId: number;
  nome: string;
  natureza: "receita" | "despesa" | "ambos";
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO categorias (gestao_id, criada_por_usuario_id, nome, natureza)
      VALUES (?, ?, ?, ?)
    `,
    [input.gestaoId, input.userId, input.nome, input.natureza],
  );

  await registerAudit({
    userId: input.userId,
    gestaoId: input.gestaoId,
    action: "create",
    module: "categorias",
    entity: "categoria",
    entityId: result.insertId,
    details: { nome: input.nome, natureza: input.natureza },
  });

  return result.insertId;
}

export async function updateCategoria(input: {
  gestaoId: number;
  userId: number;
  categoriaId: number;
  nome: string;
  natureza: "receita" | "despesa" | "ambos";
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE categorias
      SET nome = ?, natureza = ?
      WHERE id = ?
        AND gestao_id = ?
        AND ativa = 1
    `,
    [input.nome, input.natureza, input.categoriaId, input.gestaoId],
  );

  if (result.affectedRows > 0) {
    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "update",
      module: "categorias",
      entity: "categoria",
      entityId: input.categoriaId,
      details: { nome: input.nome, natureza: input.natureza },
    });
  }

  return result.affectedRows > 0;
}

export async function createLancamento(input: {
  gestaoId: number;
  contaId: number;
  contaDestinoId?: number | null;
  categoriaId?: number | null;
  userId: number;
  tipo: "receita" | "despesa" | "ajuste" | "transferencia";
  status: "previsto" | "pendente" | "liquidado";
  meio?: LancamentoMeio;
  descricao: string;
  valorTotal: number;
  competenciaData: string;
  competenciaHora?: string;
  vencimentoData?: string;
}) {
  if (input.tipo === "transferencia") {
    if (!input.contaDestinoId) {
      throw new Error("Conta destino obrigatoria para transferencia.");
    }

    return createTransferencia({
      gestaoId: input.gestaoId,
      contaOrigemId: input.contaId,
      contaDestinoId: input.contaDestinoId,
      userId: input.userId,
      status: input.status,
      descricao: input.descricao,
      valorTotal: input.valorTotal,
      competenciaData: input.competenciaData,
      competenciaHora: input.competenciaHora,
      vencimentoData: input.vencimentoData,
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO lancamentos (
          gestao_id,
          conta_id,
          categoria_id,
          criado_por_usuario_id,
          tipo,
          status,
          meio,
          descricao,
          valor_total,
          competencia_data,
          competencia_hora,
          vencimento_data,
          liquidado_em
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.gestaoId,
        input.contaId,
        input.categoriaId ?? null,
        input.userId,
        input.tipo,
        input.status,
        input.meio ?? null,
        input.descricao,
        input.valorTotal,
        input.competenciaData,
        input.competenciaHora ?? null,
        input.vencimentoData || null,
        input.status === "liquidado" ? new Date() : null,
      ],
    );

    await connection.query(
      `
        INSERT INTO lancamento_rateios (lancamento_id, usuario_id, valor, percentual)
        VALUES (?, ?, ?, 100)
      `,
      [result.insertId, input.userId, input.valorTotal],
    );

    await syncGestaoInicioEm(connection, input.gestaoId);

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "create",
      module: "lancamentos",
      entity: "lancamento",
      entityId: result.insertId,
      details: { tipo: input.tipo, status: input.status, valorTotal: input.valorTotal },
    });

    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createTransferencia(input: {
  gestaoId: number;
  contaOrigemId: number;
  contaDestinoId: number;
  userId: number;
  status: "previsto" | "pendente" | "liquidado";
  descricao: string;
  valorTotal: number;
  competenciaData: string;
  competenciaHora?: string;
  vencimentoData?: string;
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO lancamentos (
          gestao_id,
          conta_id,
          conta_destino_id,
          categoria_id,
          criado_por_usuario_id,
          tipo,
          status,
          meio,
          descricao,
          valor_total,
          competencia_data,
          competencia_hora,
          vencimento_data,
          liquidado_em
        )
        VALUES (?, ?, ?, NULL, ?, 'transferencia', ?, 'transferencia', ?, ?, ?, ?, ?, ?)
      `,
      [
        input.gestaoId,
        input.contaOrigemId,
        input.contaDestinoId,
        input.userId,
        input.status,
        input.descricao,
        input.valorTotal,
        input.competenciaData,
        input.competenciaHora ?? null,
        input.vencimentoData || null,
        input.status === "liquidado" ? new Date() : null,
      ],
    );

    await syncGestaoInicioEm(connection, input.gestaoId);

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "create",
      module: "lancamentos",
      entity: "transferencia",
      entityId: result.insertId,
      details: { status: input.status, valorTotal: input.valorTotal },
    });

    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSummary(gestaoId: number) {
  const [rows] = await pool.query<SummaryRow[]>(
    `
      SELECT
        SUM(CASE WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total ELSE 0 END) AS receitas,
        SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END) AS despesas,
        SUM(
          CASE
            WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total
            WHEN tipo = 'despesa' AND status <> 'cancelado' THEN -valor_total
            ELSE 0
          END
        ) AS saldo
      FROM lancamentos
      WHERE gestao_id = ?
    `,
    [gestaoId],
  );

  return rows[0] ?? { receitas: "0", despesas: "0", saldo: "0" };
}

export async function getCashOverview(gestaoId: number) {
  const [rows] = await pool.query<CashOverviewRow[]>(
    `
      SELECT
        COALESCE(SUM(saldos.entradas_em_conta), 0) AS entradas_em_conta,
        COALESCE(SUM(saldos.despesas), 0) AS despesas,
        COALESCE(SUM(saldos.saidas_da_conta), 0) AS saidas_da_conta
      FROM (
        SELECT
          ct.id,
          COALESCE(SUM(${CASE_ENTRADA_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS entradas_em_conta,
          COALESCE(SUM(${CASE_DESPESA_SEM_SAIDA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS despesas,
          COALESCE(SUM(${CASE_SAIDA_DA_CONTA_AGREGADA.replace(/\s+/g, " ").trim()}), 0) AS saidas_da_conta
        FROM contas ct
        ${JOIN_LANCAMENTOS_NA_CONTA}
        LEFT JOIN categorias c
          ON c.id = l.categoria_id
        WHERE ct.gestao_id = ?
          AND ct.ativa = 1
          AND ct.tipo <> 'cartao_credito'
          AND ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
        GROUP BY ct.id
      ) AS saldos
    `,
    [gestaoId],
  );

  return rows[0] ?? {
    entradas_em_conta: "0",
    despesas: "0",
    saidas_da_conta: "0",
  };
}

export async function getGestaoSaldosPorBucket(gestaoId: number): Promise<GestaoSaldosPorBucket> {
  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        disponivel: string | null;
        poupanca: string | null;
        investimento: string | null;
      }
    >
  >(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN x.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
              THEN x.saldo_conta
              ELSE 0
            END
          ),
          0
        ) AS disponivel,
        COALESCE(SUM(CASE WHEN x.tipo = 'poupanca' THEN x.saldo_conta ELSE 0 END), 0) AS poupanca,
        COALESCE(SUM(CASE WHEN x.tipo = 'investimento' THEN x.saldo_conta ELSE 0 END), 0) AS investimento
      FROM (
        SELECT
          ct.id,
          ct.tipo,
          COALESCE(ct.saldo_inicial, 0) +
            COALESCE(
              SUM(${CASE_DELTA_SALDO_NA_CONTA.replace(/\s+/g, " ").trim()}),
              0
            ) AS saldo_conta
        FROM contas ct
        ${JOIN_LANCAMENTOS_NA_CONTA}
        WHERE ct.gestao_id = ?
          AND ct.ativa = 1
          AND ct.tipo <> 'cartao_credito'
        GROUP BY ct.id, ct.tipo, ct.saldo_inicial
      ) AS x
    `,
    [gestaoId],
  );

  const row = rows[0];
  return {
    disponivel: row?.disponivel ?? "0",
    poupanca: row?.poupanca ?? "0",
    investimento: row?.investimento ?? "0",
  };
}

export async function getAvailableBalance(gestaoId: number) {
  const buckets = await getGestaoSaldosPorBucket(gestaoId);
  return buckets.disponivel;
}

export async function listCashAccountBreakdown(gestaoId: number) {
  const [rows] = await pool.query<CashAccountBreakdownRow[]>(
    `
      SELECT
        ct.id,
        ct.nome,
        ct.tipo,
        COALESCE(ct.saldo_inicial, 0) AS saldo_inicial,
        COALESCE(SUM(${CASE_ENTRADA_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS entradas_em_conta,
        COALESCE(SUM(${CASE_DESPESA_SEM_SAIDA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS despesas,
        COALESCE(SUM(${CASE_SAIDA_DA_CONTA_AGREGADA.replace(/\s+/g, " ").trim()}), 0) AS saidas_da_conta,
        COALESCE(ct.saldo_inicial, 0) +
          COALESCE(SUM(${CASE_DELTA_SALDO_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS saldo_atual,
        COUNT(
          CASE
            WHEN l.status <> 'cancelado' THEN 1
            ELSE NULL
          END
        ) AS quantidade_movimentos
      FROM contas ct
      ${JOIN_LANCAMENTOS_NA_CONTA}
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ct.gestao_id = ?
        AND ct.ativa = 1
        AND ct.tipo <> 'cartao_credito'
      GROUP BY ct.id, ct.nome, ct.tipo, ct.saldo_inicial
      ORDER BY saldo_atual DESC, ct.criado_em ASC
    `,
    [gestaoId],
  );

  return rows;
}

export async function listCreditCardBreakdown(gestaoId: number) {
  const [rows] = await pool.query<CashAccountBreakdownRow[]>(
    `
      SELECT
        ct.id,
        ct.nome,
        ct.tipo,
        COALESCE(ct.saldo_inicial, 0) AS saldo_inicial,
        COALESCE(SUM(${CASE_ENTRADA_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS entradas_em_conta,
        COALESCE(SUM(${CASE_DESPESA_SEM_SAIDA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS despesas,
        COALESCE(SUM(${CASE_SAIDA_DA_CONTA_AGREGADA.replace(/\s+/g, " ").trim()}), 0) AS saidas_da_conta,
        COALESCE(ct.saldo_inicial, 0) +
          COALESCE(SUM(${CASE_DELTA_SALDO_NA_CONTA.replace(/\s+/g, " ").trim()}), 0) AS saldo_atual,
        COUNT(
          CASE
            WHEN l.status <> 'cancelado' THEN 1
            ELSE NULL
          END
        ) AS quantidade_movimentos
      FROM contas ct
      ${JOIN_LANCAMENTOS_NA_CONTA}
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ct.gestao_id = ?
        AND ct.ativa = 1
        AND ct.tipo = 'cartao_credito'
      GROUP BY ct.id, ct.nome, ct.tipo, ct.saldo_inicial
      ORDER BY saldo_atual DESC, ct.criado_em ASC
    `,
    [gestaoId],
  );

  return rows;
}

export async function listCreditCardStatementData(gestaoId: number) {
  const cards = await pool.query<CreditCardAccountRow[]>(
    `
      SELECT
        ct.id,
        ct.nome,
        ct.tipo,
        ct.limite_credito,
        ct.fechamento_dia,
        ct.vencimento_dia
      FROM contas ct
      WHERE ct.gestao_id = ?
        AND ct.ativa = 1
        AND ct.tipo = 'cartao_credito'
      ORDER BY ct.criado_em ASC
    `,
    [gestaoId],
  );

  const cardRows = cards[0];

  if (cardRows.length === 0) {
    return [];
  }

  const cardIds = cardRows.map((card) => card.id);
  const placeholders = cardIds.map(() => "?").join(", ");

  const [movements] = await pool.query<CreditCardStatementMovementRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        l.tipo,
        l.status,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND (l.conta_id IN (${placeholders}) OR l.conta_destino_id IN (${placeholders}))
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
      LIMIT 2000
    `,
    [gestaoId, ...cardIds, ...cardIds],
  );

  return cardRows.map((card) => ({
    ...card,
    movimentos: movements.filter(
      (movement) => movement.conta_id === card.id || movement.conta_destino_id === card.id,
    ),
  }));
}

export type PossivelRecorrenciaRow = RowDataPacket & {
  descricao: string;
  valor_total: string;
  ocorrencias: number;
  primeira_data: string;
  ultima_data: string;
  total_periodo: string;
};

export async function listPossiveisRecorrencias(
  gestaoId: number,
  input?: { diasLookback?: number; minOcorrencias?: number; limite?: number },
) {
  const dias = input?.diasLookback ?? 120;
  const minOc = input?.minOcorrencias ?? 2;
  const limite = input?.limite ?? 20;

  const [rows] = await pool.query<PossivelRecorrenciaRow[]>(
    `
      SELECT
        l.descricao AS descricao,
        FORMAT(l.valor_total, 2, 'de_DE') AS valor_total,
        COUNT(*) AS ocorrencias,
        DATE_FORMAT(MIN(l.competencia_data), '%Y-%m-%d') AS primeira_data,
        DATE_FORMAT(MAX(l.competencia_data), '%Y-%m-%d') AS ultima_data,
        FORMAT(SUM(l.valor_total), 2, 'de_DE') AS total_periodo
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.tipo = 'despesa'
        AND l.status <> 'cancelado'
        AND l.competencia_data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY l.descricao, l.valor_total
      HAVING COUNT(*) >= ?
      ORDER BY COUNT(*) DESC, SUM(l.valor_total) DESC
      LIMIT ?
    `,
    [gestaoId, dias, minOc, limite],
  );

  return rows;
}

export async function listRecentLancamentosForConta(input: {
  gestaoId: number;
  contaId: number;
  limit?: number;
}) {
  const lim = Math.min(Math.max(input.limit ?? 12, 1), 100);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND (l.conta_id = ? OR l.conta_destino_id = ?)
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
      LIMIT ${lim}
    `,
    [input.gestaoId, input.contaId, input.contaId],
  );

  const contas = await listContas(input.gestaoId);
  const openingRows = buildOpeningLancamentos(contas, { contaId: input.contaId });
  const normalizedRows = rows.map((row) => ({ ...row })) satisfies LancamentoListItem[];

  return [...normalizedRows, ...openingRows].sort(compareLancamentosDesc).slice(0, lim);
}

export async function listRecentLancamentos(gestaoId: number) {
  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.criado_por_usuario_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
    `,
    [gestaoId],
  );

  const contas = await listContas(gestaoId);
  const openingRows = buildOpeningLancamentos(contas);
  const normalizedRows = rows.map((row) => ({ ...row })) satisfies LancamentoListItem[];

  return [...normalizedRows, ...openingRows].sort(compareLancamentosDesc);
}

export async function listLancamentosPorPeriodo(input: {
  gestaoId: number;
  dateFrom: string;
  dateTo: string;
}) {
  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.criado_por_usuario_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
    `,
    [input.gestaoId, input.dateFrom, input.dateTo],
  );

  const contas = await listContas(input.gestaoId);
  const openingRows = buildOpeningLancamentos(contas, {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });
  const normalizedRows = rows.map((row) => ({ ...row })) satisfies LancamentoListItem[];

  return [...normalizedRows, ...openingRows].sort(compareLancamentosDesc);
}

export async function getGestaoPeriodoResumo(input: {
  gestaoId: number;
  dateFrom: string;
  dateTo: string;
}) {
  const [rows] = await pool.query<PeriodResumoRow[]>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) AS receitas,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'despesa' AND COALESCE(c.nome, '') <> 'Saida da conta' THEN l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS despesas,
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND ctd.tipo IN ('poupanca', 'investimento') THEN l.valor_total ELSE 0 END), 0) AS guardado,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'credito' THEN l.valor_total ELSE 0 END), 0) AS credito,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'debito' THEN l.valor_total ELSE 0 END), 0) AS debito,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'pix' THEN l.valor_total ELSE 0 END), 0) AS pix,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'receita' THEN l.valor_total
              WHEN l.tipo = 'despesa' AND COALESCE(c.nome, '') <> 'Saida da conta' THEN -l.valor_total
              WHEN l.tipo = 'transferencia' AND ctd.tipo IN ('poupanca', 'investimento') THEN -l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS total
      FROM lancamentos l
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
      `,
    [input.gestaoId, input.dateFrom, input.dateTo],
  );

  const [openingRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN ct.saldo_inicial >= 0 THEN ct.saldo_inicial ELSE 0 END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN ct.saldo_inicial < 0 THEN -ct.saldo_inicial ELSE 0 END), 0) AS despesas,
        COALESCE(SUM(ct.saldo_inicial), 0) AS total
      FROM contas ct
      WHERE ct.gestao_id = ?
        AND ct.ativa = 1
        AND ct.saldo_inicial_em >= ?
        AND ct.saldo_inicial_em <= ?
    `,
    [input.gestaoId, input.dateFrom, input.dateTo],
  );

  const opening = openingRows[0] ?? { receitas: "0", despesas: "0", total: "0" };
  const base = rows[0] ?? {
    receitas: "0",
    despesas: "0",
    guardado: "0",
    credito: "0",
    debito: "0",
    pix: "0",
    total: "0",
    abertura: "0",
  };

  return {
    receitas: base.receitas ?? "0",
    despesas: base.despesas ?? "0",
    guardado: base.guardado ?? "0",
    credito: base.credito ?? "0",
    debito: base.debito ?? "0",
    pix: base.pix ?? "0",
    total: base.total ?? "0",
    abertura: String(Number(opening.total ?? 0)),
  };
}

export async function getContaCorrentePeriodoResumo(input: {
  gestaoId: number;
  dateFrom: string;
  dateTo: string;
}) {
  const [rows] = await pool.query<ContaCorrentePeriodoResumoRow[]>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) AS entradas,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END), 0) AS saidas,
        COALESCE(SUM(CASE WHEN l.tipo = 'transferencia' AND ctd.tipo IN ('poupanca', 'investimento') THEN l.valor_total ELSE 0 END), 0) AS guardado,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'debito' THEN l.valor_total ELSE 0 END), 0) AS debito,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'pix' THEN l.valor_total ELSE 0 END), 0) AS pix,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' AND l.meio = 'credito' THEN l.valor_total ELSE 0 END), 0) AS credito,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'receita' THEN l.valor_total
              WHEN l.tipo = 'despesa' THEN -l.valor_total
              WHEN l.tipo = 'transferencia' AND ctd.tipo IN ('poupanca', 'investimento') THEN -l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS saldo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
        AND ct.tipo IN ('corrente', 'carteira', 'caixa', 'outro')
    `,
    [input.gestaoId, input.dateFrom, input.dateTo],
  );

  const base = rows[0] ?? {
    entradas: "0",
    saidas: "0",
    guardado: "0",
    debito: "0",
    pix: "0",
    credito: "0",
    saldo: "0",
  };

  return {
    entradas: base.entradas ?? "0",
    saidas: base.saidas ?? "0",
    guardado: base.guardado ?? "0",
    debito: base.debito ?? "0",
    pix: base.pix ?? "0",
    credito: base.credito ?? "0",
    saldo: base.saldo ?? "0",
  };
}

export async function listGestaoMembrosResumo(input: {
  gestaoId: number;
  dateFrom: string;
  dateTo: string;
}) {
  const [rows] = await pool.query<GestaoMembroResumoRow[]>(
    `
      SELECT
        gm.usuario_id,
        u.nome,
        u.email,
        gm.papel,
        gm.status,
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN lr.valor ELSE 0 END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN lr.valor ELSE 0 END), 0) AS despesas,
        COALESCE(SUM(lr.valor), 0) AS total,
        COUNT(DISTINCT CASE WHEN l.status <> 'cancelado' THEN l.id END) AS movimentos
      FROM gestao_membros gm
      INNER JOIN usuarios u
        ON u.id = gm.usuario_id
      LEFT JOIN lancamento_rateios lr
        ON lr.usuario_id = gm.usuario_id
      LEFT JOIN lancamentos l
        ON l.id = lr.lancamento_id
        AND l.gestao_id = gm.gestao_id
        AND l.status <> 'cancelado'
        AND l.competencia_data >= ?
        AND l.competencia_data <= ?
      WHERE gm.gestao_id = ?
        AND gm.status = 'ativo'
      GROUP BY gm.usuario_id, u.nome, u.email, gm.papel, gm.status
      ORDER BY
        CASE gm.papel
          WHEN 'proprietario' THEN 1
          WHEN 'administrador' THEN 2
          WHEN 'editor' THEN 3
          ELSE 4
        END,
        u.nome ASC
    `,
    [input.dateFrom, input.dateTo, input.gestaoId],
  );

  return rows;
}

export async function updateLancamento(input: {
  gestaoId: number;
  userId: number;
  lancamentoId: number;
  contaId: number;
  contaDestinoId?: number | null;
  categoriaId?: number | null;
  tipo: "receita" | "despesa" | "ajuste" | "transferencia";
  status: "previsto" | "pendente" | "liquidado";
  meio?: LancamentoMeio;
  descricao: string;
  valorTotal: number;
  competenciaData: string;
  competenciaHora?: string;
  vencimentoData?: string;
}) {
  const connection = await pool.getConnection();

  const isTransferencia = input.tipo === "transferencia";
  const categoriaId = isTransferencia ? null : input.categoriaId ?? null;
  const contaDestinoId = isTransferencia ? input.contaDestinoId ?? null : null;
  const meioFinal = isTransferencia ? ("transferencia" as LancamentoMeio) : (input.meio ?? null);

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        UPDATE lancamentos
        SET
          conta_id = ?,
          conta_destino_id = ?,
          categoria_id = ?,
          tipo = ?,
          status = ?,
          meio = ?,
          descricao = ?,
          valor_total = ?,
          competencia_data = ?,
          competencia_hora = ?,
          vencimento_data = ?,
          liquidado_em = IF(? = 'liquidado', COALESCE(liquidado_em, NOW()), NULL)
        WHERE gestao_id = ?
          AND id = ?
      `,
      [
        input.contaId,
        contaDestinoId,
        categoriaId,
        input.tipo,
        input.status,
        meioFinal,
        input.descricao,
        input.valorTotal,
        input.competenciaData,
        input.competenciaHora ?? null,
        input.vencimentoData || null,
        input.status,
        input.gestaoId,
        input.lancamentoId,
      ],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    if (isTransferencia) {
      await connection.query(`DELETE FROM lancamento_rateios WHERE lancamento_id = ?`, [
        input.lancamentoId,
      ]);
    } else {
      await connection.query(
        `
          UPDATE lancamento_rateios
          SET valor = ROUND((? * percentual) / 100, 2)
          WHERE lancamento_id = ?
        `,
        [input.valorTotal, input.lancamentoId],
      );

      const [rateios] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM lancamento_rateios WHERE lancamento_id = ? LIMIT 1`,
        [input.lancamentoId],
      );

      if (rateios.length === 0) {
        await connection.query(
          `
            INSERT INTO lancamento_rateios (lancamento_id, usuario_id, valor, percentual)
            VALUES (?, ?, ?, 100)
          `,
          [input.lancamentoId, input.userId, input.valorTotal],
        );
      }
    }

    await syncGestaoInicioEm(connection, input.gestaoId);

    await connection.commit();

    await registerAudit({
      userId: input.userId,
      gestaoId: input.gestaoId,
      action: "update",
      module: "lancamentos",
      entity: "lancamento",
      entityId: input.lancamentoId,
      details: { tipo: input.tipo, status: input.status, valorTotal: input.valorTotal },
    });

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function buildLancamentoFilters(filters: SearchLancamentosInput): SqlFilters {
  const conditions = ["l.gestao_id = ?"];
  const params: Array<string | number> = [filters.gestaoId];

  if (filters.text) {
    conditions.push(
      "(l.descricao LIKE ? OR c.nome LIKE ? OR ct.nome LIKE ? OR ctd.nome LIKE ?)",
    );
    params.push(`%${filters.text}%`, `%${filters.text}%`, `%${filters.text}%`, `%${filters.text}%`);
  }

  if (filters.tipo) {
    conditions.push("l.tipo = ?");
    params.push(filters.tipo);
  }

  if (filters.meio) {
    conditions.push("l.meio = ?");
    params.push(filters.meio);
  }

  if (filters.contaId) {
    conditions.push(
      "(l.conta_id = ? OR (l.tipo = 'transferencia' AND l.conta_destino_id = ?))",
    );
    params.push(filters.contaId, filters.contaId);
  }

  if (filters.categoriaId) {
    conditions.push("l.categoria_id = ?");
    params.push(filters.categoriaId);
  }

  if (filters.minValor) {
    conditions.push("l.valor_total >= ?");
    params.push(filters.minValor);
  }

  if (filters.maxValor) {
    conditions.push("l.valor_total <= ?");
    params.push(filters.maxValor);
  }

  if (filters.dateFrom) {
    conditions.push("l.competencia_data >= ?");
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push("l.competencia_data <= ?");
    params.push(filters.dateTo);
  }

  return { conditions, params };
}

export async function searchLancamentos(filters: SearchLancamentosInput) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
      LIMIT 50
    `,
    params,
  );

  return rows;
}

export async function listLancamentosForContaRange(input: {
  gestaoId: number;
  contaId: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  const filters: SearchLancamentosInput = {
    gestaoId: input.gestaoId,
    contaId: input.contaId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  };
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_ASC}
    `,
    params,
  );

  return rows;
}

export async function findLatestLancamento(filters: SearchLancamentosInput) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
      LIMIT 1
    `,
    params,
  );

  return rows[0] ?? null;
}

export async function findLargestLancamento(
  filters: SearchLancamentosInput & { tipo: "receita" | "despesa" },
) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<LancamentoRow[]>(
    `
      SELECT
        l.id,
        l.conta_id,
        l.conta_destino_id,
        ctd.tipo AS conta_destino_tipo,
        l.categoria_id,
        l.tipo,
        l.status,
        l.meio,
        l.descricao,
        l.valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        TIME_FORMAT(l.competencia_hora, '%H:%i') AS competencia_hora,
        DATE_FORMAT(l.vencimento_data, '%Y-%m-%d') AS vencimento_data,
        c.nome AS categoria_nome,
        ct.nome AS conta_nome,
        ctd.nome AS conta_destino_nome,
        ct.tipo AS conta_tipo
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY l.valor_total DESC, ${ORDER_BY_LANCAMENTO_RECIENTE_DESC}
      LIMIT 1
    `,
    params,
  );

  return rows[0] ?? null;
}

export async function sumLancamentos(filters: SearchLancamentosInput) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<Array<RowDataPacket & { total: string | null; quantidade: number }>>(
    `
      SELECT
        COALESCE(SUM(l.valor_total), 0) AS total,
        COUNT(*) AS quantidade
      FROM lancamentos l
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE ${conditions.join(" AND ")}
    `,
    params,
  );

  return rows[0] ?? { total: "0", quantidade: 0 };
}

export async function summarizeLancamentos(filters: SearchLancamentosInput) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        receitas: string | null;
        despesas: string | null;
        saldo: string | null;
        quantidade: number;
      }
    >
  >(
    `
      SELECT
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor_total ELSE 0 END), 0) AS receitas,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor_total ELSE 0 END), 0) AS despesas,
        COALESCE(
          SUM(
            CASE
              WHEN l.tipo = 'receita' THEN l.valor_total
              WHEN l.tipo = 'despesa' THEN -l.valor_total
              ELSE 0
            END
          ),
          0
        ) AS saldo,
        COUNT(*) AS quantidade
      FROM lancamentos l
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE ${conditions.join(" AND ")}
    `,
    params,
  );

  return rows[0] ?? { receitas: "0", despesas: "0", saldo: "0", quantidade: 0 };
}

export async function summarizeLancamentosByCategoria(
  filters: SearchLancamentosInput & { tipo?: "receita" | "despesa" | "ajuste" },
) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        categoria_nome: string | null;
        total: string;
        quantidade: number;
      }
    >
  >(
    `
      SELECT
        c.nome AS categoria_nome,
        COALESCE(SUM(l.valor_total), 0) AS total,
        COUNT(*) AS quantidade
      FROM lancamentos l
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY c.nome
      ORDER BY total DESC, quantidade DESC
      LIMIT 10
    `,
    params,
  );

  return rows;
}

export async function summarizeLancamentosByConta(
  filters: SearchLancamentosInput & { tipo?: "receita" | "despesa" | "ajuste" },
) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        conta_nome: string;
        total: string;
        quantidade: number;
      }
    >
  >(
    `
      SELECT
        ct.nome AS conta_nome,
        COALESCE(SUM(l.valor_total), 0) AS total,
        COUNT(*) AS quantidade
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY ct.nome
      ORDER BY total DESC, quantidade DESC
      LIMIT 10
    `,
    params,
  );

  return rows;
}

export async function summarizeLancamentosByDia(
  filters: SearchLancamentosInput & { tipo?: "receita" | "despesa" | "ajuste" },
) {
  const { conditions, params } = buildLancamentoFilters(filters);

  const [rows] = await pool.query<
    Array<
      RowDataPacket & {
        competencia_data: string;
        total: string;
        quantidade: number;
      }
    >
  >(
    `
      SELECT
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data,
        COALESCE(SUM(l.valor_total), 0) AS total,
        COUNT(*) AS quantidade
      FROM lancamentos l
      INNER JOIN contas ct
        ON ct.id = l.conta_id
      LEFT JOIN contas ctd
        ON ctd.id = l.conta_destino_id
      LEFT JOIN categorias c
        ON c.id = l.categoria_id
      WHERE ${conditions.join(" AND ")}
      GROUP BY DATE(l.competencia_data)
      ORDER BY total DESC, competencia_data DESC
      LIMIT 10
    `,
    params,
  );

  return rows;
}

export type GestaoInsights = {
  receitasMesAtual: string;
  despesasMesAtual: string;
  receitasMesAnterior: string;
  despesasMesAnterior: string;
  despesasAteHojeMesAtual: string;
  diaDoMes: number;
  diasNoMesAtual: number;
  projecaoDespesaFimMes: string;
  margemFluxoPct: string | null;
  variacaoDespesaVsMesAnteriorPct: string | null;
  topCategorias: Array<{ nome: string; total: string }>;
};

export async function getGestaoInsights(gestaoId: number): Promise<GestaoInsights> {
  const [mesAtual] = await pool.query<
    Array<RowDataPacket & { receitas: string | null; despesas: string | null }>
  >(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS despesas
      FROM lancamentos
      WHERE gestao_id = ?
        AND competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND competencia_data <= LAST_DAY(CURDATE())
    `,
    [gestaoId],
  );

  const [mesAnterior] = await pool.query<
    Array<RowDataPacket & { receitas: string | null; despesas: string | null }>
  >(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS despesas
      FROM lancamentos
      WHERE gestao_id = ?
        AND competencia_data >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND competencia_data <= LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    `,
    [gestaoId],
  );

  const [ateHoje] = await pool.query<Array<RowDataPacket & { despesas: string | null }>>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor_total ELSE 0 END), 0)
          AS despesas
      FROM lancamentos
      WHERE gestao_id = ?
        AND competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND competencia_data <= CURDATE()
    `,
    [gestaoId],
  );

  const [dims] = await pool.query<Array<RowDataPacket & { dia: number; dias_mes: number }>>(
    `
      SELECT DAY(CURDATE()) AS dia, DAY(LAST_DAY(CURDATE())) AS dias_mes
    `,
  );

  const [topCats] = await pool.query<Array<RowDataPacket & { nome: string | null; total: string | null }>>(
    `
      SELECT c.nome AS nome, COALESCE(SUM(l.valor_total), 0) AS total
      FROM lancamentos l
      INNER JOIN categorias c
        ON c.id = l.categoria_id
      WHERE l.gestao_id = ?
        AND l.tipo = 'despesa'
        AND l.status <> 'cancelado'
        AND l.competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND l.competencia_data <= LAST_DAY(CURDATE())
      GROUP BY c.id, c.nome
      ORDER BY total DESC
      LIMIT 5
    `,
    [gestaoId],
  );

  const receitasMA = Number(mesAtual[0]?.receitas ?? 0);
  const despesasMA = Number(mesAtual[0]?.despesas ?? 0);
  const despesasAnt = Number(mesAnterior[0]?.despesas ?? 0);
  const despesasAteHoje = Number(ateHoje[0]?.despesas ?? 0);
  const diaDoMes = Number(dims[0]?.dia ?? 1);
  const diasNoMesAtual = Number(dims[0]?.dias_mes ?? 30);

  const mediaDiaria = diaDoMes > 0 ? despesasAteHoje / diaDoMes : 0;
  const projecao = mediaDiaria * diasNoMesAtual;

  let margemFluxoPct: string | null = null;
  if (receitasMA > 0) {
    margemFluxoPct = (((receitasMA - despesasMA) / receitasMA) * 100).toFixed(1);
  }

  let variacaoDespesaVsMesAnteriorPct: string | null = null;
  if (despesasAnt > 0) {
    variacaoDespesaVsMesAnteriorPct = (((despesasMA - despesasAnt) / despesasAnt) * 100).toFixed(1);
  }

  return {
    receitasMesAtual: mesAtual[0]?.receitas ?? "0",
    despesasMesAtual: mesAtual[0]?.despesas ?? "0",
    receitasMesAnterior: mesAnterior[0]?.receitas ?? "0",
    despesasMesAnterior: mesAnterior[0]?.despesas ?? "0",
    despesasAteHojeMesAtual: ateHoje[0]?.despesas ?? "0",
    diaDoMes,
    diasNoMesAtual,
    projecaoDespesaFimMes: projecao.toFixed(2),
    margemFluxoPct,
    variacaoDespesaVsMesAnteriorPct,
    topCategorias: topCats.map((row) => ({
      nome: row.nome ?? "(sem nome)",
      total: row.total ?? "0",
    })),
  };
}

export type RevisarDuplicidadeRow = RowDataPacket & {
  descricao: string;
  valor_total: string;
  vezes: number;
  ids: string;
  primeira: string;
  ultima: string;
};

export async function listRevisarDuplicidadesMes(gestaoId: number) {
  const [rows] = await pool.query<RevisarDuplicidadeRow[]>(
    `
      SELECT
        l.descricao AS descricao,
        FORMAT(l.valor_total, 2, 'de_DE') AS valor_total,
        COUNT(*) AS vezes,
        GROUP_CONCAT(l.id ORDER BY l.competencia_data SEPARATOR ',') AS ids,
        DATE_FORMAT(MIN(l.competencia_data), '%Y-%m-%d') AS primeira,
        DATE_FORMAT(MAX(l.competencia_data), '%Y-%m-%d') AS ultima
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.tipo = 'despesa'
        AND l.competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      GROUP BY l.descricao, l.valor_total
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC, SUM(l.valor_total) DESC
      LIMIT 40
    `,
    [gestaoId],
  );

  return rows;
}

export type RevisarMicrovalorRow = RowDataPacket & {
  id: number;
  descricao: string;
  valor_total: string;
  competencia_data: string;
};

export async function listRevisarMicrovaloresMes(gestaoId: number) {
  const [rows] = await pool.query<RevisarMicrovalorRow[]>(
    `
      SELECT
        l.id,
        l.descricao,
        FORMAT(l.valor_total, 2, 'de_DE') AS valor_total,
        DATE_FORMAT(l.competencia_data, '%Y-%m-%d') AS competencia_data
      FROM lancamentos l
      WHERE l.gestao_id = ?
        AND l.status <> 'cancelado'
        AND l.tipo = 'despesa'
        AND l.competencia_data >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND l.valor_total > 0
        AND l.valor_total < 5
      ORDER BY l.competencia_data DESC, l.id DESC
      LIMIT 40
    `,
    [gestaoId],
  );

  return rows;
}

export async function countSimilarLancamentosRecent(input: {
  gestaoId: number;
  contaId: number;
  valorTotal: number;
  descricao: string;
  dias?: number;
}) {
  const dias = input.dias ?? 30;

  const [rows] = await pool.query<Array<RowDataPacket & { c: number }>>(
    `
      SELECT COUNT(*) AS c
      FROM lancamentos
      WHERE gestao_id = ?
        AND conta_id = ?
        AND status <> 'cancelado'
        AND tipo <> 'transferencia'
        AND ABS(valor_total - ?) < 0.009
        AND LOWER(TRIM(descricao)) = LOWER(TRIM(?))
        AND competencia_data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `,
    [input.gestaoId, input.contaId, input.valorTotal, input.descricao, dias],
  );

  return Number(rows[0]?.c ?? 0);
}

export async function updateLancamentosMeio(input: {
  gestaoId: number;
  lancamentoIds: number[];
  meio: LancamentoMeio;
}) {
  if (input.lancamentoIds.length === 0) {
    return 0;
  }

  const placeholders = input.lancamentoIds.map(() => "?").join(", ");
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE lancamentos
      SET meio = ?
      WHERE gestao_id = ?
        AND id IN (${placeholders})
    `,
    [input.meio, input.gestaoId, ...input.lancamentoIds],
  );

  return result.affectedRows;
}

export async function updateLancamentosCompetenciaData(input: {
  gestaoId: number;
  lancamentoIds: number[];
  competenciaData: string;
}) {
  if (input.lancamentoIds.length === 0) {
    return 0;
  }

  const placeholders = input.lancamentoIds.map(() => "?").join(", ");
  const [result] = await pool.query<ResultSetHeader>(
    `
      UPDATE lancamentos
      SET competencia_data = ?
      WHERE gestao_id = ?
        AND id IN (${placeholders})
    `,
    [input.competenciaData, input.gestaoId, ...input.lancamentoIds],
  );

  if (result.affectedRows > 0) {
    const connection = await pool.getConnection();
    try {
      await syncGestaoInicioEm(connection, input.gestaoId);
    } finally {
      connection.release();
    }
  }

  return result.affectedRows;
}

export async function deleteLancamentos(input: {
  gestaoId: number;
  lancamentoIds: number[];
}) {
  if (input.lancamentoIds.length === 0) {
    return 0;
  }

  const placeholders = input.lancamentoIds.map(() => "?").join(", ");
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        DELETE lr
        FROM lancamento_rateios lr
        INNER JOIN lancamentos l
          ON l.id = lr.lancamento_id
        WHERE l.gestao_id = ?
          AND l.id IN (${placeholders})
      `,
      [input.gestaoId, ...input.lancamentoIds],
    );

    const [result] = await connection.query<ResultSetHeader>(
      `
        DELETE FROM lancamentos
        WHERE gestao_id = ?
          AND id IN (${placeholders})
      `,
      [input.gestaoId, ...input.lancamentoIds],
    );

    if (result.affectedRows > 0) {
      await syncGestaoInicioEm(connection, input.gestaoId);
    }

    await connection.commit();

    if (result.affectedRows > 0) {
      await registerAudit({
        userId: undefined,
        gestaoId: input.gestaoId,
        action: "delete",
        module: "lancamentos",
        entity: "lancamento",
        details: { lancamentoIds: input.lancamentoIds, affectedRows: result.affectedRows },
      });
    }

    return result.affectedRows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```
