import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardActionCenter } from "@/components/dashboard/dashboard-action-center";
import { RecentLancamentosTable } from "@/components/dashboard/recent-lancamentos-table";
import { requireUser } from "@/lib/server/auth";
import {
  getAvailableBalance,
  getCashOverview,
  listCashAccountBreakdown,
  listCategorias,
  listContas,
  listRecentLancamentos,
  listUserGestoes,
} from "@/lib/server/repository";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusMessages: Record<string, string> = {
  "gestao-criada": "Gestao criada com categorias e origem inicial.",
  "conta-criada": "Origem criada com sucesso.",
  "categoria-criada": "Categoria criada com sucesso.",
  "lancamento-criado": "Lancamento registrado com sucesso.",
  "lancamento-atualizado": "Lancamento atualizado com sucesso.",
  "gestao-invalida": "Revise os dados da gestao.",
  "conta-invalida": "Revise os dados da origem.",
  "categoria-invalida": "Revise os dados da categoria.",
  "lancamento-invalido": "Revise os dados do lancamento.",
  "acesso-negado": "Voce nao tem acesso a essa gestao.",
};

function money(value: string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
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
  const status =
    typeof params.status === "string" ? statusMessages[params.status] ?? null : null;

  const contas = gestaoAtiva ? await listContas(gestaoAtiva.id) : [];
  const categorias = gestaoAtiva ? await listCategorias(gestaoAtiva.id) : [];
  const cashOverview = gestaoAtiva
    ? await getCashOverview(gestaoAtiva.id)
    : {
        entradas_em_conta: "0",
        despesas: "0",
        saidas_da_conta: "0",
      };
  const availableBalance = gestaoAtiva
    ? await getAvailableBalance(gestaoAtiva.id)
    : "0";
  const cashAccounts = gestaoAtiva ? await listCashAccountBreakdown(gestaoAtiva.id) : [];
  const lancamentos = gestaoAtiva ? await listRecentLancamentos(gestaoAtiva.id) : [];
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <main className="min-h-screen bg-background px-2.5 py-2.5 sm:px-5 sm:py-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-2.5 sm:space-y-3.5">
        <header className="rounded-[1.45rem] border border-line bg-surface p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.18em] text-muted uppercase">Dashboard</p>
              <p className="mt-2 text-sm text-muted">{user.nome}</p>
            </div>

            <div className="flex items-center gap-2">
              <SignOutButton />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
                {gestaoAtiva ? gestaoAtiva.nome : "Crie sua primeira gestao"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                {gestaoAtiva
                  ? `Tipo ${gestaoAtiva.tipo} · ${contas.length} origens · ${categorias.length} categorias`
                  : "Abra uma gestao para começar a conferir e registrar como em um extrato."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                className="inline-flex items-center justify-center rounded-full border border-line bg-background px-4 py-2 text-sm font-medium text-foreground"
                href="/"
              >
                Home
              </Link>

              {gestoes.length > 1 ? (
                <div className="hidden flex-wrap gap-2 lg:flex">
                  {gestoes.map((gestao) => (
                    <Link
                      className={`rounded-full px-4 py-2 text-sm ${
                        gestaoAtiva?.id === gestao.id
                          ? "bg-foreground text-white"
                          : "border border-line bg-background"
                      }`}
                      href={`/dashboard?gestao=${gestao.id}`}
                      key={gestao.id}
                    >
                      {gestao.nome}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {status ? (
          <p className="rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-foreground">
            {status}
          </p>
        ) : null}

        <section className="space-y-3 sm:space-y-4">
          {gestaoAtiva ? (
            <>
              {gestoes.length > 1 ? (
                <section className="rounded-[1.15rem] border border-line bg-surface p-3 lg:hidden">
                  <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Trocar gestao</p>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {gestoes.map((gestao) => (
                      <Link
                        className={`shrink-0 rounded-full px-4 py-2 text-sm ${
                          gestaoAtiva?.id === gestao.id
                            ? "bg-foreground text-white"
                            : "border border-line bg-background"
                        }`}
                        href={`/dashboard?gestao=${gestao.id}`}
                        key={gestao.id}
                      >
                        {gestao.nome}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <article className="col-span-2 rounded-[1.25rem] border border-line bg-surface p-4 sm:p-5">
                  <p className="text-xs tracking-[0.18em] text-muted uppercase">Saldo em conta</p>
                  <p className="mt-3 font-heading text-4xl font-semibold sm:text-5xl">
                    {money(availableBalance)}
                  </p>
                </article>
                <article className="rounded-[1.05rem] border border-line bg-surface p-3 sm:p-4">
                  <p className="text-xs tracking-[0.18em] text-muted uppercase">Entradas em conta</p>
                  <p className="mt-3 font-heading text-2xl font-semibold sm:text-3xl">
                    {money(cashOverview.entradas_em_conta)}
                  </p>
                </article>
                <article className="rounded-[1.05rem] border border-line bg-surface p-3 sm:p-4">
                  <p className="text-xs tracking-[0.18em] text-muted uppercase">Despesas</p>
                  <p className="mt-3 font-heading text-2xl font-semibold sm:text-3xl">
                    {money(cashOverview.despesas)}
                  </p>
                </article>
                <article className="rounded-[1.05rem] border border-line bg-surface p-3 sm:p-4">
                  <p className="text-xs tracking-[0.18em] text-muted uppercase">Saidas da conta</p>
                  <p className="mt-3 font-heading text-2xl font-semibold sm:text-3xl">
                    {money(cashOverview.saidas_da_conta)}
                  </p>
                </article>
              </section>

              {cashAccounts.length > 0 ? (
                <section className="rounded-[1.3rem] border border-line bg-surface p-3 sm:p-5">
                  <div>
                    <p className="text-xs tracking-[0.18em] text-muted uppercase">
                      Resumo de contas
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-semibold sm:text-2xl">
                      Conciliacao por origem
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                      Cada origem mostra a formula real do saldo: saldo inicial + entradas - despesas - saídas da conta.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {cashAccounts.map((account) => (
                      <article
                        className="rounded-[1.15rem] border border-line bg-background p-4"
                        key={account.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] tracking-[0.18em] text-muted uppercase">
                              Origem
                            </p>
                            <h4 className="mt-2 text-lg font-semibold text-foreground">
                              {account.nome}
                            </h4>
                            <p className="mt-1 text-sm text-muted">
                              {account.quantidade_movimentos} movimentacao(oes)
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[11px] tracking-[0.18em] text-muted uppercase">
                              Saldo atual
                            </p>
                            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
                              {money(account.saldo_atual)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-[0.95rem] border border-line bg-surface px-3 py-3">
                            <p className="text-[10px] tracking-[0.16em] text-muted uppercase">
                              Saldo inicial
                            </p>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                              {money(account.saldo_inicial)}
                            </p>
                          </div>
                          <div className="rounded-[0.95rem] border border-line bg-surface px-3 py-3">
                            <p className="text-[10px] tracking-[0.16em] text-muted uppercase">
                              Entradas
                            </p>
                            <p className="mt-2 text-sm font-semibold text-success">
                              + {money(account.entradas_em_conta)}
                            </p>
                          </div>
                          <div className="rounded-[0.95rem] border border-line bg-surface px-3 py-3">
                            <p className="text-[10px] tracking-[0.16em] text-muted uppercase">
                              Despesas
                            </p>
                            <p className="mt-2 text-sm font-semibold text-accent-strong">
                              - {money(account.despesas)}
                            </p>
                          </div>
                          <div className="rounded-[0.95rem] border border-line bg-surface px-3 py-3">
                            <p className="text-[10px] tracking-[0.16em] text-muted uppercase">
                              Saidas da conta
                            </p>
                            <p className="mt-2 text-sm font-semibold text-accent-strong">
                              - {money(account.saidas_da_conta)}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <DashboardActionCenter
                categorias={categorias}
                contas={contas}
                gestaoId={gestaoAtiva?.id ?? null}
                hoje={hoje}
              />

              <section className="rounded-[1.3rem] border border-line bg-surface p-3 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs tracking-[0.18em] text-muted uppercase">
                      Extrato da gestao
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-semibold sm:text-2xl">
                      Movimentacao recente
                    </h3>
                  </div>
                </div>

                <RecentLancamentosTable
                  categorias={categorias}
                  contas={contas}
                  gestaoId={gestaoAtiva.id}
                  lancamentos={lancamentos}
                />
              </section>
            </>
          ) : (
            <section className="rounded-[2rem] border border-line bg-surface p-8">
              <p className="text-sm leading-7 text-muted">
                Voce ainda nao tem gestoes. Use o botao <strong>Nova gestao</strong> para criar
                a primeira e liberar extrato, origens, categorias e lancamentos.
              </p>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
