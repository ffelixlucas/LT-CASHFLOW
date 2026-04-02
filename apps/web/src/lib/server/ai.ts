import "server-only";

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

function detectTipo(prompt: string): "receita" | "despesa" | "ajuste" {
  const normalized = normalizeText(prompt);

  if (/(salario|recebi|recebimento|ganhei|entrada|pix recebido|deposito)/.test(normalized)) {
    return "receita";
  }

  if (/(ajuste|correcao)/.test(normalized)) {
    return "ajuste";
  }

  return "despesa";
}

function detectExplicitTipo(prompt: string): "receita" | "despesa" | "ajuste" | undefined {
  const normalized = normalizeText(prompt);

  if (/(salario|recebi|recebimento|ganhei|entrada|pix recebido|deposito)/.test(normalized)) {
    return "receita";
  }

  if (/(ajuste|correcao)/.test(normalized)) {
    return "ajuste";
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

  if (/(boleto)/.test(normalized)) {
    return "boleto" as const;
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

  const keywordMap: Array<{ terms: RegExp; category: string }> = [
    { terms: /(mercado|supermercado|feira|ifood|restaurante|padaria|lanche)/, category: "Alimentacao" },
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

  const keywordMap: Array<{ terms: RegExp; category: string }> = [
    { terms: /(mercado|supermercado|feira|ifood|restaurante|padaria|lanche)/, category: "Alimentacao" },
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
  tipo: "receita" | "despesa" | "ajuste",
  meio?: QuickAddSuggestion["meio"],
) {
  const normalized = normalizeText(prompt);

  if (tipo === "receita" && meio === "pix") {
    return "Entrada de Pix";
  }

  if (/(onibus|ônibus|transp|transporte)/.test(normalized)) {
    return "Onibus transporte coletivo";
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
  tipo: "receita" | "despesa" | "ajuste",
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

  if (explicitCategoria) {
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
 - meio: pix, debito, credito, dinheiro, boleto, ted_doc, transferencia ou outro
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
