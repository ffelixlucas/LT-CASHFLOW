import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/server/auth";
import {
  getGestaoInsights,
  listRevisarDuplicidadesMes,
  listRevisarMicrovaloresMes,
  listUserGestoes,
} from "@/lib/server/repository";

export const metadata: Metadata = {
  title: "Insights",
  robots: { index: false, follow: false },
};

type InsightsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function money(value: string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

/** FORMAT(..., 'de_DE') do MySQL */
function moneyFromFormattedDe(value: string | null | undefined) {
  if (!value) {
    return money("0");
  }
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export default async function DashboardInsightsPage({ searchParams }: InsightsPageProps) {
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

  const insights = gestaoAtiva ? await getGestaoInsights(gestaoAtiva.id) : null;
  const duplicados = gestaoAtiva ? await listRevisarDuplicidadesMes(gestaoAtiva.id) : [];
  const microvalores = gestaoAtiva ? await listRevisarMicrovaloresMes(gestaoAtiva.id) : [];

  const gestaoQuery = gestaoAtiva ? `?gestao=${gestaoAtiva.id}` : "";

  return (
    <main className="min-h-screen bg-background px-2.5 py-2.5 sm:px-5 sm:py-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-[1.3rem] border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Gestao</p>
              <h1 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">
                Insights e revisao do mes
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Comparativo simples de fluxo, categorias que mais pesam e lista para revisar cargos
                repetidos ou valores miudos — sem inventar dados fora do seu extrato.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex items-center justify-center rounded-full border border-line bg-background px-3.5 py-2 text-sm font-medium text-foreground"
                href={`/dashboard${gestaoQuery}`}
              >
                Dashboard
              </Link>
              {gestaoAtiva ? (
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-line bg-background px-3.5 py-2 text-sm font-medium text-foreground"
                  href={`/dashboard/cartao${gestaoQuery}`}
                >
                  Cartoes
                </Link>
              ) : null}
              <SignOutButton />
            </div>
          </div>
        </header>

        {!gestaoAtiva ? (
          <p className="rounded-[1.15rem] border border-line bg-surface px-4 py-5 text-sm text-muted">
            Crie ou selecione uma gestao no dashboard para ver metricas.
          </p>
        ) : insights ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-[1.15rem] border border-line bg-surface px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Receitas (mes)</p>
                <p className="mt-2 text-xl font-semibold text-success">{money(insights.receitasMesAtual)}</p>
              </article>
              <article className="rounded-[1.15rem] border border-line bg-surface px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Despesas (mes)</p>
                <p className="mt-2 text-xl font-semibold text-accent-strong">
                  {money(insights.despesasMesAtual)}
                </p>
              </article>
              <article className="rounded-[1.15rem] border border-line bg-surface px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Margem sobre receitas</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {insights.margemFluxoPct !== null ? `${insights.margemFluxoPct}%` : "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Quanto sobra do que entrou neste mes (receitas - despesas, sem transferencia).
                </p>
              </article>
              <article className="rounded-[1.15rem] border border-line bg-surface px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Despesa vs mes anterior</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {insights.variacaoDespesaVsMesAnteriorPct !== null
                    ? `${Number(insights.variacaoDespesaVsMesAnteriorPct) > 0 ? "+" : ""}${insights.variacaoDespesaVsMesAnteriorPct}%`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-muted">Mes cheio anterior como referencia.</p>
              </article>
            </section>

            <section className="rounded-[1.15rem] border border-line bg-surface px-4 py-5 sm:px-6">
              <h2 className="font-heading text-lg font-semibold text-foreground">Previsao simples</h2>
              <p className="mt-2 text-sm text-muted">
                Com base na media diaria ate hoje (dia {insights.diaDoMes} de {insights.diasNoMesAtual}), uma
                projecao linear de despesas ate o fim do mes seria cerca de{" "}
                <span className="font-semibold text-foreground">
                  {money(insights.projecaoDespesaFimMes)}
                </span>
                . Use como alerta, nao como promessa — depende dos proximos lancamentos.
              </p>
              <p className="mt-2 text-xs text-muted">
                Despesas no mes ate hoje: {money(insights.despesasAteHojeMesAtual)} · Mes anterior completo:{" "}
                {money(insights.despesasMesAnterior)}
              </p>
            </section>

            <section className="rounded-[1.15rem] border border-line bg-surface px-4 py-5 sm:px-6">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Maiores categorias de despesa (mes atual)
              </h2>
              {insights.topCategorias.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nenhuma despesa categorizada neste mes.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {insights.topCategorias.map((row, index) => (
                    <li
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                      key={`${row.nome}-${index}`}
                    >
                      <span className="text-foreground">{row.nome}</span>
                      <span className="font-semibold text-accent-strong">{money(row.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-muted">
                Toque nos filtros do extrato no dashboard para ver cada categoria em detalhe.
              </p>
            </section>

            <section className="rounded-[1.15rem] border border-line bg-surface px-4 py-5 sm:px-6">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Revisar este mes — duplicidades
              </h2>
              <p className="mt-2 text-sm text-muted">
                Mesma descricao e mesmo valor liquidado mais de uma vez no mes corrente.
              </p>
              {duplicados.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Nada detectado com essa regra.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-muted">
                      <tr>
                        <th className="pb-2 pr-3">Descricao</th>
                        <th className="pb-2 pr-3">Valor</th>
                        <th className="pb-2 pr-3">Vezes</th>
                        <th className="pb-2">Datas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicados.map((row) => (
                        <tr className="border-t border-line" key={row.ids}>
                          <td className="py-2 pr-3">{row.descricao}</td>
                          <td className="py-2 pr-3">{moneyFromFormattedDe(row.valor_total)}</td>
                          <td className="py-2 pr-3">{row.vezes}</td>
                          <td className="py-2 text-muted">
                            {row.primeira} → {row.ultima}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-[1.15rem] border border-line bg-surface px-4 py-5 sm:px-6">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Microvalores (&lt; R$ 5)
              </h2>
              <p className="mt-2 text-sm text-muted">
                Podem ser taxas esquecidas ou ruído — vale conferir no extrato.
              </p>
              {microvalores.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Nenhum neste mes.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {microvalores.map((row) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[1rem] border border-line bg-background px-3 py-2 text-sm"
                      key={row.id}
                    >
                      <span className="text-foreground">{row.descricao}</span>
                      <span className="font-medium text-muted">
                        {moneyFromFormattedDe(row.valor_total)} · {row.competencia_data}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
