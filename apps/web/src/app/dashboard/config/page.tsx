import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardAppNav } from "@/components/dashboard/dashboard-app-nav";
import { requireUser } from "@/lib/server/auth";
import type { CashAccountBreakdownRow } from "@/lib/server/repository";
import {
  getUserGestaoRole,
  listCashAccountBreakdown,
  listCategorias,
  listContas,
  listGestaoMembros,
  listUserGestoes,
} from "@/lib/server/repository";
import { updateGestaoPercentualReservaAction } from "@/app/dashboard/actions";

export const metadata: Metadata = {
  title: "Configurações",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ContaLiquidezBucket = "disponivel" | "poupanca" | "investimento";

function bucketParaConta(tipo: string): ContaLiquidezBucket {
  if (tipo === "poupanca") return "poupanca";
  if (tipo === "investimento") return "investimento";
  return "disponivel";
}

function agruparContasPorLiquidez(contas: CashAccountBreakdownRow[]) {
  const grupos: Record<ContaLiquidezBucket, CashAccountBreakdownRow[]> = {
    disponivel: [],
    poupanca: [],
    investimento: [],
  };
  for (const conta of contas) {
    grupos[bucketParaConta(conta.tipo)].push(conta);
  }
  const porSaldo = (a: CashAccountBreakdownRow, b: CashAccountBreakdownRow) =>
    Number(b.saldo_atual ?? 0) - Number(a.saldo_atual ?? 0);
  grupos.disponivel.sort(porSaldo);
  grupos.poupanca.sort(porSaldo);
  grupos.investimento.sort(porSaldo);
  return grupos;
}

export default async function DashboardConfigPage({ searchParams }: PageProps) {
  const user = await requireUser();
  if (!user) redirect("/entrar");

  const params = await searchParams;
  const gestoes = await listUserGestoes(user.id);
  const requestedGestaoId =
    typeof params.gestao === "string" ? Number(params.gestao) : undefined;
  const gestaoAtiva =
    gestoes.find((item) => item.id === requestedGestaoId) ?? gestoes[0] ?? null;

  if (!gestaoAtiva) redirect("/onboarding");

  const [contas, categorias, membros, roleUsuarioAtual, cashAccounts] = await Promise.all([
    listContas(gestaoAtiva.id),
    listCategorias(gestaoAtiva.id),
    listGestaoMembros(gestaoAtiva.id),
    getUserGestaoRole(user.id, gestaoAtiva.id),
    listCashAccountBreakdown(gestaoAtiva.id),
  ]);
  const contasPorLiquidez = agruparContasPorLiquidez(cashAccounts);
  const percentualReserva = Number(gestaoAtiva.percentual_reserva ?? 10);
  const gestaoQuery = `?gestao=${gestaoAtiva.id}`;

  return (
    <main className="report-page">
      <header className="compact-header">
        <div>
          <h1>Configurações</h1>
          <p className="muted">{gestaoAtiva.nome}</p>
        </div>
        <div className="print-actions">
          <DashboardAppNav active={null} gestaoId={gestaoAtiva.id} />
          <SignOutButton />
        </div>
      </header>

      <section className="card full" style={{ marginTop: 12 }}>
        <p className="muted">
          Use o botão <strong>+</strong> no canto inferior direito na tela <Link href={`/dashboard${gestaoQuery}`}>Início</Link>{" "}
          para criar contas, categorias e lançamentos.
        </p>
      </section>

      <section className="card full" style={{ marginTop: 12 }}>
        <h3>Reserva do período</h3>
        <form action={updateGestaoPercentualReservaAction} className="card" style={{ marginTop: 12 }}>
          <input name="gestaoId" type="hidden" value={gestaoAtiva.id} />
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Percentual de reserva</p>
            <h4 className="text-lg font-semibold">Percentual de reserva</h4>
            <p className="muted">
              Esse valor define quanto entra na reserva quando você fecha a semana ou analisa o período.
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="block text-xs uppercase tracking-[0.18em] text-muted">Percentual</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                defaultValue={percentualReserva}
                max="100"
                min="0"
                name="percentualReserva"
                step="0.01"
                type="number"
              />
            </label>
            <button className="tab active h-[46px] px-5" type="submit">
              Salvar percentual
            </button>
          </div>
        </form>
        <div className="overview" style={{ marginTop: 16, marginBottom: 0 }}>
          <article>
            <span>Origens</span>
            <strong>{contas.length}</strong>
          </article>
          <article>
            <span>Categorias</span>
            <strong>{categorias.length}</strong>
          </article>
          <article>
            <span>Membros</span>
            <strong>{membros.length}</strong>
          </article>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Liquidez: {contasPorLiquidez.disponivel.length} disponíveis, {contasPorLiquidez.poupanca.length} poupança,{" "}
          {contasPorLiquidez.investimento.length} investimentos.
        </p>
        <p className="muted" style={{ marginTop: 12 }}>
          Papel atual: {roleUsuarioAtual ?? "—"}
        </p>
        {membros.length > 0 ? (
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Papel</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {membros.map((membro) => (
                <tr key={membro.usuario_id}>
                  <td>{membro.nome}</td>
                  <td>{membro.email}</td>
                  <td>{membro.papel}</td>
                  <td>{membro.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ marginTop: 16 }}>
            Nenhum membro encontrado nesta gestão.
          </p>
        )}
      </section>

      <p className="muted" style={{ marginTop: 16 }}>
        <Link href={`/dashboard${gestaoQuery}`}>Voltar ao Início</Link>
      </p>
    </main>
  );
}
