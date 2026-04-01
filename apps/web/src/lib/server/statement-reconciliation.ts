import "server-only";

import type { QuickAddSuggestion } from "@ltcashflow/validation";

type CategoriaOption = {
  id: number;
  nome: string;
  natureza?: "receita" | "despesa" | "ambos";
};

type LancamentoLike = {
  id: number;
  tipo: string;
  meio: string | null;
  descricao: string;
  valor_total: string;
  competencia_data: string;
  categoria_nome: string | null;
};

export type ParsedStatementItem = {
  id: string;
  date: string;
  label: string;
  detail: string;
  direction: "in" | "out";
  amount: number;
  balanceAfter: number | null;
  draft: QuickAddSuggestion;
  rationale: string;
};

export type StatementPreview = {
  parsedCount: number;
  matchedCount: number;
  missingCount: number;
  ignoredCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  missingItems: ParsedStatementItem[];
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function parseMoney(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function normalizeStatementLine(line: string) {
  return line
    .replace(/([^\s])(-?R\$)/g, "$1 $2")
    .replace(/([\d,])(?=R\$)/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(day: number, month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthNumber(name: string) {
  const normalized = normalizeText(name);
  const map: Record<string, number> = {
    janeiro: 1,
    fevereiro: 2,
    marco: 3,
    abril: 4,
    maio: 5,
    junho: 6,
    julho: 7,
    agosto: 8,
    setembro: 9,
    outubro: 10,
    novembro: 11,
    dezembro: 12,
  };

  return map[normalized] ?? null;
}

function findCategoryByName(
  categories: CategoriaOption[],
  names: string[],
  natureza?: "receita" | "despesa",
) {
  const normalizedNames = names.map((name) => normalizeText(name));

  return (
    categories.find(
      (item) =>
        normalizedNames.includes(normalizeText(item.nome)) &&
        (!natureza || item.natureza === natureza || item.natureza === "ambos"),
    ) ?? null
  );
}

function pickStatementCategory(
  label: string,
  detail: string,
  direction: "in" | "out",
  categories: CategoriaOption[],
) {
  const normalizedLabel = normalizeText(label);
  const normalizedDetail = normalizeText(detail);

  if (normalizedLabel.includes("pix recebido devolvido")) {
    return (
      findCategoryByName(categories, ["Saida da conta"], "despesa") ??
      findCategoryByName(categories, ["Outros"], "despesa") ??
      findCategoryByName(categories, ["Outros"]) ??
      categories[0] ??
      null
    );
  }

  if (normalizedLabel.includes("pix recebido")) {
    return (
      findCategoryByName(categories, ["FutureTrade"], "receita") ??
      findCategoryByName(categories, ["Outros"], "receita") ??
      findCategoryByName(categories, ["Outros"]) ??
      categories[0] ??
      null
    );
  }

  if (
    normalizedLabel.includes("pix recebido devolvido") ||
    normalizedLabel.includes("aplicacao") ||
    normalizedLabel.includes("pagamento efetuado") ||
    normalizedLabel.includes("pix enviado") ||
    normalizedLabel.includes("transferencia")
  ) {
    return (
      findCategoryByName(categories, ["Saida da conta"], "despesa") ??
      findCategoryByName(categories, ["Outros"], "despesa") ??
      findCategoryByName(categories, ["Outros"]) ??
      categories[0] ??
      null
    );
  }

  if (normalizedLabel.includes("compra no debito")) {
    if (/(onibus|transp|transporte|colet)/.test(normalizedDetail)) {
      return (
        findCategoryByName(categories, ["Transporte"], "despesa") ??
        findCategoryByName(categories, ["Outros"], "despesa") ??
        categories[0] ??
        null
      );
    }

    if (/(superdia|mercado|supermercado|feira|padaria)/.test(normalizedDetail)) {
      return (
        findCategoryByName(categories, ["Alimentacao"], "despesa") ??
        findCategoryByName(categories, ["Outros"], "despesa") ??
        categories[0] ??
        null
      );
    }
  }

  return (
    findCategoryByName(categories, ["Outros"], direction === "in" ? "receita" : "despesa") ??
    findCategoryByName(categories, ["Outros"]) ??
    categories[0] ??
    null
  );
}

function describeStatementLine(label: string, detail: string, direction: "in" | "out") {
  const normalizedLabel = normalizeText(label);
  const normalizedDetail = normalizeText(detail);

  if (normalizedLabel.includes("pix recebido devolvido")) {
    return "Estorno Pix";
  }

  if (normalizedLabel.includes("pix recebido")) {
    return "Entrada de Pix";
  }

  if (normalizedLabel.includes("aplicacao")) {
    return "Aplicacao financeira";
  }

  if (normalizedLabel.includes("pagamento efetuado")) {
    return "Pagamento de fatura";
  }

  if (normalizedLabel.includes("compra no debito")) {
    if (/(onibus|transp|transporte|colet)/.test(normalizedDetail)) {
      return "Onibus transporte coletivo";
    }

    if (normalizedDetail.includes("superdia")) {
      return "Super Dia";
    }

    if (/(mercado|supermercado|feira|padaria)/.test(normalizedDetail)) {
      return "Mercado";
    }
  }

  return direction === "in" ? "Entrada em conta" : "Saida da conta";
}

function classifyStatementLine(
  label: string,
  detail: string,
  direction: "in" | "out",
): Pick<QuickAddSuggestion, "tipo" | "meio"> & { rationale: string } {
  const normalizedLabel = normalizeText(label);
  const normalizedDetail = normalizeText(detail);

  if (normalizedLabel.includes("pix recebido devolvido")) {
    return {
      tipo: "despesa",
      meio: "pix",
      rationale: "Linha classificada como devolucao/estorno saindo da conta.",
    };
  }

  if (normalizedLabel.includes("pix recebido")) {
    return {
      tipo: "receita",
      meio: "pix",
      rationale: "Linha classificada como entrada via PIX.",
    };
  }

  if (normalizedLabel.includes("compra no debito")) {
    return {
      tipo: "despesa",
      meio: "debito",
      rationale: /(onibus|transp|transporte|colet)/.test(normalizedDetail)
        ? "Compra no debito classificada como despesa de transporte."
        : "Compra no debito classificada como despesa.",
    };
  }

  if (normalizedLabel.includes("aplicacao")) {
    return {
      tipo: "despesa",
      meio: "transferencia",
      rationale: "Aplicacao financeira classificada como saida da conta.",
    };
  }

  if (normalizedLabel.includes("pagamento efetuado")) {
    return {
      tipo: "despesa",
      meio: "transferencia",
      rationale: "Pagamento efetuado classificado como saida da conta.",
    };
  }

  return {
    tipo: direction === "in" ? "receita" : "despesa",
    meio: direction === "in" ? "pix" : "outro",
    rationale: direction === "in"
      ? "Linha interpretada como entrada em conta."
      : "Linha interpretada como saida da conta.",
  };
}

function parseTransactionLine(line: string, currentDate: string) {
  const normalizedLine = normalizeStatementLine(line);
  const match = normalizedLine.match(/^(.*?):\s*(.*?)\s*(-?)R\$\s*([\d\.\,]+)(?:\s*R\$\s*([\d\.\,]+))?\s*$/i);

  if (!match) {
    return null;
  }

  const label = match[1]?.replace(/^"+|"+$/g, "").trim();
  const detail = match[2]?.replace(/^"+|"+$/g, "").trim();
  const sign = match[3] ?? "";
  const amountText = match[4];
  const balanceText = match[5];

  if (!label || !detail || !amountText) {
    return null;
  }

  const amount = parseMoney(amountText);
  const balanceAfter = balanceText ? parseMoney(balanceText) : null;

  return {
    date: currentDate,
    label,
    detail,
    direction: sign === "-" ? ("out" as const) : ("in" as const),
    amount,
    balanceAfter,
  };
}

export function parseStatementText(input: {
  text: string;
  contaId: number;
  categories: CategoriaOption[];
  fallbackDate?: string;
}) {
  const lines = input.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const items: ParsedStatementItem[] = [];
  let currentDate: string | null = input.fallbackDate ?? null;
  let ignoredCount = 0;
  let order = 0;

  for (const line of lines) {
    const normalized = normalizeText(line);

    if (
      /^(fale com a gente|sac:|ouvidoria:|deficiencia|deficiencia de fala|extrato|saldo do dia)/.test(normalized) ||
      /^saldo do dia/.test(normalized)
    ) {
      ignoredCount += 1;
      continue;
    }

    const dateMatch = line.match(/^(\d{1,2}) de ([A-Za-zÀ-ÿ]+) de (20\d{2})/i);

    if (dateMatch?.[1] && dateMatch?.[2] && dateMatch?.[3]) {
      const day = Number(dateMatch[1]);
      const month = monthNumber(dateMatch[2]);
      const year = Number(dateMatch[3]);

      if (month) {
        currentDate = formatDate(day, month, year);
      }

      ignoredCount += 1;
      continue;
    }

    if (!currentDate) {
      ignoredCount += 1;
      continue;
    }

    const parsed = parseTransactionLine(line, currentDate);

    if (!parsed) {
      ignoredCount += 1;
      continue;
    }

    const classification = classifyStatementLine(parsed.label, parsed.detail, parsed.direction);
    const category = pickStatementCategory(parsed.label, parsed.detail, parsed.direction, input.categories);

    if (!category) {
      ignoredCount += 1;
      continue;
    }

    order += 1;

    items.push({
      id: `${parsed.date}-${order}-${parsed.amount.toFixed(2)}`,
      date: parsed.date,
      label: parsed.label,
      detail: parsed.detail,
      direction: parsed.direction,
      amount: parsed.amount,
      balanceAfter: parsed.balanceAfter,
      draft: {
        descricao: describeStatementLine(parsed.label, parsed.detail, parsed.direction),
        tipo: classification.tipo,
        status: "liquidado",
        meio: classification.meio,
        valorTotal: parsed.amount,
        competenciaData: parsed.date,
        contaId: input.contaId,
        categoriaId: category.id,
        confianca: 0.88,
        motivo: classification.rationale,
      },
      rationale: classification.rationale,
    });
  }

  return { items, ignoredCount };
}

function scoreMatch(item: ParsedStatementItem, lancamento: LancamentoLike) {
  let score = 0;

  if (lancamento.competencia_data === item.date) {
    score += 5;
  }

  if (Math.abs(Number(lancamento.valor_total) - item.amount) < 0.001) {
    score += 6;
  }

  if (lancamento.tipo === item.draft.tipo) {
    score += 3;
  }

  if ((lancamento.meio ?? "") === (item.draft.meio ?? "")) {
    score += 2;
  }

  if (normalizeText(lancamento.descricao) === normalizeText(item.draft.descricao)) {
    score += 3;
  }

  if (
    item.detail &&
    normalizeText(`${lancamento.descricao} ${lancamento.categoria_nome ?? ""}`).includes(
      normalizeText(item.detail).slice(0, 16),
    )
  ) {
    score += 1;
  }

  return score;
}

export function buildStatementPreview(input: {
  parsedItems: ParsedStatementItem[];
  existingLancamentos: LancamentoLike[];
  ignoredCount: number;
}) {
  const usedIds = new Set<number>();
  const missingItems: ParsedStatementItem[] = [];
  let matchedCount = 0;

  for (const item of input.parsedItems) {
    const match = input.existingLancamentos
      .filter((candidate) => !usedIds.has(candidate.id))
      .map((candidate) => ({ candidate, score: scoreMatch(item, candidate) }))
      .filter((entry) => entry.score >= 14)
      .sort((left, right) => right.score - left.score)[0];

    if (match) {
      usedIds.add(match.candidate.id);
      matchedCount += 1;
      continue;
    }

    missingItems.push(item);
  }

  const sortedDates = input.parsedItems.map((item) => item.date).sort();

  return {
    parsedCount: input.parsedItems.length,
    matchedCount,
    missingCount: missingItems.length,
    ignoredCount: input.ignoredCount,
    dateFrom: sortedDates[0] ?? null,
    dateTo: sortedDates[sortedDates.length - 1] ?? null,
    missingItems,
  } satisfies StatementPreview;
}
