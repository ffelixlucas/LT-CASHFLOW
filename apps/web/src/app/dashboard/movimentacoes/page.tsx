import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecentLancamentosTable } from "@/components/dashboard/recent-lancamentos-table";
import { requireUser } from "@/lib/server/auth";
import {
  listCategorias,
  listContas,
  listLancamentosPorPeriodo,
  listUserGestoes,
} from "@/lib/server/repository";

export const metadata: Metadata = {
  title: "Movimentacoes",
  robots: {
    index: false,
    follow: false,
  },
};

type MovimentacoesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatRange(from: string, to: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  return `${formatter.format(new Date(`${from}T12:00:00`))} a ${formatter.format(
    new Date(`${to}T12:00:00`),
  )}`;
}

function currentWeekRange() {
  const base = new Date();
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
  };
}

function currentMonthRange() {
  const base = new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function realBaseRange() {
  const base = new Date();
  return {
    from: `${base.getFullYear()}-01-01`,
    to: todayIso(),
  };
}

function buildUrl(gestaoId: number, from: string, to: string, label?: string) {
  const params = new URLSearchParams({
    gestao: String(gestaoId),
    from,
    to,
  });

  if (label) {
    params.set("label", label);
  }

  return `/dashboard/movimentacoes?${params.toString()}`;
}

export default async function MovimentacoesPage({ searchParams }: MovimentacoesPageProps) {
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

  if (!gestaoAtiva) {
    redirect("/dashboard");
  }

  const weekRange = currentWeekRange();
  const monthRange = currentMonthRange();
  const baseRange = realBaseRange();

  const from = typeof params.from === "string" ? params.from : baseRange.from;
  const to = typeof params.to === "string" ? params.to : baseRange.to;
  const label =
    typeof params.label === "string"
      ? params.label
      : from === weekRange.from && to === weekRange.to
        ? "Semana atual"
        : from === monthRange.from && to === monthRange.to
          ? "Mes atual"
          : "Base real";

  const contas = await listContas(gestaoAtiva.id);
  const categorias = await listCategorias(gestaoAtiva.id);
  const lancamentos = await listLancamentosPorPeriodo({
    gestaoId: gestaoAtiva.id,
    dateFrom: from,
    dateTo: to,
  });

  return (
    <main className="report-page">
      <header className="compact-header">
        <div>
          <h1>Movimentacoes</h1>
          <p className="muted">
            {gestaoAtiva.nome} · {label} · {formatRange(from, to)}
          </p>
        </div>
        <div className="print-actions">
          <Link className="tab" href={`/dashboard?gestao=${gestaoAtiva.id}`}>
            Dashboard
          </Link>
          <Link className="tab" href={`/dashboard/cartao?gestao=${gestaoAtiva.id}`}>
            Cartao
          </Link>
          <Link className="tab" href={`/dashboard/insights?gestao=${gestaoAtiva.id}`}>
            Insights
          </Link>
        </div>
      </header>

      <section className="card full">
        <div className="period-head">
          <div>
            <h3>Recortes rapidos</h3>
            <p className="muted">
              Use este painel para conferir e editar as movimentacoes por semana. O ano fecha em 01/01.
            </p>
          </div>
          <div className="period-chips">
            <Link className="period-chip active" href={buildUrl(gestaoAtiva.id, from, to, label)}>
              Atual
            </Link>
            <Link className="period-chip" href={buildUrl(gestaoAtiva.id, weekRange.from, weekRange.to, "Semana atual")}>
              Semana
            </Link>
            <Link className="period-chip" href={buildUrl(gestaoAtiva.id, monthRange.from, monthRange.to, "Mes atual")}>
              Mes
            </Link>
            <Link className="period-chip" href={buildUrl(gestaoAtiva.id, baseRange.from, baseRange.to, "Base real")}>
              Desde janeiro
            </Link>
          </div>
        </div>
      </section>

      <RecentLancamentosTable
        categorias={categorias}
        contas={contas}
        gestaoId={gestaoAtiva.id}
        lancamentos={lancamentos}
      />
    </main>
  );
}
