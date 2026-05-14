import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardAppNav } from "@/components/dashboard/dashboard-app-nav";
import { requireUser } from "@/lib/server/auth";
import { formatDateForDisplay } from "@/lib/date";
import { listContas, listUserGestoes } from "@/lib/server/repository";
import { MoneyInput } from "@/components/ui/money-input";
import { DateInput } from "@/components/ui/date-input";

import { updateContaSaldoInicialAction } from "../actions";

export const metadata: Metadata = {
  title: "Estado inicial",
  robots: {
    index: false,
    follow: false,
  },
};

type StatePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export default async function EstadoInicialPage({ searchParams }: StatePageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/entrar");
  }

  const params = await searchParams;
  const gestoes = await listUserGestoes(user.id);
  const requestedGestaoId = typeof params.gestao === "string" ? Number(params.gestao) : undefined;
  const gestaoAtiva = gestoes.find((item) => item.id === requestedGestaoId) ?? gestoes[0] ?? null;

  if (!gestaoAtiva) {
    redirect("/onboarding");
  }

  const contas = await listContas(gestaoAtiva.id);
  const status = typeof params.status === "string" ? params.status : null;

  return (
    <main className="report-page">
      <header className="compact-header">
        <div>
          <h1>Registrar estado inicial</h1>
          <p className="muted">
            {gestaoAtiva.nome} · {formatDateForDisplay(new Date().toISOString().slice(0, 10))}
          </p>
        </div>
        <div className="print-actions">
          <DashboardAppNav active={null} gestaoId={gestaoAtiva.id} />
          <SignOutButton />
        </div>
      </header>

      {status === "saldo-inicial-salvo" ? (
        <div className="decision-box">Saldo inicial salvo com sucesso.</div>
      ) : null}

      <section className="card full">
        <h3>Como usar</h3>
        <p className="muted">
          Preencha o saldo inicial de cada conta cadastrada. Se a conta já tiver dívida, informe o valor negativo.
        </p>
      </section>

      {contas.length === 0 ? (
        <section className="card full">
          <h3>Nenhuma conta cadastrada ainda</h3>
          <p className="muted">
            Volte ao dashboard e clique em <strong>Adicionar primeira conta</strong> para criar a base.
          </p>
        </section>
      ) : (
        <section className="card full">
          <div className="space-y-4">
            {contas.map((conta) => {
              const isCard = conta.tipo === "cartao_credito";

              return (
                <form
                  key={conta.id}
                  action={updateContaSaldoInicialAction}
                  className="grid gap-3 rounded-[1.25rem] border border-line bg-surface p-4 sm:grid-cols-[1.2fr_0.8fr_0.8fr_auto] sm:items-end"
                >
                  <input name="gestaoId" type="hidden" value={gestaoAtiva.id} />
                  <input name="contaId" type="hidden" value={conta.id} />

                  <div>
                    <p className="text-sm font-medium">{conta.nome}</p>
                    <p className="text-sm text-muted">
                      {conta.tipo}
                      {conta.instituicao ? ` · ${conta.instituicao}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Abertura: {conta.saldo_inicial_em ? formatDateForDisplay(conta.saldo_inicial_em) : "sem data"}
                    </p>
                  </div>

                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted">Saldo inicial</span>
                    <MoneyInput
                      allowNegative={isCard}
                      className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm outline-none"
                      defaultValue={conta.saldo_inicial ?? "0"}
                      name="saldoInicial"
                      placeholder={isCard ? "-100,00" : "0,00"}
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted">Data de abertura</span>
                    <DateInput
                      className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm outline-none"
                      defaultValue={conta.saldo_inicial_em ?? new Date().toISOString().slice(0, 10)}
                      name="saldoInicialEm"
                      required
                    />
                  </label>

                  <button
                    className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
                    type="submit"
                  >
                    Salvar
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      )}

      <section className="card full">
        <p className="muted">
          Total de contas: <strong>{contas.length}</strong> · Estado atual:
          {" "}
          <strong>{money(contas.reduce((total, conta) => total + Number(conta.saldo_inicial ?? 0), 0))}</strong>
        </p>
      </section>
    </main>
  );
}
