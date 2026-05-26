import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { DashboardStack } from "@/components/dashboard/dashboard-stack";
import { RecentLancamentosTable } from "@/components/dashboard/recent-lancamentos-table";
import { formatDateForDisplay } from "@/lib/date";
import { requireUser } from "@/lib/server/auth";
import { timeServerAsync } from "@/lib/server/dashboard-server-timing";
import {
  parseRequestedGestaoId,
  resolveGestaoAtivaForRead,
} from "@/lib/server/gestao-read-page";
import {
  boundsForCalendarMonth,
  getGestaoInsightsParaMes,
  listContas,
  listGestaoFluxoUltimosMeses,
  listLancamentosPorPeriodo,
  listCategorias,
  listRevisarDuplicidadesMes,
  listRevisarMicrovaloresMes,
  listUserGestoes,
} from "@/lib/server/repository";

export const metadata: Metadata = {
  title: "Meses",
  robots: { index: false, follow: false },
};

type MesesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function money(value: string | number | null | undefined) {
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

/** Texto típico de banco/loja: "03/12", "parcela 2" — não substitui categoria, só ajuda a enxergar o mês. */
const INDICIO_PARCELA_NA_DESCRICAO = /\d{1,2}\s*\/\s*\d{1,2}|\bparcela\b/i;

function descricaoIndicaParcela(desc: string | null | undefined) {
  if (!desc) {
    return false;
  }
  return INDICIO_PARCELA_NA_DESCRICAO.test(desc);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function defaultAnoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function parseMesParam(raw: string | string[] | undefined): string | null {
  if (!raw || typeof raw !== "string" || !/^\d{4}-\d{2}$/.test(raw)) {
    return null;
  }
  try {
    boundsForCalendarMonth(raw);
    return raw;
  } catch {
    return null;
  }
}

function shiftAnoMes(anoMes: string, delta: number): string {
  const parts = anoMes.split("-");
  const ys = parts[0] ?? "1970";
  const ms = parts[1] ?? "01";
  const d = new Date(Number(ys), Number(ms) - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthTitle(anoMes: string) {
  const parts = anoMes.split("-");
  const y = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(y, m - 1, 1));
}

const TIPOS_CORRENTE = new Set(["corrente", "carteira", "caixa", "outro"]);

function ehContaCorrente(tipo: string | null | undefined) {
  return !!tipo && TIPOS_CORRENTE.has(tipo);
}

function formatContaResumo(tipo?: string | null) {
  switch (tipo) {
    case "corrente":
      return "Conta corrente";
    case "carteira":
      return "Carteira";
    case "caixa":
      return "Caixa";
    case "outro":
      return "Outro";
    case "cartao_credito":
      return "Cartao de credito";
    case "poupanca":
      return "Poupanca";
    case "investimento":
      return "Investimento";
    default:
      return "Sem conta";
  }
}

function formatMeioResumo(meio?: string | null) {
  switch (meio) {
    case "pix":
      return "Pix";
    case "debito":
      return "Debito";
    case "credito":
      return "Credito";
    case "transferencia":
      return "Transferencia";
    case "dinheiro":
      return "Dinheiro";
    default:
      return "Outro";
  }
}

export default async function MesesPage({ searchParams }: MesesPageProps) {
  const user = await requireUser();
  if (!user) {
    redirect("/entrar");
  }

  const params = await searchParams;
  const gestoes = await listUserGestoes(user.id);
  const requestedGestaoId = parseRequestedGestaoId(params.gestao);
  const gestaoAtiva = await resolveGestaoAtivaForRead(user.id, gestoes, requestedGestaoId);

  if (!gestaoAtiva) {
    redirect("/onboarding");
  }

  const anoMes = parseMesParam(params.mes) ?? defaultAnoMes();
  const { from, to } = boundsForCalendarMonth(anoMes);
  const gestaoQuery = `?gestao=${gestaoAtiva.id}`;

  const [
    insights,
    serie,
    duplicados,
    microvalores,
    lancamentosMes,
    contas,
    categorias,
  ] = await timeServerAsync("dashboard/meses/data", () =>
    Promise.all([
      getGestaoInsightsParaMes(gestaoAtiva.id, anoMes),
      listGestaoFluxoUltimosMeses(gestaoAtiva.id, 6),
      listRevisarDuplicidadesMes(gestaoAtiva.id, anoMes),
      listRevisarMicrovaloresMes(gestaoAtiva.id, anoMes),
      listLancamentosPorPeriodo({
        gestaoId: gestaoAtiva.id,
        dateFrom: from,
        dateTo: to,
      }),
      listContas(gestaoAtiva.id),
      listCategorias(gestaoAtiva.id),
    ]),
  );

  const despesasVisiveis = lancamentosMes.filter(
    (item) =>
      item.status !== "cancelado" && item.tipo === "despesa" && item.categoria_nome !== "Saida da conta",
  );
  const totalGastosVisiveis = despesasVisiveis.reduce((t, item) => t + Number(item.valor_total ?? 0), 0);

  const totaisPorContaResumo = Array.from(
    despesasVisiveis.reduce<Map<string, number>>((acc, item) => {
      const key = formatContaResumo(item.conta_tipo);
      acc.set(key, (acc.get(key) ?? 0) + Number(item.valor_total ?? 0));
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totaisPorMeioResumo = Array.from(
    despesasVisiveis.reduce<Map<string, number>>((acc, item) => {
      const key = formatMeioResumo(item.meio);
      acc.set(key, (acc.get(key) ?? 0) + Number(item.valor_total ?? 0));
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const categoriasRanking = Array.from(
    despesasVisiveis.reduce<Map<string, number>>((acc, item) => {
      const key = item.categoria_nome ?? "Sem categoria";
      acc.set(key, (acc.get(key) ?? 0) + Number(item.valor_total ?? 0));
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const despesasIndicioParcela = despesasVisiveis.filter((item) => descricaoIndicaParcela(item.descricao));
  const totalIndicioParcela = despesasIndicioParcela.reduce((t, item) => t + Number(item.valor_total ?? 0), 0);
  const topIndicioParcela = [...despesasIndicioParcela]
    .sort((a, b) => Number(b.valor_total ?? 0) - Number(a.valor_total ?? 0))
    .slice(0, 5);
  const valorCategoriaParcelamentos =
    categoriasRanking.find((row) => row.name === "Parcelamentos")?.value ?? 0;

  const saldoInicialDisponivel = contas
    .filter((conta) => ehContaCorrente(conta.tipo))
    .reduce((total, conta) => total + Number(conta.saldo_inicial ?? 0), 0);

  const maxBar = Math.max(
    1,
    ...serie.map((row) => Math.max(Number(row.receitas), Number(row.despesas))),
  );

  const hoje = new Date();
  const curYm = `${hoje.getFullYear()}-${pad2(hoje.getMonth() + 1)}`;
  const isMesAtual = anoMes === curYm;

  const receitasN = Number(insights.receitasMesAtual);
  const projDesp = Number(insights.projecaoDespesaFimMes);

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        active="meses"
        gestaoId={gestaoAtiva.id}
        kicker="Visão mensal"
        subtitle={`${gestaoAtiva.nome} · Como foi esse mês e como compara com antes`}
        title="Meses"
      />

      <DashboardStack>
      <section className="card full" style={{ marginTop: 12 }}>
        <div className="period-head summary-head">
          <div>
            <h3>Mês analisado</h3>
            <p className="muted capitalize">{monthTitle(anoMes)}</p>
          </div>
          <div className="period-chips" style={{ flexWrap: "wrap" }}>
            <Link className="period-chip" href={`/dashboard/meses${gestaoQuery}&mes=${shiftAnoMes(anoMes, -1)}`}>
              ← Anterior
            </Link>
            <Link
              className={`period-chip${isMesAtual ? " active" : ""}`}
              href={`/dashboard/meses${gestaoQuery}`}
            >
              Mês atual
            </Link>
            <Link className="period-chip" href={`/dashboard/meses${gestaoQuery}&mes=${shiftAnoMes(anoMes, 1)}`}>
              Próximo →
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={{ marginTop: 12 }}>
        <article className="metric income">
          <span>Receitas (mês)</span>
          <strong>{money(insights.receitasMesAtual)}</strong>
        </article>
        <article className="metric expense">
          <span>Despesas (mês)</span>
          <strong>{money(insights.despesasMesAtual)}</strong>
        </article>
        <article className="metric">
          <span>Quanto sobrou da entrada</span>
          <strong>{insights.margemFluxoPct !== null ? `${insights.margemFluxoPct}%` : "—"}</strong>
        </article>
        <article className="metric">
          <span>Gasto comparado ao mês passado</span>
          <strong>
            {insights.variacaoDespesaVsMesAnteriorPct !== null
              ? `${Number(insights.variacaoDespesaVsMesAnteriorPct) > 0 ? "+" : ""}${insights.variacaoDespesaVsMesAnteriorPct}%`
              : "—"}
          </strong>
        </article>
      </section>

      <section className="card full" style={{ marginTop: 12 }}>
        <h3>Últimos 6 meses em português claro</h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Em cada mês: verde é dinheiro que entrou, vermelho é dinheiro que saiu, e o valor embaixo é o que sobrou ou faltou.
        </p>
        <div
          className="overview"
          style={{
            marginTop: 16,
            alignItems: "flex-end",
            gap: 8,
            minHeight: 180,
          }}
        >
          {serie.map((row) => {
            const r = Number(row.receitas);
            const d = Number(row.despesas);
            const liq = r - d;
            const hIn = Math.round((r / maxBar) * 120);
            const hOut = Math.round((d / maxBar) * 120);
            return (
              <div key={row.mes} style={{ flex: 1, minWidth: 56, textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 4, alignItems: "flex-end", height: 130 }}>
                  <span
                    title={`Receitas ${money(r)}`}
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: Math.max(4, hIn),
                      background: "var(--color-success, #15803d)",
                      borderRadius: 4,
                    }}
                  />
                  <span
                    title={`Despesas ${money(d)}`}
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: Math.max(4, hOut),
                      background: "var(--color-accent-strong, #b42318)",
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: liq >= 0 ? "var(--color-success, #15803d)" : "var(--color-accent-strong, #b42318)",
                    fontWeight: 600,
                  }}
                  title={`Saldo líquido ${money(liq)}`}
                >
                  {money(liq)}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-muted, #64748b)", marginTop: 2 }}>{row.mes}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="columns" style={{ marginTop: 12 }}>
        <section className="card" id="categorias-mes">
          <h3>Gastos por categoria ({anoMes})</h3>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Total</th>
                <th>%</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categoriasRanking.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={4}>
                    Sem dados.
                  </td>
                </tr>
              ) : (
                categoriasRanking.map(({ name, value }) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{money(value)}</td>
                    <td>
                      {value
                        ? `${((value / Number(totalGastosVisiveis || 1)) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                    <td>
                      <div className="bar">
                        <span
                          style={{
                            width: `${Math.min(100, (value / Number(totalGastosVisiveis || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.5 }}>
            Cada valor acima é a soma das <strong>despesas daquela categoria</strong>. Se “Parcelamentos” parece baixo,
            é comum: muitas parcelas ficam em Lazer, Eletrônicos, etc. Para concentrar tudo em Parcelamentos, altere a
            categoria nos lançamentos ou use o filtro de texto no extrato abaixo (por exemplo <code>3/12</code>). No
            cartão, o mês do recorte usa a <strong>data da fatura</strong> quando estiver preenchida — alinhado ao que
            cai na fatura, não só à data da compra no extrato do banco.
          </p>
          {despesasIndicioParcela.length > 0 ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--color-line, #e2e8f0)",
                background: "var(--color-surface, #f8fafc)",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Indício de parcela na descrição (heurística)</p>
              <p className="muted" style={{ marginTop: 6, fontSize: 11, lineHeight: 1.45 }}>
                Soma de despesas cujo texto tem padrão tipo <code>03/12</code> ou a palavra “parcela”. Pode incluir
                falsos positivos e não agrupa o plano completo da compra — só o que aparece neste mês.
              </p>
              <p style={{ marginTop: 10, fontSize: 13 }}>
                <strong>{money(totalIndicioParcela)}</strong>
                <span className="muted" style={{ marginLeft: 8 }}>
                  · {despesasIndicioParcela.length} lançamento(s)
                </span>
                {valorCategoriaParcelamentos > 0 ? (
                  <span className="muted" style={{ marginLeft: 8 }}>
                    · categoria “Parcelamentos”: {money(valorCategoriaParcelamentos)}
                  </span>
                ) : null}
              </p>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.5 }}>
                {topIndicioParcela.map((item) => (
                  <li key={item.id}>
                    {money(item.valor_total)} — {(item.descricao ?? "").slice(0, 72)}
                    {(item.descricao ?? "").length > 72 ? "…" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="card">
          <h3>Conta x Cartão</h3>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Origem</th>
                <th>Total</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {totaisPorContaResumo.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={3}>
                    Sem dados.
                  </td>
                </tr>
              ) : (
                totaisPorContaResumo.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{money(item.value)}</td>
                    <td>
                      {item.value
                        ? `${((item.value / Number(totalGastosVisiveis || 1)) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 style={{ marginTop: 16 }}>Forma de pagamento</h3>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Meio</th>
                <th>Total</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {totaisPorMeioResumo.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={3}>
                    Sem dados.
                  </td>
                </tr>
              ) : (
                totaisPorMeioResumo.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{money(item.value)}</td>
                    <td>
                      {item.value
                        ? `${((item.value / Number(totalGastosVisiveis || 1)) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card full" style={{ marginTop: 12 }}>
        <h3>Movimentações do mês</h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Extrato com filtros e paginação — mesmo comportamento do lançamentos no sistema.
        </p>
        <div style={{ marginTop: 12 }}>
          <RecentLancamentosTable
            categorias={categorias}
            contas={contas}
            gestaoId={gestaoAtiva.id}
            lancamentos={lancamentosMes}
            saldoInicialDisponivel={saldoInicialDisponivel}
            showFiltersSummary={false}
          />
        </div>
      </section>

      {isMesAtual ? (
        <section className="card full" style={{ marginTop: 12 }}>
          <h3>Até o fim do mês</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            Se você continuar gastando no ritmo atual, a saída estimada até o último dia do mês fica perto de{" "}
            <strong>{money(insights.projecaoDespesaFimMes)}</strong>. Comparando com o que entrou até agora, o mês tende a fechar em{" "}
            <strong className={receitasN - projDesp >= 0 ? "text-success" : "text-accent-strong"}>
              {money(receitasN - projDesp)}
            </strong>
            .
          </p>
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Despesas no mês até hoje: {money(insights.despesasAteHojeMesAtual)} · Mês anterior completo:{" "}
            {money(insights.despesasMesAnterior)}
          </p>
        </section>
      ) : null}

      <section className="card full" style={{ marginTop: 12 }}>
        <h3>Revisar este mês — duplicidades</h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Mesma descrição e mesmo valor liquidado mais de uma vez no mês selecionado.
        </p>
        {duplicados.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            Nada detectado com essa regra.
          </p>
        ) : (
          <div className="overflow-x-auto" style={{ marginTop: 12 }}>
            <table className="min-w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2 pr-3">Descrição</th>
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

      <section className="card full" style={{ marginTop: 12 }}>
        <h3>Microvalores (&lt; R$ 5)</h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Podem ser taxas esquecidas ou ruído — vale conferir no extrato.
        </p>
        {microvalores.length === 0 ? (
          <p className="muted" style={{ marginTop: 12 }}>
            Nenhum neste mês.
          </p>
        ) : (
          <ul className="space-y-2" style={{ marginTop: 12 }}>
            {microvalores.map((row) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 rounded-[1rem] border border-line bg-background px-3 py-2 text-sm"
                key={row.id}
              >
                <span>{row.descricao}</span>
                <span className="font-medium text-muted">
                  {moneyFromFormattedDe(row.valor_total)} · {formatDateForDisplay(row.competencia_data)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="muted" style={{ marginTop: 16 }}>
        <Link href={`/dashboard/config${gestaoQuery}`}>Configurações da gestão</Link>
        {" · "}
        <Link href={`/dashboard/cartao${gestaoQuery}`}>Cartão de crédito</Link>
      </p>
      </DashboardStack>
    </DashboardPageShell>
  );
}
