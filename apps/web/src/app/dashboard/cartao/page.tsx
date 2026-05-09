import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { RecentLancamentosTable } from "@/components/dashboard/recent-lancamentos-table";
import { requireUser } from "@/lib/server/auth";
import { formatDateForDisplay } from "@/lib/date";
import {
  listCategorias,
  listContas,
  listCreditCardStatementData,
  listLancamentosForContaRange,
  listUserGestoes,
} from "@/lib/server/repository";

export const metadata: Metadata = {
  title: "Cartoes",
  robots: { index: false, follow: false },
};

type CartaoPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PeriodKey = "week" | "month" | "year";
type CardLancamento = Awaited<ReturnType<typeof listLancamentosForContaRange>>[number];

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function normalizePeriod(value: string | undefined): PeriodKey {
  return "month";
}

function formatYearDay(dateIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${dateIso}T12:00:00`));
}

function formatRange(from: string, to: string) {
  return `${formatYearDay(from)} a ${formatYearDay(to)}`;
}

function periodBounds(period: PeriodKey, base = new Date()) {

  if (period === "month") {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      label: "Ciclo de referência",
      range: `${start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
      mapped: formatRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)),
    };
  }

  if (period === "year") {
    const start = new Date(base.getFullYear(), 0, 1);
    const end = new Date(base.getFullYear(), 11, 31);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      label: "Ciclo de referência",
      range: `${base.getFullYear()}`,
      mapped: formatRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)),
    };
  }

  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(base);
  start.setDate(base.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: "Ciclo de referência",
    range: formatRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)),
    mapped: `${new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Sao_Paulo",
    })
      .format(new Date(`${start.toISOString().slice(0, 10)}T12:00:00`))
      .replace(/\.$/, "")} a ${new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Sao_Paulo",
    })
      .format(new Date(`${end.toISOString().slice(0, 10)}T12:00:00`))
      .replace(/\.$/, "")}`,
  };
}

function sum(values: Array<number | string | null | undefined>) {
  return values.reduce<number>((acc, value) => acc + Number(value ?? 0), 0);
}

function buildCardSummary(
  rows: CardLancamento[],
  cardId: number,
  saldoInicialAberto: number,
  limiteCredito: number | null,
) {
  const compras = sum(
    rows
      .filter((row) => row.conta_id === cardId && row.tipo === "despesa" && row.meio === "credito")
      .map((row) => row.valor_total),
  );

  const pagamentos = sum(
    rows
      .filter(
        (row) =>
          row.conta_destino_id === cardId &&
          (row.tipo === "transferencia" || row.tipo === "receita"),
      )
      .map((row) => row.valor_total),
  );

  const abertura = Number(saldoInicialAberto);
  const utilizadoTotal = abertura + Number(compras);
  const saldoEmAberto = Math.max(0, utilizadoTotal - Number(pagamentos));
  const limiteDisponivel =
    limiteCredito !== null ? Math.max(0, Number(limiteCredito) - utilizadoTotal) : null;

  return {
    compras,
    pagamentos,
    abertura,
    utilizadoTotal,
    saldoEmAberto,
    limiteDisponivel,
  };
}

export default async function DashboardCartaoPage({ searchParams }: CartaoPageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/entrar");
  }

  const params = await searchParams;
  const gestoes = await listUserGestoes(user.id);
  const requestedGestaoId =
    typeof params.gestao === "string" ? Number(params.gestao) : undefined;
  const gestaoAtiva =
    gestoes.find((item) => item.id === requestedGestaoId) ?? gestoes[0] ?? null;

  const selectedPeriod = normalizePeriod(typeof params.period === "string" ? params.period : undefined);

  const contas = gestaoAtiva ? await listContas(gestaoAtiva.id) : [];
  const categorias = gestaoAtiva ? await listCategorias(gestaoAtiva.id) : [];
  const cartoes = contas.filter((conta) => conta.tipo === "cartao_credito");

  const requestedContaId =
    typeof params.conta === "string" ? Number(params.conta) : undefined;
  const contaCartaoAtiva =
    cartoes.find((item) => item.id === requestedContaId) ?? cartoes[0] ?? null;

  const cartoesComMovimentos = gestaoAtiva ? await listCreditCardStatementData(gestaoAtiva.id) : [];
  const movimentosCartaoAtivo =
    contaCartaoAtiva !== null
      ? cartoesComMovimentos.find((item) => item.id === contaCartaoAtiva.id)?.movimentos ?? []
      : [];
  const referenceDate =
    movimentosCartaoAtivo.length > 0
      ? new Date(
          `${[...movimentosCartaoAtivo]
            .map((movement) => movement.competencia_data)
            .sort()
            .at(-1)}T12:00:00`,
        )
      : new Date();

  const periodoAtual = periodBounds(selectedPeriod, referenceDate);

  const lancamentosPeriodo =
    gestaoAtiva && contaCartaoAtiva
      ? await listLancamentosForContaRange({
          gestaoId: gestaoAtiva.id,
          contaId: contaCartaoAtiva.id,
          dateFrom: periodoAtual.from,
          dateTo: periodoAtual.to,
        })
      : [];

  const resumoCartao = contaCartaoAtiva
    ? buildCardSummary(
        lancamentosPeriodo,
        contaCartaoAtiva.id,
        Number(contaCartaoAtiva.saldo_inicial ?? 0),
        contaCartaoAtiva.limite_credito !== null ? Number(contaCartaoAtiva.limite_credito ?? 0) : null,
      )
    : { compras: 0, pagamentos: 0, abertura: 0, utilizadoTotal: 0, saldoEmAberto: 0, limiteDisponivel: null };

  return (
    <main className="min-h-screen bg-background px-3 py-3 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Cartão de crédito</p>
              <h1 className="mt-2 font-heading text-2xl font-semibold leading-tight sm:text-3xl">
                {gestaoAtiva ? gestaoAtiva.nome : "Gestão"}
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                Fatura do cartão em modo de conferência, com filtros iguais aos do dashboard.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {gestaoAtiva ? (
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-line bg-background px-3.5 py-2 text-sm font-medium text-foreground"
                  href={`/dashboard?gestao=${gestaoAtiva.id}`}
                >
                  Voltar ao dashboard
                </Link>
              ) : null}
              <SignOutButton />
            </div>
          </div>

          {gestoes.length > 1 ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {gestoes.map((gestao) => (
                <Link
                  className={`shrink-0 rounded-full px-4 py-2 text-sm ${
                    gestaoAtiva?.id === gestao.id
                      ? "bg-foreground text-white"
                      : "border border-line bg-background text-foreground"
                  }`}
                  href={`/dashboard/cartao?gestao=${gestao.id}&period=${selectedPeriod}`}
                  key={gestao.id}
                >
                  {gestao.nome}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white shadow-sm">
              Ciclo mensal
            </span>
          </div>

          <div className="mt-4">
            <p className="text-sm text-muted">{periodoAtual.label}</p>
            <p className="mt-1 text-base font-medium">
              {periodoAtual.range}
            </p>
            <p className="mt-1 text-xs text-muted">Dias mapeados: {periodoAtual.mapped}</p>
          </div>
        </header>

        {!gestaoAtiva ? (
          <p className="text-sm text-muted">Nenhuma gestão disponível.</p>
        ) : cartoes.length === 0 ? (
          <section className="rounded-[1.2rem] border border-line bg-surface p-5 text-sm text-muted">
            Nenhuma origem do tipo cartão cadastrada. Crie uma conta com tipo cartão de crédito em
            Origens.
          </section>
        ) : contaCartaoAtiva ? (
          <>
          <section className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold">Resumo do ciclo</h2>
                <p className="mt-1 text-sm text-muted">
                  {periodoAtual.range} · {periodoAtual.mapped}
                </p>
              </div>
              <div className="rounded-full border border-line bg-background px-3 py-2 text-sm font-medium text-foreground">
                {contaCartaoAtiva.nome}
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <div className="rounded-[1rem] border border-line bg-background px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Gasto no ciclo</p>
                <p className="mt-2 text-2xl font-semibold text-accent-strong">
                  {money(resumoCartao.compras)}
                </p>
                <p className="mt-2 text-sm text-muted">Compras lançadas na fatura deste ciclo.</p>
              </div>

              <div className="rounded-[1rem] border border-line bg-background px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Limite total</p>
                <p className="mt-2 text-2xl font-semibold">
                  {contaCartaoAtiva.limite_credito !== null ? money(contaCartaoAtiva.limite_credito) : "Nao informado"}
                </p>
                <p className="mt-2 text-sm text-muted">Limite total do cartão cadastrado.</p>
              </div>

              <div className="rounded-[1rem] border border-line bg-background px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Limite disponível</p>
                <p className="mt-2 text-2xl font-semibold">
                  {resumoCartao.limiteDisponivel !== null
                    ? money(resumoCartao.limiteDisponivel)
                    : "Nao informado"}
                </p>
                <p className="mt-2 text-sm text-muted">Saldo livre para novas compras.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1rem] border border-line bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Fechamento</p>
                <p className="mt-2 text-lg font-semibold">
                  {contaCartaoAtiva.fechamento_dia !== null ? `Dia ${contaCartaoAtiva.fechamento_dia}` : "Nao informado"}
                </p>
              </div>
              <div className="rounded-[1rem] border border-line bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Vencimento</p>
                <p className="mt-2 text-lg font-semibold">
                  {contaCartaoAtiva.vencimento_dia !== null ? `Dia ${contaCartaoAtiva.vencimento_dia}` : "Nao informado"}
                </p>
              </div>
              <div className="rounded-[1rem] border border-line bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Lançamentos</p>
                <p className="mt-2 text-lg font-semibold">{lancamentosPeriodo.length}</p>
              </div>
              <div className="rounded-[1rem] border border-line bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Status do ciclo</p>
                <p className="mt-2 text-lg font-semibold">
                  {resumoCartao.saldoEmAberto > 0 ? money(resumoCartao.saldoEmAberto) : "Fechado"}
                </p>
              </div>
            </div>

            {contaCartaoAtiva.limite_credito && Number(contaCartaoAtiva.limite_credito) > 0 ? (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-muted/20">
                  <div
                    className="h-full rounded-full bg-accent-strong"
                    style={{
                      width: `${Math.min(
                        100,
                        (resumoCartao.compras / Number(contaCartaoAtiva.limite_credito)) * 100,
                      ).toFixed(0)}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Movimentações do cartão</h2>
            <RecentLancamentosTable
              categorias={categorias}
              contas={contas}
              gestaoId={gestaoAtiva.id}
              lancamentos={lancamentosPeriodo}
              compact
              showSummaryCards={false}
              showFiltersSummary={false}
            />
            </section>
          </>
        ) : (
          <p className="text-sm text-muted">Nenhum cartão de crédito cadastrado nesta gestão.</p>
        )}
      </div>
    </main>
  );
}
