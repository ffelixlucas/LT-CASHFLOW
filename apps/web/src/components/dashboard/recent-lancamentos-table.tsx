"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";

import { computeCashFlow } from "@ltcashflow/finance-core";
import { deleteLancamentoAction, updateLancamentoAction } from "@/app/dashboard/actions";
import { DateInput } from "@/components/ui/date-input";
import { formatDateForDisplay, formatTimeForDisplay, normalizeDateInput } from "@/lib/date";

type ContaOption = {
  id: number;
  nome: string;
};

type CategoriaOption = {
  id: number;
  nome: string;
};

type LancamentoItem = {
  id: number;
  conta_id: number;
  conta_tipo: string;
  conta_destino_id?: number | null;
  conta_destino_tipo?: string | null;
  categoria_id: number | null;
  tipo: string;
  status: string;
  meio: string | null;
  descricao: string;
  valor_total: string;
  competencia_data: string;
  fatura_competencia_data?: string | null;
  data_compra?: string | null;
  competencia_hora: string | null;
  vencimento_data: string | null;
  categoria_nome: string | null;
  conta_nome: string;
  conta_destino_nome?: string | null;
  is_abertura?: boolean;
};

type PeriodFilter = "all" | "today" | "last7" | "month" | "custom";
const PAGE_SIZE = 30;

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function signedMoney(value: string | number | null | undefined, tipo: string) {
  if (tipo === "transferencia") {
    return `-${money(value)}`;
  }
  const prefix = tipo === "receita" ? "+" : tipo === "despesa" ? "-" : "";
  return `${prefix}${money(value)}`;
}

const TIPOS_CORRENTE = new Set(["corrente", "carteira", "caixa", "outro"]);

function ehContaCorrente(tipo: string | null | undefined) {
  return !!tipo && TIPOS_CORRENTE.has(tipo);
}

function ehEventoForaDaCorrente(item: LancamentoItem) {
  // Eventos que NÃO impactam a corrente: compras/receitas dentro do cartão,
  // rendimentos e despesas dentro de poupança/investimento, etc.
  return item.tipo !== "transferencia" && !ehContaCorrente(item.conta_tipo);
}

function transferenciaSignedValue(item: LancamentoItem) {
  const valor = Number(item.valor_total ?? 0);
  const origemCorrente = ehContaCorrente(item.conta_tipo);
  const destinoCorrente = ehContaCorrente(item.conta_destino_tipo);

  if (origemCorrente && !destinoCorrente) {
    return -valor;
  }

  if (destinoCorrente && !origemCorrente) {
    return valor;
  }

  return 0;
}

function aberturaMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  const prefix = amount < 0 ? "-" : "+";
  return `${prefix}${money(Math.abs(amount))}`;
}

function contaLabel(item: LancamentoItem) {
  if (item.tipo === "transferencia") {
    const dest = item.conta_destino_nome ?? "?";
    return `${item.conta_nome} → ${dest}`;
  }
  return item.conta_nome;
}

function transferTargetLabel(item: LancamentoItem) {
  if (item.tipo !== "transferencia") {
    return "-";
  }

  if (item.conta_destino_tipo === "poupanca") {
    return "Poupança";
  }

  if (item.conta_destino_tipo === "investimento") {
    return "Investimento";
  }

  return item.conta_destino_nome ?? "Transferência";
}

function formatLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compareLancamentosChrono(a: LancamentoItem, b: LancamentoItem) {
  if (a.competencia_data !== b.competencia_data) {
    return a.competencia_data.localeCompare(b.competencia_data);
  }

  if (Boolean(a.is_abertura) !== Boolean(b.is_abertura)) {
    return a.is_abertura ? -1 : 1;
  }

  const timeA = a.competencia_hora ?? "";
  const timeB = b.competencia_hora ?? "";
  if (timeA !== timeB) {
    return timeA.localeCompare(timeB);
  }

  return a.id - b.id;
}

function shiftDays(base: Date, amount: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + amount);
  return next;
}

function monthBounds(reference: Date) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);

  return {
    from: formatLocalIsoDate(start),
    to: formatLocalIsoDate(end),
  };
}

function periodDates(period: PeriodFilter) {
  const today = new Date();

  if (period === "today") {
    const iso = formatLocalIsoDate(today);
    return { from: iso, to: iso };
  }

  if (period === "last7") {
    return {
      from: formatLocalIsoDate(shiftDays(today, -6)),
      to: formatLocalIsoDate(today),
    };
  }

  if (period === "month") {
    return monthBounds(today);
  }

  return { from: "", to: "" };
}

function meioLabel(value: string | null) {
  if (!value) return "-";
  if (value === "ted_doc") return "TED/DOC";
  if (value === "pix") return "PIX";
  return value;
}

function statusLabel(value: string) {
  return value;
}

function tipoLabel(
  value: string,
  categoriaNome: string | null,
  isAbertura?: boolean,
  contaDestinoTipo?: string | null,
) {
  if (isAbertura || value === "abertura") {
    return "abertura";
  }
  if (value === "transferencia") {
    if (contaDestinoTipo === "poupanca" || contaDestinoTipo === "investimento") {
      return "aplicacao";
    }
    return "transferencia";
  }
  if (value === "despesa" && categoriaNome === "Saida da conta") {
    return "saida";
  }

  return value;
}

function valueTone(tipo: string) {
  if (tipo === "abertura") {
    return "text-foreground";
  }

  if (tipo === "receita") {
    return "text-success";
  }

  if (tipo === "despesa") {
    return "text-accent-strong";
  }

  if (tipo === "transferencia") {
    return "text-foreground";
  }

  return "text-foreground";
}

function dateTimeLabel(item: Pick<LancamentoItem, "competencia_data" | "competencia_hora">) {
  const date = formatDateForDisplay(item.competencia_data);
  const time = formatTimeForDisplay(item.competencia_hora);

  return time ? `${date} · ${time}` : date;
}

function purchaseDateLabel(item: Pick<LancamentoItem, "data_compra" | "competencia_data">) {
  if (!item.data_compra || item.data_compra === item.competencia_data) {
    return null;
  }

  return `Compra: ${formatDateForDisplay(item.data_compra)}`;
}

function movementDotTone(tipo: string) {
  if (tipo === "abertura") {
    return "bg-slate-400";
  }

  if (tipo === "receita") {
    return "bg-success";
  }

  if (tipo === "despesa") {
    return "bg-accent";
  }

  if (tipo === "transferencia") {
    return "bg-sky-500";
  }

  return "bg-muted";
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
      <path
        d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FilterCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-line bg-background px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-foreground text-white shadow-sm"
          : "border border-line bg-background text-foreground hover:bg-surface"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function CompactSelect({
  children,
  onChange,
  value,
}: {
  children: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      className="rounded-2xl border border-line bg-background px-4 py-3 text-sm"
      onChange={(event) => onChange(event.currentTarget.value)}
      value={value}
    >
      {children}
    </select>
  );
}

function ActiveFilterBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      className="rounded-full border border-line bg-background px-3 py-1.5 text-xs font-medium text-foreground"
      onClick={onRemove}
      type="button"
    >
      {label} ×
    </button>
  );
}

function buildPageWindow(current: number, total: number) {
  const pages: Array<number | "ellipsis"> = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);

  if (start > 1) {
    pages.push(1);
    if (start > 2) {
      pages.push("ellipsis");
    }
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < total) {
    if (end < total - 1) {
      pages.push("ellipsis");
    }
    pages.push(total);
  }

  return pages;
}

function PaginationButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`min-w-9 rounded-full border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-foreground bg-foreground text-white"
          : "border-line bg-background text-foreground hover:bg-surface"
      } disabled:cursor-not-allowed disabled:opacity-50`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
}) {
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(totalItems, page * pageSize);
  const pageWindow = buildPageWindow(page, totalPages);

  return (
    <div className="flex flex-col gap-3 rounded-[1.2rem] border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        Mostrando {firstItem}–{lastItem} de {totalItems} lancamento(s)
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <PaginationButton active={false} disabled={page === 1} onClick={() => onPageChange(1)}>
          {"<<"}
        </PaginationButton>
        <PaginationButton active={false} disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </PaginationButton>

        {pageWindow.map((item, index) =>
          item === "ellipsis" ? (
            <span className="px-2 text-sm text-muted" key={`ellipsis-${index}`}>
              ...
            </span>
          ) : (
            <PaginationButton active={item === page} key={item} onClick={() => onPageChange(item)}>
              {item}
            </PaginationButton>
          ),
        )}

        <PaginationButton active={false} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          Proxima
        </PaginationButton>
        <PaginationButton active={false} disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>
          {">>"}
        </PaginationButton>
      </div>
    </div>
  );
}

export function RecentLancamentosTable({
  gestaoId,
  contas,
  categorias,
  lancamentos,
  saldoInicialDisponivel = 0,
  compact = false,
  showFiltersSummary = true,
  showGroupBalance = true,
  showSummaryCards = true,
}: {
  gestaoId: number;
  contas: ContaOption[];
  categorias: CategoriaOption[];
  lancamentos: LancamentoItem[];
  saldoInicialDisponivel?: number;
  compact?: boolean;
  showFiltersSummary?: boolean;
  showGroupBalance?: boolean;
  showSummaryCards?: boolean;
}) {
  const [selectedLancamentoId, setSelectedLancamentoId] = useState<number | null>(null);
  const [expandedLancamentoId, setExpandedLancamentoId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [meioFilter, setMeioFilter] = useState("all");
  const [contaFilter, setContaFilter] = useState("all");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [page, setPage] = useState(1);
  const wrapperMarginClass = compact ? "mt-2" : "mt-4";
  const groupedListClass = compact ? "space-y-0.5" : "space-y-2.5";
  const mobileCardPaddingClass = compact ? "px-3 py-2.5" : "px-4 py-3.5";
  const desktopRowPaddingClass = compact ? "py-1.5" : "py-4";
  const desktopGroupCellClass = compact ? "py-1" : "pb-4 pt-8";
  const desktopGroupInnerClass = compact ? "min-w-[160px] px-3 py-0" : "min-w-[240px] px-5 py-1";

  const selectedLancamento = useMemo(
    () => lancamentos.find((item) => item.id === selectedLancamentoId) ?? null,
    [lancamentos, selectedLancamentoId],
  );

  const [editTipoDraft, setEditTipoDraft] = useState<{ id: number; tipo: string } | null>(null);
  const editTipo =
    selectedLancamento && editTipoDraft?.id === selectedLancamento.id
      ? editTipoDraft.tipo
      : selectedLancamento?.tipo ?? "despesa";

  useEffect(() => {
    if (!selectedLancamento) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedLancamentoId(null);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedLancamento]);

  const filteredLancamentos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedDateFrom = normalizeDateInput(dateFrom);
    const normalizedDateTo = normalizeDateInput(dateTo);

    return lancamentos.filter((item) => {
      if (tipoFilter !== "all" && item.tipo !== tipoFilter) {
        return false;
      }

      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (meioFilter !== "all" && (item.meio ?? "") !== meioFilter) {
        return false;
      }

      if (contaFilter !== "all") {
        const cid = Number(contaFilter);
        const touchesConta =
          item.conta_id === cid ||
          (item.tipo === "transferencia" && item.conta_destino_id === cid);
        if (!touchesConta) {
          return false;
        }
      }

      if (categoriaFilter !== "all" && String(item.categoria_id ?? "") !== categoriaFilter) {
        return false;
      }

      if (normalizedDateFrom && item.competencia_data < normalizedDateFrom) {
        return false;
      }

      if (normalizedDateTo && item.competencia_data > normalizedDateTo) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        item.descricao,
        item.tipo,
        item.status,
        item.meio ?? "",
        item.conta_nome,
        item.conta_destino_nome ?? "",
        item.conta_destino_tipo ?? "",
        item.categoria_nome ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [categoriaFilter, contaFilter, dateFrom, dateTo, lancamentos, meioFilter, search, statusFilter, tipoFilter]);

  const filteredSummary = useMemo(() => {
    // Para o resumo de fluxo "líquido", só contam eventos que tocam a conta corrente
    // (corrente/carteira/caixa). Compras/rendimentos dentro do cartão ou das reservas
    // não saem nem entram da corrente — só as transferências entre corrente e essas
    // contas (pagamento de fatura, aplicação, resgate) entram de fato.
    const flow = computeCashFlow(
      filteredLancamentos
        .filter((item) => !ehEventoForaDaCorrente(item))
        .map((item) => ({
          tipo: item.tipo as "receita" | "despesa" | "transferencia" | "ajuste",
          status: item.status as "previsto" | "pendente" | "liquidado" | "cancelado",
          valor: Number(item.valor_total),
        })),
    );

    return {
      quantidade: filteredLancamentos.length,
      receitas: flow.receitas,
      despesas: flow.despesas,
      transferencias: flow.transferencias,
      saldo: flow.saldoLiquido,
    };
  }, [filteredLancamentos]);

  const totalPages = Math.max(1, Math.ceil(filteredLancamentos.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedLancamentos = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredLancamentos.slice(start, start + PAGE_SIZE);
  }, [filteredLancamentos, safePage]);

  const saldoPorDia = useMemo(() => {
    const runningByDate = new Map<string, number>();
    let running = saldoInicialDisponivel;

    for (const item of [...filteredLancamentos].sort(compareLancamentosChrono)) {
      if (item.is_abertura) {
        runningByDate.set(item.competencia_data, running);
        continue;
      }

      // O saldo do extrato reflete a corrente: ignoramos receitas/despesas que
      // moram dentro de cartão, poupança ou investimento — elas não tocam a
      // corrente. As transferências envolvendo essas contas (pagamento de fatura,
      // aplicação, resgate) entram via `transferenciaSignedValue`, que só conta
      // o lado da corrente.
      const itemSaldo = ehEventoForaDaCorrente(item)
        ? 0
        : item.tipo === "receita"
          ? Number(item.valor_total)
          : item.tipo === "despesa"
            ? -Number(item.valor_total)
            : item.tipo === "transferencia"
              ? transferenciaSignedValue(item)
              : 0;

      running += itemSaldo;
      runningByDate.set(item.competencia_data, running);
    }

    return runningByDate;
  }, [filteredLancamentos, saldoInicialDisponivel]);

  const groupedLancamentos = useMemo(() => {
    const groups: Array<{
      date: string;
      items: LancamentoItem[];
      saldo: number;
      saldoFinal: number;
    }> = [];

    for (const item of paginatedLancamentos) {
      const lastGroup = groups[groups.length - 1];
      const foraDaCorrente = !item.is_abertura && ehEventoForaDaCorrente(item);
      const aberturaForaDaCorrente = item.is_abertura && !ehContaCorrente(item.conta_tipo);
      const itemSaldo = foraDaCorrente || aberturaForaDaCorrente
        ? 0
        : item.is_abertura
          ? Number(item.valor_total) >= 0
            ? Number(item.valor_total)
            : -Math.abs(Number(item.valor_total))
          : item.tipo === "receita"
            ? Number(item.valor_total)
            : item.tipo === "despesa"
              ? -Number(item.valor_total)
              : item.tipo === "transferencia"
                ? transferenciaSignedValue(item)
                : 0;

      if (!lastGroup || lastGroup.date !== item.competencia_data) {
        groups.push({
          date: item.competencia_data,
          items: [item],
          saldo: itemSaldo,
          saldoFinal: saldoPorDia.get(item.competencia_data) ?? itemSaldo,
        });
        continue;
      }

      lastGroup.items.push(item);
      lastGroup.saldo += itemSaldo;
      lastGroup.saldoFinal = saldoPorDia.get(lastGroup.date) ?? lastGroup.saldo;
    }

    return groups;
  }, [paginatedLancamentos, saldoPorDia]);

  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; label: string; clear: () => void }> = [];

    if (search.trim()) {
      items.push({
        key: "search",
        label: `Busca: ${search.trim()}`,
        clear: () => setSearch(""),
      });
    }

    if (tipoFilter !== "all") {
      const tipoLabelFilter =
        tipoFilter === "receita"
          ? "Receitas"
          : tipoFilter === "despesa"
            ? "Despesas"
            : tipoFilter === "transferencia"
              ? "Transferencias"
              : "Ajustes";
      items.push({
        key: "tipo",
        label: `Tipo: ${tipoLabelFilter}`,
        clear: () => setTipoFilter("all"),
      });
    }

    if (periodFilter !== "all") {
      const periodLabel =
        periodFilter === "today"
          ? "Hoje"
          : periodFilter === "last7"
            ? "Últimos 7 dias"
            : periodFilter === "month"
              ? "Este mês"
              : "Período personalizado";

      items.push({
        key: "period",
        label: `Período: ${periodLabel}`,
        clear: () => {
          setPeriodFilter("all");
          setDateFrom("");
          setDateTo("");
        },
      });
    }

    if (statusFilter !== "all") {
      items.push({
        key: "status",
        label: `Status: ${statusFilter}`,
        clear: () => setStatusFilter("all"),
      });
    }

    if (meioFilter !== "all") {
      items.push({
        key: "meio",
        label: `Meio: ${meioLabel(meioFilter)}`,
        clear: () => setMeioFilter("all"),
      });
    }

    if (contaFilter !== "all") {
      const conta = contas.find((item) => String(item.id) === contaFilter);
      items.push({
        key: "conta",
        label: `Origem: ${conta?.nome ?? contaFilter}`,
        clear: () => setContaFilter("all"),
      });
    }

    if (categoriaFilter !== "all") {
      const categoria = categorias.find((item) => String(item.id) === categoriaFilter);
      items.push({
        key: "categoria",
        label: `Categoria: ${categoria?.nome ?? categoriaFilter}`,
        clear: () => setCategoriaFilter("all"),
      });
    }

    if (dateFrom) {
      items.push({
        key: "dateFrom",
        label: `De: ${dateFrom}`,
        clear: () => {
          setDateFrom("");
          if (!dateTo) {
            setPeriodFilter("all");
          }
        },
      });
    }

    if (dateTo) {
      items.push({
        key: "dateTo",
        label: `Até: ${dateTo}`,
        clear: () => {
          setDateTo("");
          if (!dateFrom) {
            setPeriodFilter("all");
          }
        },
      });
    }

    return items;
  }, [categoriaFilter, categorias, contaFilter, contas, dateFrom, dateTo, meioFilter, periodFilter, search, statusFilter, tipoFilter]);

  function applyPeriod(nextPeriod: PeriodFilter) {
    setPeriodFilter(nextPeriod);

    if (nextPeriod === "custom") {
      return;
    }

    const dates = periodDates(nextPeriod);
    setDateFrom(formatDateForDisplay(dates.from));
    setDateTo(formatDateForDisplay(dates.to));
  }

  function clearFilters() {
    setSearch("");
    setTipoFilter("all");
    setStatusFilter("all");
    setMeioFilter("all");
    setContaFilter("all");
    setCategoriaFilter("all");
    setPeriodFilter("all");
    setDateFrom("");
    setDateTo("");
    setShowAdvancedFilters(false);
  }

  return (
    <>
      {compact || !showFiltersSummary ? null : (
        <div className="mt-4 rounded-[1.25rem] border border-line bg-surface p-4 sm:mt-5 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Filtros de gestao</p>
              <p className="mt-2 text-sm text-muted">
                {filteredSummary.quantidade} de {lancamentos.length} lancamento(s) no recorte atual.
              </p>
              <p className="mt-1 text-xs text-muted">
                Pagina {safePage} de {totalPages} · exibindo ate {PAGE_SIZE} itens por vez.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-line bg-background px-4 py-2 text-sm font-medium text-foreground"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                type="button"
              >
                {showAdvancedFilters ? "Ocultar filtros" : "Mais filtros"}
                {activeFilters.length > 0 ? ` · ${activeFilters.length}` : ""}
              </button>
              {activeFilters.length > 0 ? (
                <button
                  className="rounded-full border border-line bg-background px-4 py-2 text-sm font-medium text-foreground"
                  onClick={clearFilters}
                  type="button"
                >
                  Limpar tudo
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid gap-2.5 xl:grid-cols-[1.5fr_1fr]">
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3"
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Buscar lancamento, categoria ou origem"
              type="text"
              value={search}
            />

            <div className="flex flex-wrap gap-2">
              <FilterChip active={tipoFilter === "all"} onClick={() => setTipoFilter("all")}>
                Tudo
              </FilterChip>
              <FilterChip
                active={tipoFilter === "receita"}
                onClick={() => setTipoFilter("receita")}
              >
                Receitas
              </FilterChip>
              <FilterChip
                active={tipoFilter === "despesa"}
                onClick={() => setTipoFilter("despesa")}
              >
                Despesas
              </FilterChip>
              <FilterChip
                active={tipoFilter === "transferencia"}
                onClick={() => setTipoFilter("transferencia")}
              >
                Transferencias
              </FilterChip>
              <FilterChip
                active={periodFilter === "today"}
                onClick={() => applyPeriod("today")}
              >
                Hoje
              </FilterChip>
              <FilterChip
                active={periodFilter === "last7"}
                onClick={() => applyPeriod("last7")}
              >
                7 dias
              </FilterChip>
              <FilterChip
                active={periodFilter === "month"}
                onClick={() => applyPeriod("month")}
              >
                Este mês
              </FilterChip>
            </div>
          </div>

          {showAdvancedFilters ? (
            <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
            <CompactSelect onChange={setStatusFilter} value={statusFilter}>
              <option value="all">Todos os status</option>
              <option value="liquidado">Liquidado</option>
              <option value="pendente">Pendente</option>
              <option value="previsto">Previsto</option>
            </CompactSelect>

            <CompactSelect onChange={setMeioFilter} value={meioFilter}>
              <option value="all">Todos os meios</option>
              <option value="pix">PIX</option>
              <option value="debito">Debito</option>
              <option value="credito">Credito</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="ted_doc">TED/DOC</option>
              <option value="transferencia">Transferencia</option>
              <option value="outro">Outro</option>
              <option value="">Nao informado</option>
            </CompactSelect>

            <CompactSelect onChange={setContaFilter} value={contaFilter}>
              <option value="all">Todas as origens</option>
              {contas.map((conta) => (
                <option key={conta.id} value={String(conta.id)}>
                  {conta.nome}
                </option>
              ))}
            </CompactSelect>

            <CompactSelect onChange={setCategoriaFilter} value={categoriaFilter}>
              <option value="all">Todas as categorias</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={String(categoria.id)}>
                  {categoria.nome}
                </option>
              ))}
            </CompactSelect>

            <CompactSelect
              onChange={(value) => applyPeriod(value as PeriodFilter)}
              value={periodFilter}
            >
              <option value="all">Todo o periodo</option>
              <option value="today">Hoje</option>
              <option value="last7">Ultimos 7 dias</option>
              <option value="month">Este mes</option>
              <option value="custom">Periodo personalizado</option>
            </CompactSelect>

            {(periodFilter === "custom" || dateFrom || dateTo) ? (
              <>
                <DateInput
                  className="rounded-2xl border border-line bg-background px-4 py-3"
                  onValueChange={(nextValue) => {
                    setPeriodFilter("custom");
                    setDateFrom(nextValue);
                  }}
                  placeholder="Data inicial"
                  value={dateFrom}
                />

                <DateInput
                  className="rounded-2xl border border-line bg-background px-4 py-3"
                  onValueChange={(nextValue) => {
                    setPeriodFilter("custom");
                    setDateTo(nextValue);
                  }}
                  placeholder="Data final"
                  value={dateTo}
                />
              </>
            ) : null}
          </div>
          ) : null}

          {activeFilters.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <ActiveFilterBadge
                  key={filter.key}
                  label={filter.label}
                  onRemove={filter.clear}
                />
              ))}
            </div>
          ) : null}

          {showSummaryCards ? (
            <div className="mt-3 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              <FilterCard label="Lancamentos" value={String(filteredSummary.quantidade)} />
              <FilterCard label="Receitas" value={money(filteredSummary.receitas)} />
              <FilterCard label="Despesas" value={money(filteredSummary.despesas)} />
              <FilterCard label="Transferencias" value={money(filteredSummary.transferencias)} />
              <FilterCard label="Saldo" value={money(filteredSummary.saldo)} />
            </div>
          ) : null}
        </div>
      )}

      {filteredLancamentos.length > PAGE_SIZE ? (
        <div className="mt-3">
          <PaginationBar
            onPageChange={setPage}
            page={safePage}
            pageSize={PAGE_SIZE}
            totalItems={filteredLancamentos.length}
            totalPages={totalPages}
          />
        </div>
      ) : null}

      <div className={`${wrapperMarginClass} ${groupedListClass} lg:hidden`}>
        {groupedLancamentos.length > 0 ? (
          groupedLancamentos.map((group) => (
            <section key={group.date} className="space-y-2">
              <div className="flex items-center gap-3 px-1">
                <div className="h-px flex-1 bg-line" />
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Data</p>
                  <p className="mt-0.5 font-heading text-base font-semibold text-foreground">
                    {formatDateForDisplay(group.date)}
                  </p>
                </div>
                <div className="h-px flex-1 bg-line" />
              </div>

              {group.items.map((item, index) => (
                <article
                  className={`overflow-hidden rounded-[1rem] border border-line ${
                    index % 2 === 0 ? "bg-background" : "bg-surface/50"
                  }`}
                  key={item.id}
                >
                  {item.is_abertura ? (
                    <div className={`flex items-start justify-between gap-3 ${mobileCardPaddingClass}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2.5">
                          <span
                            aria-hidden="true"
                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${movementDotTone(item.tipo)}`}
                          />
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium text-foreground">{item.descricao}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-muted">
                              {item.tipo === "transferencia"
                                ? `${dateTimeLabel(item)} · ${contaLabel(item)}`
                                : item.is_abertura
                                  ? `${dateTimeLabel(item)} · ${contaLabel(item)}`
                                  : `${dateTimeLabel(item)} · ${item.categoria_nome ?? "Sem categoria"} · ${meioLabel(item.meio)}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className={`text-base font-semibold ${valueTone(item.tipo)}`}>
                          {item.is_abertura ? aberturaMoney(item.valor_total) : signedMoney(item.valor_total, item.tipo)}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">abertura</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="block w-full text-left"
                      onClick={() =>
                        setExpandedLancamentoId((current) => (current === item.id ? null : item.id))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setExpandedLancamentoId((current) => (current === item.id ? null : item.id));
                        }
                      }}
                      title="Toque para ver mais detalhes"
                      type="button"
                    >
                      <div className={`flex items-start justify-between gap-3 ${mobileCardPaddingClass}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2.5">
                            <span
                              aria-hidden="true"
                              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${movementDotTone(item.tipo)}`}
                            />
                            <div className="min-w-0">
                              <p className="line-clamp-1 font-medium text-foreground">{item.descricao}</p>
                              <p className="mt-1 line-clamp-1 text-xs text-muted">
                                {item.tipo === "transferencia"
                                  ? `${dateTimeLabel(item)} · ${contaLabel(item)}`
                                  : `${dateTimeLabel(item)} · ${item.categoria_nome ?? "Sem categoria"} · ${meioLabel(item.meio)}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className={`text-base font-semibold ${valueTone(item.tipo)}`}>
                            {signedMoney(item.valor_total, item.tipo)}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                            {expandedLancamentoId === item.id ? "recolher" : "detalhes"}
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {expandedLancamentoId === item.id && !item.is_abertura ? (
                    <div className="border-t border-line bg-surface px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Data</p>
                          <p className="mt-1 text-foreground">{formatDateForDisplay(item.competencia_data)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Hora</p>
                          <p className="mt-1 text-foreground">{formatTimeForDisplay(item.competencia_hora) || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Tipo</p>
                          <p className="mt-1 capitalize text-foreground">
                            {tipoLabel(item.tipo, item.categoria_nome, item.is_abertura, item.conta_destino_tipo)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Categoria</p>
                          <p className="mt-1 text-foreground">
                            {item.tipo === "transferencia"
                              ? transferTargetLabel(item)
                              : item.is_abertura
                                ? "Abertura"
                                : (item.categoria_nome ?? "-")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Meio</p>
                          <p className="mt-1 text-foreground">{meioLabel(item.meio)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Status</p>
                          <p className="mt-1 capitalize text-foreground">
                            {statusLabel(item.status)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
                            {item.is_abertura ? "Conta" : item.tipo === "transferencia" ? "Origem e destino" : "Origem"}
                          </p>
                          <p className="mt-1 text-foreground">{contaLabel(item)}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          className="rounded-full border border-line bg-background px-4 py-2 text-sm font-medium text-foreground"
                          onClick={() => setSelectedLancamentoId(item.id)}
                          type="button"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-line bg-background px-4 py-5 text-sm text-muted">
            Nenhum lancamento encontrado com os filtros atuais.
          </div>
        )}
      </div>

      <div className={`${wrapperMarginClass} hidden overflow-x-auto lg:block`}>
        <table className="min-w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="pb-3 pr-4">Descricao</th>
              <th className="pb-3 pr-4">Tipo</th>
              <th className="pb-3 pr-4">Categoria</th>
              <th className="pb-3 pr-4">Meio</th>
              <th className="pb-3 pr-4">Origem / destino</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {groupedLancamentos.length > 0 ? (
              groupedLancamentos.map((group) => (
                <Fragment key={group.date}>
                  <tr>
                    <td className={desktopGroupCellClass} colSpan={7}>
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-line/80" />
                        <div className={`${desktopGroupInnerClass} text-center`}>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Data</p>
                          <p className="mt-0.5 font-heading text-sm font-semibold text-foreground">
                            {formatDateForDisplay(group.date)}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium text-muted">
                            {group.items.length} movimentacao(oes)
                          </p>
                          {showGroupBalance ? (
                            <p
                              className={`mt-0.5 text-[11px] font-semibold ${
                                group.saldoFinal >= 0 ? "text-success" : "text-accent-strong"
                              }`}
                            >
                              Saldo {group.saldoFinal >= 0 ? "+" : "-"}
                              {money(Math.abs(group.saldoFinal))}
                            </p>
                          ) : null}
                        </div>
                        <div className="h-px flex-1 bg-line/80" />
                      </div>
                    </td>
                  </tr>

                  {group.items.map((item, index) => (
                    <tr
                      className={`group border-t border-line transition ${
                        item.is_abertura
                          ? "bg-surface/40"
                          : index % 2 === 0
                            ? "bg-background cursor-pointer hover:bg-surface/70"
                            : "bg-surface/60 cursor-pointer hover:bg-surface/70"
                      }`}
                      key={item.id}
                      onClick={item.is_abertura ? undefined : () => setSelectedLancamentoId(item.id)}
                      onKeyDown={
                        item.is_abertura
                          ? undefined
                          : (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedLancamentoId(item.id);
                              }
                            }
                      }
                      tabIndex={item.is_abertura ? -1 : 0}
                      title={item.is_abertura ? undefined : "Clique para editar este lancamento"}
                    >
                      <td className={`${desktopRowPaddingClass} pr-4`}>
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className={`mt-1.5 h-2.5 w-2.5 rounded-full ${movementDotTone(item.tipo)}`}
                          />
                          <div>
                            <p className="font-medium text-foreground">{item.descricao}</p>
                            <p className="mt-1 text-xs text-muted">
                              {dateTimeLabel(item)}
                            </p>
                            {purchaseDateLabel(item) ? (
                              <p className="mt-0.5 text-xs text-muted">{purchaseDateLabel(item)}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className={`${desktopRowPaddingClass} pr-4 capitalize`}>
                        {tipoLabel(item.tipo, item.categoria_nome, item.is_abertura, item.conta_destino_tipo)}
                      </td>
                      <td className={`${desktopRowPaddingClass} pr-4`}>
                        {item.tipo === "transferencia"
                          ? transferTargetLabel(item)
                          : item.is_abertura
                            ? "Abertura"
                            : (item.categoria_nome ?? "-")}
                      </td>
                      <td className={`${desktopRowPaddingClass} pr-4`}>{meioLabel(item.meio)}</td>
                      <td className={`${desktopRowPaddingClass} pr-4`}>{contaLabel(item)}</td>
                      <td className={`${desktopRowPaddingClass} pr-4 capitalize`}>{statusLabel(item.status)}</td>
                      <td className={desktopRowPaddingClass}>
                        <div className="flex items-center justify-between gap-3">
                          <span className={`font-semibold ${valueTone(item.tipo)}`}>
                            {item.is_abertura
                              ? aberturaMoney(item.valor_total)
                              : item.tipo === "transferencia"
                                ? `${transferenciaSignedValue(item) >= 0 ? "+" : "-"}${money(
                                    Math.abs(Number(item.valor_total ?? 0)),
                                  )}`
                                : signedMoney(item.valor_total, item.tipo)}
                          </span>
                          {item.is_abertura ? (
                            <span className="text-xs uppercase tracking-[0.18em] text-muted">abertura</span>
                          ) : (
                            <button
                              aria-label="Editar lancamento"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-background text-muted opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-surface hover:text-foreground"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedLancamentoId(item.id);
                              }}
                              type="button"
                            >
                              <PencilIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            ) : (
              <tr>
                <td className="py-6 text-muted" colSpan={7}>
                  Nenhum lancamento encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredLancamentos.length > PAGE_SIZE ? (
        <div className="mt-4">
          <PaginationBar
            onPageChange={setPage}
            page={safePage}
            pageSize={PAGE_SIZE}
            totalItems={filteredLancamentos.length}
            totalPages={totalPages}
          />
        </div>
      ) : null}

      {selectedLancamento ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 px-4 py-8"
          onClick={() => setSelectedLancamentoId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-line bg-surface p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Editar lancamento</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold">{selectedLancamento.descricao}</h3>
                <p className="mt-2 text-sm text-muted">
                  Ajuste qualquer campo e salve para atualizar esse item na movimentacao.
                </p>
              </div>

              <button
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-foreground"
                onClick={() => setSelectedLancamentoId(null)}
                type="button"
              >
                Fechar
              </button>
            </div>

            <form action={updateLancamentoAction} className="mt-6 grid gap-3 lg:grid-cols-2">
              <input name="gestaoId" type="hidden" value={gestaoId} />
              <input name="lancamentoId" type="hidden" value={selectedLancamento.id} />

              <input
                className="rounded-2xl border border-line bg-background px-4 py-3 lg:col-span-2"
                defaultValue={selectedLancamento.descricao}
                name="descricao"
                placeholder="Descricao do lancamento"
                required
              />

              <input name="tipo" type="hidden" value={editTipo} />

              <select
                className="rounded-2xl border border-line bg-background px-4 py-3"
                onChange={(event) =>
                  setEditTipoDraft(
                    selectedLancamento
                      ? {
                          id: selectedLancamento.id,
                          tipo: event.target.value,
                        }
                      : null,
                  )
                }
                value={editTipo}
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
                <option value="ajuste">Ajuste</option>
                <option value="transferencia">Transferencia</option>
              </select>

              <select
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedLancamento.status}
                name="status"
              >
                <option value="liquidado">Liquidado</option>
                <option value="pendente">Pendente</option>
                <option value="previsto">Previsto</option>
              </select>

              {editTipo === "transferencia" ? (
                <input name="meio" type="hidden" value="transferencia" />
              ) : (
                <select
                  className="rounded-2xl border border-line bg-background px-4 py-3"
                  defaultValue={selectedLancamento.meio ?? ""}
                  name="meio"
                >
                  <option value="">Meio nao informado</option>
                  <option value="pix">PIX</option>
                  <option value="debito">Debito</option>
                  <option value="credito">Credito</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="ted_doc">TED/DOC</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="outro">Outro</option>
                </select>
              )}

              <select
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={String(selectedLancamento.conta_id)}
                name="contaId"
                required
              >
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                  </option>
                ))}
              </select>

              {editTipo === "transferencia" ? (
                <select
                  className="rounded-2xl border border-line bg-background px-4 py-3"
                  defaultValue={
                    selectedLancamento.conta_destino_id
                      ? String(selectedLancamento.conta_destino_id)
                      : ""
                  }
                  name="contaDestinoId"
                  required
                >
                  <option value="">Conta destino</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="rounded-2xl border border-line bg-background px-4 py-3"
                  defaultValue={
                    selectedLancamento.categoria_id
                      ? String(selectedLancamento.categoria_id)
                      : String(categorias[0]?.id ?? "")
                  }
                  name="categoriaId"
                  required
                >
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              )}

              <input
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedLancamento.valor_total}
                min="0.01"
                name="valorTotal"
                placeholder="Valor"
                step="0.01"
                type="number"
                required
              />

              <DateInput
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedLancamento.competencia_data}
                name="competenciaData"
                required
              />

              <DateInput
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedLancamento.fatura_competencia_data ?? undefined}
                name="faturaCompetenciaData"
                placeholder="Competencia da fatura"
              />

              <input
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedLancamento.competencia_hora ?? ""}
                name="competenciaHora"
                type="time"
              />

              <DateInput
                className="rounded-2xl border border-line bg-background px-4 py-3 lg:col-span-2"
                defaultValue={selectedLancamento.vencimento_data ?? undefined}
                name="vencimentoData"
              />

              <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
                <button
                  className="rounded-full border border-line bg-background px-5 py-3 text-sm font-semibold text-accent-strong"
                  formAction={deleteLancamentoAction}
                  formNoValidate
                  onClick={(event) => {
                    const confirmed = window.confirm(
                      "Tem certeza que deseja excluir este lancamento? Essa acao nao pode ser desfeita.",
                    );
                    if (!confirmed) {
                      event.preventDefault();
                    }
                  }}
                  type="submit"
                >
                  Excluir
                </button>
                <button
                  className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground"
                  onClick={() => setSelectedLancamentoId(null)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
                  type="submit"
                >
                  Salvar alteracoes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
