export type FinanceLancamentoTipo = "receita" | "despesa" | "transferencia" | "ajuste";
export type FinanceLancamentoStatus = "previsto" | "pendente" | "liquidado" | "cancelado";
export type FinanceLiquidezBucket = "disponivel" | "reserva" | "investimento";

export type BalanceMovement = {
  tipo: FinanceLancamentoTipo;
  status?: FinanceLancamentoStatus;
  valor: number;
  accountId?: number | null;
  destinationAccountId?: number | null;
};

export type AccountBalanceInput = {
  id: number;
  bucket: FinanceLiquidezBucket;
  saldoInicial: number;
  movements: BalanceMovement[];
};

export type AggregateBalanceResult = {
  saldoAtual: number;
  entradas: number;
  despesas: number;
  saidasConta: number;
};

export type CashFlowInput = {
  tipo: FinanceLancamentoTipo;
  status?: FinanceLancamentoStatus;
  valor: number;
};

export type CashFlowResult = {
  receitas: number;
  despesas: number;
  transferencias: number;
  ajustes: number;
  saldoLiquido: number;
};

export type CardTransaction = {
  valor: number;
  status?: FinanceLancamentoStatus;
  competenciaData: string;
  liquidacaoData?: string | null;
  parcelaAtual?: number | null;
  parcelasTotal?: number | null;
};

export type CardStatementInput = {
  fechamentoDia: number;
  vencimentoDia: number;
  limiteTotal?: number;
  saldoInicialAberto?: number;
  transacoes: CardTransaction[];
  pagamentos: Array<{ valor: number; status?: FinanceLancamentoStatus; data: string }>;
};

export type CardStatementResult = {
  totalFaturaAtual: number;
  totalPagoFaturaAtual: number;
  saldoFaturaAtual: number;
  limiteUtilizado: number;
  limiteDisponivel: number | null;
  melhorDiaCompra: number;
};

function isLiquidado(status?: FinanceLancamentoStatus) {
  return status === undefined || status === "liquidado";
}

function toPositive(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.abs(value);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function aggregateBalance(input: AccountBalanceInput): AggregateBalanceResult {
  let saldoAtual = input.saldoInicial;
  let entradas = 0;
  let despesas = 0;
  let saidasConta = 0;

  for (const movement of input.movements) {
    if (!isLiquidado(movement.status)) {
      continue;
    }

    const valor = toPositive(movement.valor);

    if (movement.tipo === "receita") {
      saldoAtual += valor;
      entradas += valor;
      continue;
    }

    if (movement.tipo === "despesa") {
      saldoAtual -= valor;
      despesas += valor;
      saidasConta += valor;
      continue;
    }

    if (movement.tipo === "transferencia") {
      if (movement.accountId === input.id) {
        saldoAtual -= valor;
        saidasConta += valor;
      } else if (movement.destinationAccountId === input.id) {
        saldoAtual += valor;
        entradas += valor;
      }
      continue;
    }
  }

  return {
    saldoAtual: round2(saldoAtual),
    entradas: round2(entradas),
    despesas: round2(despesas),
    saidasConta: round2(saidasConta),
  };
}

export function computeAvailable(
  buckets: Record<FinanceLiquidezBucket, number>,
): number {
  return round2(Number.isFinite(buckets.disponivel) ? buckets.disponivel : 0);
}

export function computeCashFlow(movements: CashFlowInput[]): CashFlowResult {
  let receitas = 0;
  let despesas = 0;
  let transferencias = 0;
  let ajustes = 0;

  for (const movement of movements) {
    if (!isLiquidado(movement.status)) {
      continue;
    }

    const valor = toPositive(movement.valor);

    if (movement.tipo === "receita") {
      receitas += valor;
    } else if (movement.tipo === "despesa") {
      despesas += valor;
    } else if (movement.tipo === "transferencia") {
      transferencias += valor;
    } else if (movement.tipo === "ajuste") {
      ajustes += valor;
    } else if (movement.tipo === "abertura") {
      if (movement.valor >= 0) {
        receitas += valor;
      } else {
        despesas += valor;
      }
    }
  }

  return {
    receitas: round2(receitas),
    despesas: round2(despesas),
    transferencias: round2(transferencias),
    ajustes: round2(ajustes),
    saldoLiquido: round2(receitas - despesas),
  };
}

function cycleStart(dateIso: string, fechamentoDia: number) {
  const [yearRaw, monthRaw, dayRaw] = dateIso.split("-").map(Number);
  const year = yearRaw ?? 1970;
  const month = monthRaw ?? 1;
  const day = dayRaw ?? 1;

  if (day > fechamentoDia) {
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }

  const prev = new Date(year, month - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
}

export function computeCardStatement(input: CardStatementInput): CardStatementResult {
  const today = new Date();
  const nowIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  const currentCycle = cycleStart(nowIso, input.fechamentoDia);

  const comprasCiclo = input.transacoes.filter(
    (tx) => isLiquidado(tx.status) && cycleStart(tx.competenciaData, input.fechamentoDia) === currentCycle,
  );
  const pagamentosCiclo = input.pagamentos.filter(
    (pay) => isLiquidado(pay.status) && cycleStart(pay.data, input.fechamentoDia) === currentCycle,
  );

  const saldoInicialAberto = toPositive(input.saldoInicialAberto ?? 0);
  const totalFaturaAtual = saldoInicialAberto + comprasCiclo.reduce((acc, item) => acc + toPositive(item.valor), 0);
  const totalPagoFaturaAtual = pagamentosCiclo.reduce((acc, item) => acc + toPositive(item.valor), 0);
  const saldoFaturaAtual = Math.max(0, totalFaturaAtual - totalPagoFaturaAtual);
  const limiteUtilizado = saldoFaturaAtual;
  const limiteDisponivel =
    typeof input.limiteTotal === "number" ? round2(Math.max(0, input.limiteTotal - limiteUtilizado)) : null;
  const melhorDiaCompra = input.fechamentoDia >= 28 ? 1 : input.fechamentoDia + 1;

  return {
    totalFaturaAtual: round2(totalFaturaAtual),
    totalPagoFaturaAtual: round2(totalPagoFaturaAtual),
    saldoFaturaAtual: round2(saldoFaturaAtual),
    limiteUtilizado: round2(limiteUtilizado),
    limiteDisponivel,
    melhorDiaCompra,
  };
}

export function computeMonthlyBuckets(
  accounts: Array<{ bucket: FinanceLiquidezBucket; saldoAtual: number }>,
) {
  return accounts.reduce<Record<FinanceLiquidezBucket, number>>(
    (acc, account) => {
      acc[account.bucket] += account.saldoAtual;
      return acc;
    },
    {
      disponivel: 0,
      reserva: 0,
      investimento: 0,
    },
  );
}
