import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { computeCardStatement } from "@ltcashflow/finance-core";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { CategoryDrilldown } from "@/components/dashboard/category-drilldown";
import { DashboardActionCenter } from "@/components/dashboard/dashboard-action-center";
import { DashboardAppNav } from "@/components/dashboard/dashboard-app-nav";
import { PlanoFixosMesModal } from "@/components/dashboard/plano-fixos-mes-modal";
import { requireUser } from "@/lib/server/auth";
import {
  getContaCorrentePeriodoResumo,
  getGestaoInsights,
  getGestaoSaldosPorBucket,
  fetchGastosFixosDashboardSlice,
  getPlanoFixosTemplateItens,
  listCashAccountBreakdown,
  listCreditCardStatementData,
  listCategorias,
  listContas,
  listLancamentosPorPeriodo,
  listUserGestoes,
} from "@/lib/server/repository";

export const metadata: Metadata = {
  title: "Início",
  robots: {
    index: false,
    follow: false,
  },
};

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PeriodKey = "week" | "month" | "year";

const statusMessages: Record<string, string> = {
  "gestao-criada": "Gestao criada com conta inicial.",
  "conta-criada": "Conta criada com sucesso.",
  "saldo-inicial-salvo": "Saldo inicial salvo com sucesso.",
  "saldo-inicial-invalido": "Revise os saldos iniciais informados.",
  "categoria-criada": "Categoria criada com sucesso.",
  "categoria-atualizada": "Categoria atualizada com sucesso.",
  "lancamento-criado": "Lancamento registrado com sucesso.",
  "transferencia-criada": "Transferencia registrada com sucesso.",
  "transferencia-invalida": "Revise os dados da transferencia.",
  "lancamento-atualizado": "Lancamento atualizado com sucesso.",
  "lancamento-excluido": "Lancamento excluido com sucesso.",
  "parcelamento-criado": "Parcelamento no cartao registrado (todas as parcelas).",
  "parcelamento-invalido": "Revise os dados do parcelamento no cartao.",
  "gestao-invalida": "Revise os dados da gestao.",
  "conta-invalida": "Revise os dados da conta.",
  "categoria-invalida": "Revise os dados da categoria.",
  "lancamento-invalido": "Revise os dados do lancamento.",
  "percentual-salvo": "Percentual de reserva salvo com sucesso.",
  "percentual-invalido": "Revise o percentual de reserva informado.",
  "acesso-negado": "Voce nao tem acesso a essa gestao.",
  "membro-atualizado": "Papel do membro atualizado com sucesso.",
  "gasto-fixo-criado": "Gasto fixo cadastrado e previsto para este mês.",
  "gasto-fixo-invalido": "Revise os dados do gasto fixo.",
  "plano-fixos-salvo": "Modelo de gastos fixos salvo (ainda não gera lançamentos).",
  "plano-fixos-gerados": "Gastos fixos lançados como previstos no mês escolhido.",
  "plano-fixos-vazio": "Inclua ao menos uma linha válida no plano manual antes de gerar previstos.",
  "plano-fixos-migration": "Rode a migration do banco (tabela gestao_planos_fixos_template) para salvar o modelo de gastos fixos.",
  "plano-fixos-invalido": "Revise os dados do plano manual.",
};

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function percent(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function signedMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `${amount >= 0 ? "+" : "-"}${money(Math.abs(amount))}`;
}

function formatAccountType(tipo: string) {
  switch (tipo) {
    case "corrente":
      return "Conta corrente";
    case "carteira":
      return "Carteira";
    case "caixa":
      return "Caixa";
    case "poupanca":
      return "Poupança";
    case "investimento":
      return "Investimento";
    case "cartao_credito":
      return "Cartão de crédito";
    default:
      return "Outra origem";
  }
}

function movementSign(tipo: string) {
  if (tipo === "receita") return "+";
  if (tipo === "despesa") return "-";
  return "";
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function formatRange(from: string, to: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  return `${formatter.format(new Date(`${from}T12:00:00`))} a ${formatter.format(
    new Date(`${to}T12:00:00`),
  )}`;
}

function formatWeekDay(dateIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(`${dateIso}T12:00:00`))
    .replace(/\.$/, "");
}

function formatYearDay(dateIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${dateIso}T12:00:00`));
}

function normalizePeriod(value: string | undefined): PeriodKey {
  if (value === "week" || value === "month" || value === "year") {
    return value;
  }

  return "month";
}

function periodBounds(period: PeriodKey) {
  if (period === "month") {
    const base = new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      label: "Mes atual",
      range: `${start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
      mapped: `${formatYearDay(start.toISOString().slice(0, 10))} a ${formatYearDay(end.toISOString().slice(0, 10))}`,
    };
  }

  if (period === "year") {
    const base = new Date();
    const start = new Date(base.getFullYear(), 0, 1);
    const end = new Date(base.getFullYear(), 11, 31);
    return {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      label: "Ano atual",
      range: `${base.getFullYear()}`,
      mapped: `${formatYearDay(start.toISOString().slice(0, 10))} a ${formatYearDay(end.toISOString().slice(0, 10))}`,
    };
  }

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
    label: "Semana atual",
    range: formatRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)),
    mapped: `${formatWeekDay(start.toISOString().slice(0, 10))} a ${formatWeekDay(end.toISOString().slice(0, 10))}`,
  };
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
  const selectedPeriod = normalizePeriod(typeof params.period === "string" ? params.period : undefined);
  const gestaoAtiva =
    gestoes.find((item) => item.id === requestedGestaoId) ?? gestoes[0] ?? null;
  const gestaoEhFamiliar = gestaoAtiva?.tipo === "familiar";
  const status =
    typeof params.status === "string" ? statusMessages[params.status] ?? null : null;
  const percentualReserva = Number(gestaoAtiva?.percentual_reserva ?? 10);

  if (!gestaoAtiva) {
    redirect("/onboarding");
  }

  const contas = await listContas(gestaoAtiva.id);
  const categorias = await listCategorias(gestaoAtiva.id);
  const categoriasDespesa = categorias.filter((categoria) => categoria.natureza !== "receita");
  const cashAccounts = await listCashAccountBreakdown(gestaoAtiva.id);
  const saldosAtuais = await getGestaoSaldosPorBucket(gestaoAtiva.id);
  const hoje = new Date().toISOString().slice(0, 10);
  const periodoAtual = periodBounds(selectedPeriod);
  const periodoAno = periodBounds("year");
  const anoMesAtual = hoje.slice(0, 7);
  const lancamentosPeriodo = await listLancamentosPorPeriodo({
    gestaoId: gestaoAtiva.id,
    dateFrom: periodoAtual.from,
    dateTo: periodoAtual.to,
  });
  const resumoContaCorrentePeriodo = await getContaCorrentePeriodoResumo({
    gestaoId: gestaoAtiva.id,
    dateFrom: periodoAtual.from,
    dateTo: periodoAtual.to,
  });
  const cartoesComCiclo = await listCreditCardStatementData(gestaoAtiva.id);
  const [, planoFixosTemplateItens] = await Promise.all([
    fetchGastosFixosDashboardSlice({
      gestaoId: gestaoAtiva.id,
      userId: user.id,
      anoMes: anoMesAtual,
    }),
    getPlanoFixosTemplateItens(gestaoAtiva.id),
  ]);
  const baseRealFrom = gestaoAtiva.inicio_em
    ? new Date(gestaoAtiva.inicio_em).toISOString().slice(0, 10)
    : periodoAno.from;
  const insightsMes =
    selectedPeriod === "month" ? await getGestaoInsights(gestaoAtiva.id) : null;
  const guardadoAtual = Number(saldosAtuais.poupanca ?? 0) + Number(saldosAtuais.investimento ?? 0);
  const disponivelAtual = Number(saldosAtuais.disponivel ?? 0);
  const tenhoHoje = disponivelAtual + guardadoAtual;
  const resumoCartao = cartoesComCiclo.reduce(
    (acc, card) => {
      const contaCartao = contas.find((conta) => conta.id === card.id);
      const fechamentoDia = card.fechamento_dia ?? 8;
      const vencimentoDia = card.vencimento_dia ?? 15;
      const limiteTotal = Number(card.limite_credito ?? 0);
      const statement = computeCardStatement({
        fechamentoDia,
        vencimentoDia,
        limiteTotal: limiteTotal > 0 ? limiteTotal : undefined,
        saldoInicialAberto: Number(contaCartao?.saldo_inicial ?? 0),
        transacoes: (card.movimentos ?? [])
          .filter((movement) => movement.conta_id === card.id && movement.tipo === "despesa")
          .map((movement) => ({
            valor: Number(movement.valor_total),
            status: movement.status,
            competenciaData: movement.competencia_data,
          })),
        pagamentos: (card.movimentos ?? [])
          .filter(
            (movement) =>
              movement.conta_destino_id === card.id &&
              (movement.tipo === "transferencia" || movement.tipo === "receita"),
          )
          .map((movement) => ({
            valor: Number(movement.valor_total),
            status: movement.status,
            data: movement.competencia_data,
          })),
      });

      acc.compras += statement.totalFaturaAtual;
      acc.pagamentos += statement.totalPagoFaturaAtual;
      acc.saldo += statement.saldoFaturaAtual;
      return acc;
    },
    { compras: 0, pagamentos: 0, saldo: 0 },
  );
  const dataHoje = todayLabel();
  const entradasPeriodo = Number(resumoContaCorrentePeriodo.entradas ?? 0);
  const saidasPeriodo = Number(resumoContaCorrentePeriodo.saidas_total ?? 0);
  const sobraPeriodo = Number(resumoContaCorrentePeriodo.sobra ?? 0);
  const reservaLiquida =
    Number(resumoContaCorrentePeriodo.guardado ?? 0) - Number(resumoContaCorrentePeriodo.resgatado ?? 0);
  const totalPatrimonio = tenhoHoje + Math.max(0, resumoCartao.saldo);
  const reservaPct = tenhoHoje > 0 ? (guardadoAtual / tenhoHoje) * 100 : 0;
  const fluxoLabel =
    sobraPeriodo >= 0
      ? `Sobrando ${money(sobraPeriodo)} no ${periodoAtual.label.toLowerCase()}`
      : `Faltando ${money(Math.abs(sobraPeriodo))} no ${periodoAtual.label.toLowerCase()}`;
  const despesasVisiveisPeriodo = lancamentosPeriodo.filter(
    (item) => item.status !== "cancelado" && item.tipo === "despesa" && item.categoria_nome !== "Saida da conta",
  );
  const totaisPorCategoria = Array.from(
    despesasVisiveisPeriodo.reduce<Map<string, number>>((acc, item) => {
      const key = item.categoria_nome ?? "Sem categoria";
      acc.set(key, (acc.get(key) ?? 0) + Number(item.valor_total ?? 0));
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const totaisPorMeio = Array.from(
    despesasVisiveisPeriodo.reduce<Map<string, number>>((acc, item) => {
      const key = item.meio === "pix" ? "Pix" : item.meio === "debito" ? "Débito" : item.meio === "credito" ? "Crédito" : "Outros";
      acc.set(key, (acc.get(key) ?? 0) + Number(item.valor_total ?? 0));
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const maiorCategoria = totaisPorCategoria[0] ?? null;
  const maioresContas = [...cashAccounts].sort((a, b) => Number(b.saldo_atual ?? 0) - Number(a.saldo_atual ?? 0)).slice(0, 4);
  const ultimosLancamentos = lancamentosPeriodo.slice(0, 6);
  const projectionBalance =
    insightsMes ? Number(insightsMes.receitasMesAtual) - Number(insightsMes.projecaoDespesaFimMes) : null;
  const precisaEstadoInicial = contas.some(
    (c) =>
      (c.tipo === "corrente" ||
        c.tipo === "carteira" ||
        c.tipo === "caixa" ||
        c.tipo === "outro" ||
        c.tipo === "poupanca" ||
        c.tipo === "investimento" ||
        c.tipo === "cartao_credito") &&
      (c.saldo_inicial === null || c.saldo_inicial === undefined),
  );
  const startStep = !contas.length
    ? {
        href: `/dashboard/config?gestao=${gestaoAtiva.id}`,
        title: "Comece criando sua primeira conta",
        description: "Use o botão + no canto inferior direito para cadastrar a conta do dia a dia.",
        action: "Ver dicas de configuração",
      }
    : {
        href: `/dashboard/estado-inicial?gestao=${gestaoAtiva.id}`,
        title: "Agora registre o estado inicial",
        description: "Preencha o saldo inicial de cada conta cadastrada para a base começar certa.",
        action: "Registrar estado inicial",
      };
  const startStepResolved = startStep;
  const showPrimeiroPasso = !contas.length || precisaEstadoInicial;
  return (
    <main className="report-page">
      <header className="compact-header">
        <div className="dashboard-brand-block">
          <BrandLogo priority variant="dashboard" />
          <div>
            <p className="dashboard-kicker">{gestaoEhFamiliar ? "Gestão familiar" : "Gestão pessoal"}</p>
            <h1>{gestaoAtiva.nome}</h1>
            <p className="muted">
              {dataHoje}
              {gestaoAtiva ? ` · ${periodoAtual.range}` : ""}
            </p>
          </div>
        </div>
        <div className="print-actions">
          <DashboardAppNav active="inicio" gestaoId={gestaoAtiva.id} />
          <SignOutButton />
        </div>
      </header>

      {gestaoAtiva ? (
        <>
          <section className="decision-hero" id="resumo">
            <div className="decision-copy">
              <p className="dashboard-kicker">{periodoAtual.label}</p>
              <h2>{fluxoLabel}</h2>
              <p>
                Disponível em conta corrente: <strong>{money(disponivelAtual)}</strong>. Reserva protegida em{" "}
                <strong>{money(guardadoAtual)}</strong>, equivalente a {percent(reservaPct)} do dinheiro mapeado.
              </p>
              <div className="decision-actions">
                <Link className="decision-button primary" href={`/dashboard/movimentacoes?gestao=${gestaoAtiva.id}`}>
                  Ver extrato
                </Link>
                <Link className="decision-button" href={`/dashboard/cartao?gestao=${gestaoAtiva.id}`}>
                  Ver fatura
                </Link>
              </div>
            </div>

            <div className="decision-ledger" aria-label="Resumo financeiro">
              <div>
                <span>Tenho hoje</span>
                <strong>{money(tenhoHoje)}</strong>
              </div>
              <div>
                <span>Entrou</span>
                <strong className="good">{money(entradasPeriodo)}</strong>
              </div>
              <div>
                <span>Saiu</span>
                <strong className="bad">{money(saidasPeriodo)}</strong>
              </div>
              <div>
                <span>Sobra</span>
                <strong className={sobraPeriodo >= 0 ? "good" : "bad"}>{signedMoney(sobraPeriodo)}</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-toolbar">
            <div>
              <p className="dashboard-kicker">Recorte</p>
              <p>{periodoAtual.mapped}</p>
            </div>
            <div className="period-chips">
              {(["week", "month", "year"] as const).map((period) => (
                <Link
                  key={period}
                  className={`period-chip ${selectedPeriod === period ? "active" : ""}`}
                  href={`/dashboard?gestao=${gestaoAtiva.id}&period=${period}`}
                >
                  {period === "week" ? "Semana" : period === "month" ? "Mês" : "Ano"}
                </Link>
              ))}
            </div>
          </section>

          <section className="decision-grid" aria-label="Sinais de decisão">
            <article className="decision-card">
              <span>Liquidez</span>
              <strong>{money(disponivelAtual)}</strong>
              <p>Saldo real da corrente para fechar o dia sem tocar na reserva.</p>
            </article>
            <Link className="decision-card link-card" href={`/dashboard/reservas?gestao=${gestaoAtiva.id}`}>
              <span>Reserva</span>
              <strong>{money(guardadoAtual)}</strong>
              <p>
                Líquido no período: <b>{signedMoney(reservaLiquida)}</b>. Meta configurada em {percent(percentualReserva)}.
              </p>
            </Link>
            <Link className="decision-card link-card" href={`/dashboard/cartao?gestao=${gestaoAtiva.id}`}>
              <span>Cartão</span>
              <strong>{money(resumoCartao.saldo)}</strong>
              <p>{money(resumoCartao.compras)} em compras no ciclo atual.</p>
            </Link>
            <article className="decision-card">
              <span>Patrimônio mapeado</span>
              <strong>{money(totalPatrimonio)}</strong>
              <p>Corrente, reservas e fatura em aberto vistos em conjunto.</p>
            </article>
          </section>

          {status ? <div className="decision-box dashboard-status">{status}</div> : null}

          {showPrimeiroPasso ? (
            <section className="setup-callout">
              <div>
                <p className="dashboard-kicker">Base incompleta</p>
                <h3>{startStepResolved.title}</h3>
                <p>{startStepResolved.description}</p>
              </div>
              <Link
                className="decision-button primary"
                href={startStepResolved.href}
              >
                {startStepResolved.action}
              </Link>
            </section>
          ) : null}

          <section className="gastos-fixos-mes-entry" aria-label="Gastos fixos do mês">
            <PlanoFixosMesModal
              categoriasDespesa={categoriasDespesa.map((c) => ({ id: c.id, nome: c.nome }))}
              contas={contas.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }))}
              defaultMesDestino={anoMesAtual}
              gestaoId={gestaoAtiva.id}
              initialItens={planoFixosTemplateItens}
            />
          </section>

          <section className="dashboard-split">
            <article className="analysis-panel">
              <div className="panel-head">
                <div>
                  <p className="dashboard-kicker">Análise</p>
                  <h3>O que pede atenção</h3>
                </div>
                <Link href={`/dashboard/insights?gestao=${gestaoAtiva.id}`}>Abrir insights</Link>
              </div>
              <div className="signal-list">
                <div className="signal-row">
                  <span>Resultado do recorte</span>
                  <strong className={sobraPeriodo >= 0 ? "good" : "bad"}>{signedMoney(sobraPeriodo)}</strong>
                </div>
                <div className="signal-row">
                  <span>Onde mais saiu dinheiro</span>
                  <strong>{maiorCategoria ? `${maiorCategoria.name} · ${money(maiorCategoria.value)}` : "Sem gastos"}</strong>
                </div>
                <div className="signal-row">
                  <span>Movimento da reserva</span>
                  <strong className={reservaLiquida >= 0 ? "good" : "bad"}>{signedMoney(reservaLiquida)}</strong>
                </div>
              </div>
              {insightsMes && projectionBalance !== null ? (
                <p className="projection-note">
                {Number(insightsMes.receitasMesAtual) - Number(insightsMes.projecaoDespesaFimMes) >= 0 ? (
                  <>
                    Projeção de fechamento: <strong className="good">{money(projectionBalance)}</strong>.
                  </>
                ) : (
                  <>
                    Projeção de falta: <strong className="bad">{money(Math.abs(projectionBalance))}</strong>.
                  </>
                )}
                </p>
              ) : null}
            </article>

            <article className="analysis-panel">
              <div className="panel-head">
                <div>
                  <p className="dashboard-kicker">Origens</p>
                  <h3>Onde está o dinheiro</h3>
                </div>
                <Link href={`/dashboard/config?gestao=${gestaoAtiva.id}`}>Gerenciar</Link>
              </div>
              <div className="account-stack">
                {maioresContas.map((conta) => {
                  const saldo = Number(conta.saldo_atual ?? 0);
                  const width = tenhoHoje > 0 ? Math.min(100, Math.max(4, (Math.max(0, saldo) / tenhoHoje) * 100)) : 4;
                  return (
                    <div className="account-row" key={conta.id}>
                      <div>
                        <strong>{conta.nome}</strong>
                        <span>{formatAccountType(conta.tipo)}</span>
                      </div>
                      <b>{money(saldo)}</b>
                      <i style={{ width: `${width}%` }} />
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="dashboard-split compact">
            <article className="analysis-panel">
              <div className="panel-head">
                <div>
                  <p className="dashboard-kicker">Gastos</p>
                  <h3>Clique para revisar</h3>
                </div>
              </div>
              <CategoryDrilldown
                categorias={categorias}
                gestaoId={gestaoAtiva.id}
                lancamentos={despesasVisiveisPeriodo}
              />
            </article>

            <article className="analysis-panel">
              <div className="panel-head">
                <div>
                  <p className="dashboard-kicker">Gastos</p>
                  <h3>Por meio</h3>
                </div>
              </div>
              <div className="rank-list">
                {totaisPorMeio.map((item) => {
                  const width = saidasPeriodo > 0 ? Math.min(100, (item.value / saidasPeriodo) * 100) : 0;
                  return (
                    <div className="rank-row" key={item.name}>
                      <div>
                        <span>{item.name}</span>
                        <strong>{money(item.value)}</strong>
                      </div>
                      <i style={{ width: `${width}%` }} />
                    </div>
                  );
                })}
                {totaisPorMeio.length === 0 ? <p className="muted">Sem despesas no recorte.</p> : null}
              </div>
            </article>
          </section>

          <section className="activity-panel">
            <div className="panel-head">
              <div>
                <p className="dashboard-kicker">Movimentações</p>
                <h3>Últimos lançamentos do recorte</h3>
              </div>
              <Link href={`/dashboard/movimentacoes?gestao=${gestaoAtiva.id}`}>Ver todos</Link>
            </div>
            <div className="activity-list">
              {ultimosLancamentos.map((item) => (
                <div className="activity-row" key={item.id}>
                  <div>
                    <strong>{item.descricao}</strong>
                    <span>
                      {formatYearDay(item.competencia_data)} · {item.conta_nome} · {item.categoria_nome ?? "Sem categoria"}
                    </span>
                  </div>
                  <b className={item.tipo === "receita" ? "good" : item.tipo === "despesa" ? "bad" : ""}>
                    {movementSign(item.tipo)}
                    {money(item.valor_total)}
                  </b>
                </div>
              ))}
              {ultimosLancamentos.length === 0 ? <p className="muted">Sem lançamentos nesse recorte.</p> : null}
            </div>
          </section>

          <section className="quick-action-panel">
            <div>
              <p className="dashboard-kicker">Operação</p>
              <h3>Lançar ou corrigir agora</h3>
            </div>
            <DashboardActionCenter categorias={categorias} contas={contas} gestaoId={gestaoAtiva.id} hoje={hoje} />
          </section>

          <p className="dashboard-footnote">
            Base real desde {formatYearDay(baseRealFrom)}. Dados financeiros refletem lançamentos liquidados e não cancelados.
          </p>
        </>
      ) : (
        <section className="card">
          <p className="muted">
            Voce ainda nao tem gestoes. Use o botao <strong>Nova gestao</strong> para criar a primeira e liberar
            extrato, origens, categorias e lancamentos.
          </p>
        </section>
      )}
    </main>
  );
}
