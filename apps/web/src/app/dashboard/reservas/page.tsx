import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardAppNav } from "@/components/dashboard/dashboard-app-nav";
import { requireUser } from "@/lib/server/auth";
import {
  getReservasResumoPeriodo,
  listCashAccountBreakdown,
  listLancamentosForContaRange,
  listUserGestoes,
} from "@/lib/server/repository";

export const metadata: Metadata = {
  title: "Reservas",
  robots: { index: false, follow: false },
};

type ReservasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function firstOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthLabel(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

export default async function ReservasPage({ searchParams }: ReservasPageProps) {
  const user = await requireUser();
  if (!user) redirect("/entrar");

  const params = await searchParams;
  const gestoes = await listUserGestoes(user.id);
  const requestedGestaoId =
    typeof params.gestao === "string" ? Number(params.gestao) : undefined;
  const gestaoAtiva =
    gestoes.find((g) => g.id === requestedGestaoId) ?? gestoes[0] ?? null;
  if (!gestaoAtiva) redirect("/onboarding");

  const contas = await listCashAccountBreakdown(gestaoAtiva.id);
  const reservas = contas.filter((c) => c.tipo === "poupanca" || c.tipo === "investimento");

  const hoje = new Date();
  const mesAtual = { from: isoDate(firstOfMonth(hoje)), to: isoDate(lastOfMonth(hoje)) };
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesAnt = { from: isoDate(firstOfMonth(mesAnterior)), to: isoDate(lastOfMonth(mesAnterior)) };
  const inicioAno = isoDate(new Date(hoje.getFullYear(), 0, 1));
  const fimAno = isoDate(new Date(hoje.getFullYear(), 11, 31));

  const [resumoMes, resumoMesAnt, resumoAno] = await Promise.all([
    getReservasResumoPeriodo({ gestaoId: gestaoAtiva.id, inicio: mesAtual.from, fim: mesAtual.to }),
    getReservasResumoPeriodo({ gestaoId: gestaoAtiva.id, inicio: mesAnt.from, fim: mesAnt.to }),
    getReservasResumoPeriodo({ gestaoId: gestaoAtiva.id, inicio: inicioAno, fim: fimAno }),
  ]);

  const totalReservado = reservas.reduce((acc, c) => acc + Number(c.saldo_atual ?? 0), 0);

  const movimentosPorConta = await Promise.all(
    reservas.map(async (c) => ({
      conta: c,
      movimentos: await listLancamentosForContaRange({
        gestaoId: gestaoAtiva.id,
        contaId: c.id,
        dateFrom: inicioAno,
        dateTo: fimAno,
      }),
    })),
  );

  return (
    <main className="min-h-screen bg-background px-3 py-3 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Reservas</p>
              <h1 className="mt-2 font-heading text-2xl font-semibold leading-tight sm:text-3xl">
                Suas poupanças
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                Saldo total reservado: <strong>{money(totalReservado)}</strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <DashboardAppNav active="reservas" gestaoId={gestaoAtiva.id} />
              </div>
              <SignOutButton />
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          {reservas.map((c) => (
            <article key={c.id} className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{c.tipo}</p>
              <h2 className="mt-2 font-heading text-xl font-semibold">{c.nome}</h2>
              <p className="mt-3 text-3xl font-semibold">{money(c.saldo_atual)}</p>
              <p className="mt-1 text-sm text-muted">{c.quantidade_movimentos} movimentações</p>
            </article>
          ))}
          {reservas.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma poupança cadastrada.</p>
          ) : null}
        </section>

        <section className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-heading text-lg font-semibold">Fluxo geral</h2>
          <p className="mt-1 text-sm text-muted">Aportes (corrente → reserva), resgates e rendimentos.</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2">Período</th>
                  <th className="py-2 text-right">Aportado</th>
                  <th className="py-2 text-right">Resgatado</th>
                  <th className="py-2 text-right">Rendimentos</th>
                  <th className="py-2 text-right">Saldo líquido</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="py-2 capitalize">{monthLabel(mesAnterior)}</td>
                  <td className="py-2 text-right text-emerald-700">{money(resumoMesAnt.aportado)}</td>
                  <td className="py-2 text-right text-rose-700">{money(resumoMesAnt.resgatado)}</td>
                  <td className="py-2 text-right">{money(resumoMesAnt.rendimentos)}</td>
                  <td className="py-2 text-right font-semibold">
                    {money(resumoMesAnt.aportado - resumoMesAnt.resgatado + resumoMesAnt.rendimentos)}
                  </td>
                </tr>
                <tr className="border-t border-line">
                  <td className="py-2 capitalize">{monthLabel(hoje)} (atual)</td>
                  <td className="py-2 text-right text-emerald-700">{money(resumoMes.aportado)}</td>
                  <td className="py-2 text-right text-rose-700">{money(resumoMes.resgatado)}</td>
                  <td className="py-2 text-right">{money(resumoMes.rendimentos)}</td>
                  <td className="py-2 text-right font-semibold">
                    {money(resumoMes.aportado - resumoMes.resgatado + resumoMes.rendimentos)}
                  </td>
                </tr>
                <tr className="border-t border-line bg-muted/5">
                  <td className="py-2">Ano {hoje.getFullYear()}</td>
                  <td className="py-2 text-right text-emerald-700">{money(resumoAno.aportado)}</td>
                  <td className="py-2 text-right text-rose-700">{money(resumoAno.resgatado)}</td>
                  <td className="py-2 text-right">{money(resumoAno.rendimentos)}</td>
                  <td className="py-2 text-right font-semibold">
                    {money(resumoAno.aportado - resumoAno.resgatado + resumoAno.rendimentos)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {movimentosPorConta.map(({ conta, movimentos }) => (
          <section key={conta.id} className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h2 className="font-heading text-lg font-semibold">Movimentos · {conta.nome}</h2>
              <p className="text-sm text-muted">{movimentos.length} no ano</p>
            </div>

            {movimentos.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Sem movimentos.</p>
            ) : (
              <div className="mt-3 overflow-x-auto max-h-[420px]">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-2">Data</th>
                      <th className="py-2">Tipo</th>
                      <th className="py-2">Descrição</th>
                      <th className="py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentos.slice(0, 50).map((m) => {
                      const eEntrada =
                        (m.tipo === "transferencia" && m.conta_destino_id === conta.id) ||
                        m.tipo === "receita" ||
                        m.tipo === "ajuste";
                      return (
                        <tr key={m.id} className="border-t border-line">
                          <td className="py-2 whitespace-nowrap">
                            {new Date(`${m.competencia_data}T12:00:00`).toLocaleDateString("pt-BR", {
                              timeZone: "America/Sao_Paulo",
                            })}
                          </td>
                          <td className="py-2 capitalize">{m.tipo}</td>
                          <td className="py-2">{m.descricao}</td>
                          <td className={`py-2 text-right ${eEntrada ? "text-emerald-700" : "text-rose-700"}`}>
                            {eEntrada ? "+" : "−"} {money(m.valor_total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
