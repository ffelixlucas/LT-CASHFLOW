import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { CategoryDrilldown } from "@/components/dashboard/category-drilldown";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { DashboardStack } from "@/components/dashboard/dashboard-stack";
import { PlanoFixosMesModal } from "@/components/dashboard/plano-fixos-mes-modal";
import { requireUser } from "@/lib/server/auth";
import { timeServerAsync } from "@/lib/server/dashboard-server-timing";
import {
  parseRequestedGestaoId,
  resolveGestaoAtivaForRead,
} from "@/lib/server/gestao-read-page";
import {
  getContaCorrentePeriodoResumo,
  getGestaoSaldosPorBucket,
  getPlanoFixosTemplateItens,
  getResumoFaturasCartaoGestao,
  listCashAccountBreakdown,
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
  const requestedGestaoId = parseRequestedGestaoId(params.gestao);
  const selectedPeriod = normalizePeriod(typeof params.period === "string" ? params.period : undefined);
  const gestaoAtiva = await resolveGestaoAtivaForRead(user.id, gestoes, requestedGestaoId);
  const gestaoEhFamiliar = gestaoAtiva?.tipo === "familiar";
  const status =
    typeof params.status === "string" ? statusMessages[params.status] ?? null : null;
  const percentualReserva = Number(gestaoAtiva?.percentual_reserva ?? 10);

  if (!gestaoAtiva) {
    redirect("/onboarding");
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const periodoAtual = periodBounds(selectedPeriod);
  const periodoAno = periodBounds("year");
  const [
    contas,
    categorias,
    cashAccounts,
    saldosAtuais,
    lancamentosPeriodo,
    resumoContaCorrentePeriodo,
    planoFixosTemplateItens,
    resumoFaturasCartao,
  ] = await timeServerAsync("dashboard/home/data", async () =>
    Promise.all([
      listContas(gestaoAtiva.id),
      listCategorias(gestaoAtiva.id),
      listCashAccountBreakdown(gestaoAtiva.id),
      getGestaoSaldosPorBucket(gestaoAtiva.id),
      listLancamentosPorPeriodo({
        gestaoId: gestaoAtiva.id,
        dateFrom: periodoAtual.from,
        dateTo: periodoAtual.to,
      }),
      getContaCorrentePeriodoResumo({
        gestaoId: gestaoAtiva.id,
        dateFrom: periodoAtual.from,
        dateTo: periodoAtual.to,
      }),
      getPlanoFixosTemplateItens(gestaoAtiva.id),
      getResumoFaturasCartaoGestao(gestaoAtiva.id, hoje),
    ]),
  );
  const categoriasDespesa = categorias.filter((categoria) => categoria.natureza !== "receita");
  const baseRealFrom = gestaoAtiva.inicio_em
    ? new Date(gestaoAtiva.inicio_em).toISOString().slice(0, 10)
    : periodoAno.from;
  const guardadoAtual = Number(saldosAtuais.poupanca ?? 0) + Number(saldosAtuais.investimento ?? 0);
  const disponivelAtual = Number(saldosAtuais.disponivel ?? 0);
  const tenhoHoje = disponivelAtual + guardadoAtual;
  const resumoCartao = {
    compras: resumoFaturasCartao.totalComprasFatura,
    pagamentos: resumoFaturasCartao.totalPagamentosCorrente,
    saldo: resumoFaturasCartao.totalSaldoFatura,
    faturaCompetenciaData: resumoFaturasCartao.cartoes[0]?.faturaCompetenciaData ?? null,
    pagamentosConfiaveis:
      resumoFaturasCartao.cartoes.length === 0 ||
      resumoFaturasCartao.cartoes.every((c) => c.pagamentosConfiaveis),
  };
  const faturaCartaoLabel = resumoCartao.faturaCompetenciaData
    ? new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${resumoCartao.faturaCompetenciaData}T12:00:00Z`),
      )
    : null;
  const dataHoje = todayLabel();
  const gastosPeriodo = Number(resumoContaCorrentePeriodo.saidas ?? 0);
  const pagamentosFaturaPeriodo = Number(resumoContaCorrentePeriodo.pagamentos_fatura ?? 0);
  const saidasPeriodo = Number(resumoContaCorrentePeriodo.saidas_total ?? 0);
  const reservaLiquida =
    Number(resumoContaCorrentePeriodo.guardado ?? 0) - Number(resumoContaCorrentePeriodo.resgatado ?? 0);
  const movimentoContaPeriodo = Number(resumoContaCorrentePeriodo.saldo ?? 0);
  const patrimonioLiquido = tenhoHoje - Math.max(0, resumoCartao.saldo);
  const fluxoLabel =
    disponivelAtual >= 0
      ? `${money(disponivelAtual)} livres na corrente`
      : `${money(Math.abs(disponivelAtual))} negativos na corrente`;
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
    <DashboardPageShell>
      <DashboardPageHeader
        active="inicio"
        brand={<BrandLogo priority variant="dashboard" />}
        gestaoId={gestaoAtiva.id}
        kicker={gestaoEhFamiliar ? "Gestão familiar" : "Gestão pessoal"}
        subtitle={
          <>
            {dataHoje}
            {gestaoAtiva ? ` · ${periodoAtual.range}` : ""}
          </>
        }
        title={gestaoAtiva.nome}
      />

      <DashboardStack>
      {gestaoAtiva ? (
        <>
          <section className="decision-hero" id="resumo">
            <div className="decision-copy">
              <p className="dashboard-kicker">{periodoAtual.label}</p>
              <h2>{fluxoLabel}</h2>
              <p>
                Reservas em <strong>{money(guardadoAtual)}</strong>. Cartão em aberto no LT:{" "}
                <strong>{money(Math.max(0, resumoCartao.saldo))}</strong>. O resultado do mês fica separado
                abaixo para não misturar saldo com movimentação.
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
                <span>Corrente</span>
                <strong>{money(disponivelAtual)}</strong>
              </div>
              <div>
                <span>Reservas</span>
                <strong>{money(guardadoAtual)}</strong>
              </div>
              <div>
                <span>Cartão aberto</span>
                <strong className={resumoCartao.saldo > 0 ? "bad" : "good"}>
                  {money(Math.max(0, resumoCartao.saldo))}
                </strong>
              </div>
              <div>
                <span>Patrimônio líquido</span>
                <strong>{money(patrimonioLiquido)}</strong>
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
              <span>{resumoCartao.saldo > 0 ? "Cartão a fechar" : "Saldo do cartão"}</span>
              <strong>{money(resumoCartao.saldo)}</strong>
              <p className="card-inline-metrics">
                {faturaCartaoLabel ? `Fatura ${faturaCartaoLabel}` : "Fatura atual"} · compras{" "}
                <b>{money(resumoCartao.compras)}</b>
                {resumoCartao.pagamentos > 0 && resumoCartao.pagamentosConfiaveis ? (
                  <>
                    {" "}· pago <b>{money(resumoCartao.pagamentos)}</b>
                  </>
                ) : resumoCartao.pagamentos === 0 ? (
                  " · sem pagamento"
                ) : null}
                .
              </p>
            </Link>
            <article className="decision-card">
              <span>Patrimônio líquido</span>
              <strong>{money(patrimonioLiquido)}</strong>
              <p>Corrente e reservas descontando a fatura em aberto.</p>
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
                  <span>Corrente agora</span>
                  <strong className={disponivelAtual >= 0 ? "good" : "bad"}>{money(disponivelAtual)}</strong>
                </div>
                <div className="signal-row">
                  <span>Gastos do mês sem fatura</span>
                  <strong className="bad">{money(gastosPeriodo)}</strong>
                </div>
                <div className="signal-row">
                  <span>Fatura paga no período</span>
                  <strong className="bad">{money(pagamentosFaturaPeriodo)}</strong>
                </div>
                <div className="signal-row">
                  <span>Onde mais saiu dinheiro</span>
                  <strong>{maiorCategoria ? `${maiorCategoria.name} · ${money(maiorCategoria.value)}` : "Sem gastos"}</strong>
                </div>
                <div className="signal-row">
                  <span>
                    Reservas no período
                    <small>{periodoAtual.mapped}</small>
                  </span>
                  <strong className={reservaLiquida >= 0 ? "good" : "bad"}>{signedMoney(reservaLiquida)}</strong>
                </div>
              </div>
              <p className="projection-note">
                O recorte do mês movimentou <strong>{signedMoney(movimentoContaPeriodo)}</strong> na corrente porque
                inclui fatura, aplicações e resgates. Para decisão diária, use a liquidez atual:{" "}
                <strong>{money(disponivelAtual)}</strong>.
              </p>
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
      </DashboardStack>
    </DashboardPageShell>
  );
}
