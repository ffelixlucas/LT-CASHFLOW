import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { computeCardStatement } from "@ltcashflow/finance-core";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardActionCenter } from "@/components/dashboard/dashboard-action-center";
import { FamilyScopeSwitcher } from "@/components/dashboard/family-scope-switcher";
import { RecentLancamentosTable } from "@/components/dashboard/recent-lancamentos-table";
import { requireUser } from "@/lib/server/auth";
import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/date";
import type { CashAccountBreakdownRow } from "@/lib/server/repository";
import {
  getContaCorrentePeriodoResumo,
  getGestaoSaldosPorBucket,
  getUserGestaoRole,
  listGestaoMembros,
  listGestaoMembrosResumo,
  listCashAccountBreakdown,
  listCreditCardStatementData,
  listCategorias,
  listContas,
  listLancamentosPorPeriodo,
  listRecentLancamentos,
  listUserGestoes,
} from "@/lib/server/repository";
import { updateGestaoPercentualReservaAction } from "@/app/dashboard/actions";

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
  "gestao-invalida": "Revise os dados da gestao.",
  "conta-invalida": "Revise os dados da conta.",
  "categoria-invalida": "Revise os dados da categoria.",
  "lancamento-invalido": "Revise os dados do lancamento.",
  "percentual-salvo": "Percentual de reserva salvo com sucesso.",
  "percentual-invalido": "Revise o percentual de reserva informado.",
  "acesso-negado": "Voce nao tem acesso a essa gestao.",
  "membro-atualizado": "Papel do membro atualizado com sucesso.",
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

function dateTimeLabel(item: { competencia_data: string; competencia_hora: string | null }) {
  const date = formatDateForDisplay(item.competencia_data);
  const time = formatTimeForDisplay(item.competencia_hora);

  return time ? `${date} · ${time}` : date;
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

type ContaLiquidezBucket = "disponivel" | "poupanca" | "investimento";

function bucketParaConta(tipo: string): ContaLiquidezBucket {
  if (tipo === "poupanca") {
    return "poupanca";
  }
  if (tipo === "investimento") {
    return "investimento";
  }
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

function compareLancamentosRecent(a: { competencia_data: string; competencia_hora?: string | null; id: number }, b: { competencia_data: string; competencia_hora?: string | null; id: number }) {
  const dateDiff = b.competencia_data.localeCompare(a.competencia_data);

  if (dateDiff !== 0) {
    return dateDiff;
  }

  const timeA = a.competencia_hora ?? "00:00";
  const timeB = b.competencia_hora ?? "00:00";
  const timeDiff = timeB.localeCompare(timeA);

  if (timeDiff !== 0) {
    return timeDiff;
  }

  return b.id - a.id;
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

  const contas = gestaoAtiva ? await listContas(gestaoAtiva.id) : [];
  const categorias = gestaoAtiva ? await listCategorias(gestaoAtiva.id) : [];
  const membros = gestaoAtiva ? await listGestaoMembros(gestaoAtiva.id) : [];
  const roleUsuarioAtual = gestaoAtiva ? await getUserGestaoRole(user.id, gestaoAtiva.id) : null;
  const cashAccounts = gestaoAtiva ? await listCashAccountBreakdown(gestaoAtiva.id) : [];
  const contasPorLiquidez = agruparContasPorLiquidez(cashAccounts);
  const saldosAtuais = gestaoAtiva ? await getGestaoSaldosPorBucket(gestaoAtiva.id) : null;
  const saldoInicialDisponivel = contas
    .filter((conta) =>
      conta.tipo === "corrente" ||
      conta.tipo === "carteira" ||
      conta.tipo === "caixa" ||
      conta.tipo === "outro",
    )
    .reduce((total, conta) => total + Number(conta.saldo_inicial ?? 0), 0);
  const lancamentos = gestaoAtiva ? await listRecentLancamentos(gestaoAtiva.id) : [];
  const periodoAtual = periodBounds(selectedPeriod);
  const periodoSemana = periodBounds("week");
  const periodoMes = periodBounds("month");
  const periodoAno = periodBounds("year");
  const lancamentosPeriodo = gestaoAtiva
    ? await listLancamentosPorPeriodo({
        gestaoId: gestaoAtiva.id,
        dateFrom: periodoAtual.from,
        dateTo: periodoAtual.to,
      })
    : [];
  const resumoContaCorrentePeriodo = gestaoAtiva
    ? await getContaCorrentePeriodoResumo({
        gestaoId: gestaoAtiva.id,
        dateFrom: periodoAtual.from,
        dateTo: periodoAtual.to,
      })
    : {
        entradas: "0",
        saidas: "0",
        pagamentos_fatura: "0",
        saidas_total: "0",
        guardado: "0",
        resgatado: "0",
        debito: "0",
        pix: "0",
        credito: "0",
        saldo: "0",
        sobra: "0",
      };
  const cartoesComCiclo = gestaoAtiva ? await listCreditCardStatementData(gestaoAtiva.id) : [];
  const hoje = new Date().toISOString().slice(0, 10);
  const baseRealFrom = gestaoAtiva?.inicio_em
    ? new Date(gestaoAtiva.inicio_em).toISOString().slice(0, 10)
    : periodoAno.from;
  const lancamentosDashboard = gestaoAtiva
    ? await listLancamentosPorPeriodo({
        gestaoId: gestaoAtiva.id,
        dateFrom: baseRealFrom,
        dateTo: hoje,
      })
    : [];
  const guardadoAtual = Number(saldosAtuais?.poupanca ?? 0) + Number(saldosAtuais?.investimento ?? 0);
  const disponivelAtual = Number(saldosAtuais?.disponivel ?? 0);
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
  const resumoMembrosAtual = gestaoAtiva
    ? await listGestaoMembrosResumo({
        gestaoId: gestaoAtiva.id,
        dateFrom: periodoAtual.from,
        dateTo: periodoAtual.to,
      })
    : [];
  const resumoMembrosSemana = gestaoAtiva
    ? await listGestaoMembrosResumo({
        gestaoId: gestaoAtiva.id,
        dateFrom: periodoSemana.from,
        dateTo: periodoSemana.to,
      })
    : [];
  const resumoMembrosMes = gestaoAtiva
    ? await listGestaoMembrosResumo({
        gestaoId: gestaoAtiva.id,
        dateFrom: periodoMes.from,
        dateTo: periodoMes.to,
      })
    : [];
  const resumoMembrosAno = gestaoAtiva
    ? await listGestaoMembrosResumo({
        gestaoId: gestaoAtiva.id,
        dateFrom: periodoAno.from,
        dateTo: periodoAno.to,
      })
    : [];
  const dataHoje = todayLabel();
  const meuResumoPeriodo = resumoMembrosAtual.find((item) => item.usuario_id === user.id);
  const proprietario = membros.find((item) => item.papel === "proprietario") ?? membros[0] ?? null;
  const membrosOrdenados = [...membros].sort((a, b) => {
    const ordem = (papel: string) => {
      if (papel === "proprietario") return 0;
      if (papel === "administrador") return 1;
      if (papel === "editor") return 2;
      return 3;
    };

    return ordem(a.papel) - ordem(b.papel) || a.nome.localeCompare(b.nome);
  });
  const familyScopeMembers = membrosOrdenados.map((membro, index) => {
    const resumoSemana = resumoMembrosSemana.find((item) => item.usuario_id === membro.usuario_id);
    const resumoMes = resumoMembrosMes.find((item) => item.usuario_id === membro.usuario_id);
    const resumoAno = resumoMembrosAno.find((item) => item.usuario_id === membro.usuario_id);

    return {
      id: membro.usuario_id,
      name: membro.nome,
      role: membro.papel,
      status: membro.status,
      label: gestaoEhFamiliar
        ? membro.papel === "proprietario"
          ? "Pai"
          : index === 1
            ? "Esposa"
            : `Membro ${index + 1}`
        : membro.usuario_id === user.id
          ? "Você"
          : `Membro ${index + 1}`,
      weekExpense: Number(resumoSemana?.despesas ?? 0),
      monthExpense: Number(resumoMes?.despesas ?? 0),
      movements: Number(resumoAno?.movimentos ?? 0),
      me: membro.usuario_id === user.id,
      owner: membro.papel === "proprietario",
    };
  });
  const formatContaResumo = (tipo?: string | null) => {
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
  };
  const formatMeioResumo = (meio?: string | null) => {
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
  };
  const despesasVisiveisPeriodo = lancamentosPeriodo.filter(
    (item) => item.status !== "cancelado" && item.tipo === "despesa" && item.categoria_nome !== "Saida da conta",
  );
  const totaisPorContaResumo = Array.from(
    despesasVisiveisPeriodo.reduce<Map<string, number>>((acc, item) => {
      const key = formatContaResumo(item.conta_tipo);
      acc.set(key, (acc.get(key) ?? 0) + Number(item.valor_total ?? 0));
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const totaisPorMeioResumo = Array.from(
    despesasVisiveisPeriodo.reduce<Map<string, number>>((acc, item) => {
      const key = formatMeioResumo(item.meio);
      acc.set(key, (acc.get(key) ?? 0) + Number(item.valor_total ?? 0));
      return acc;
    }, new Map<string, number>()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const totalGastosVisiveis = despesasVisiveisPeriodo.reduce((total, item) => total + Number(item.valor_total ?? 0), 0);
  const startStep = !contas.length
    ? {
        href: "#config",
        title: "Comece criando sua primeira conta",
        description: "Cadastre a conta que você usa no dia a dia. Depois o estado inicial fica fácil de preencher.",
        action: "Adicionar primeira conta",
      }
    : {
        href: `/dashboard/estado-inicial?gestao=${gestaoAtiva?.id ?? ""}`,
        title: "Agora registre o estado inicial",
        description: "Preencha o saldo inicial de cada conta cadastrada para a base começar certa.",
        action: "Registrar estado inicial",
      };
  const startStepResolved = startStep;
  return (
    <main className="report-page">
      <header className="compact-header">
        <div>
          <h1>
            {gestaoAtiva
              ? `${gestaoEhFamiliar ? "Familia" : "Gestao pessoal"} ${gestaoAtiva.nome}`
              : "Crie sua primeira gestao"}
          </h1>
          <p className="muted">
            {dataHoje}
            {gestaoAtiva ? ` · ${periodoAtual.range}` : ""}
          </p>
        </div>
        <div className="print-actions">
          {gestaoAtiva ? (
            <>
              <Link className="tab" href={`/dashboard/semana?gestao=${gestaoAtiva.id}`}>
                Semana
              </Link>
              <Link className="tab" href={`/dashboard/cartao?gestao=${gestaoAtiva.id}`}>
                Cartão
              </Link>
              <Link className="tab" href={`/dashboard/reservas?gestao=${gestaoAtiva.id}`}>
                Reservas
              </Link>
              <Link className="tab" href={`/dashboard/movimentacoes?gestao=${gestaoAtiva.id}`}>
                Movimentações
              </Link>
              <Link className="tab" href={`/dashboard/insights?gestao=${gestaoAtiva.id}`}>
                Insights
              </Link>
            </>
          ) : null}
          <Link className="tab" href="/">
            Home
          </Link>
          <SignOutButton />
        </div>
      </header>

      {gestaoAtiva ? (
        <>
          <section id="resumo" className="tab-panel" style={{ marginTop: 0 }}>
            <div className="period-head summary-head">
              <div>
                <h3>Periodo</h3>
                <p className="muted">Semana de segunda a domingo. Mes usa calendario fechado. Base real começa na data inicial da gestão.</p>
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
            </div>
            <div className="summary-grid">
              <article className="metric" title="Soma de todas as contas hoje (corrente + reservas)">
                <span>Tenho hoje</span>
                <strong>{money(tenhoHoje)}</strong>
              </article>
              <article className="metric income" title="Saldo real da conta corrente hoje — bate com o extrato do banco">
                <span>Saldo na corrente</span>
                <strong>{money(disponivelAtual)}</strong>
              </article>
              <article className="metric card" title="Total guardado em poupança e investimentos">
                <span>Reservado</span>
                <strong>{money(guardadoAtual)}</strong>
              </article>
            </div>

            <div className="summary-grid">
              <article className="metric income" title="Receitas recebidas no período (sem contar resgates da reserva)">
                <span>Entrou no período</span>
                <strong>{money(resumoContaCorrentePeriodo.entradas ?? 0)}</strong>
              </article>
              <article className="metric expense" title="Despesas reais no período (Pix enviado, débito, fatura paga). Não conta aplicação na reserva.">
                <span>Saiu no período</span>
                <strong>{money(resumoContaCorrentePeriodo.saidas_total ?? 0)}</strong>
              </article>
              <article
                className={`metric ${Number(resumoContaCorrentePeriodo.sobra ?? 0) >= 0 ? "income" : "expense"}`}
                title="Entrou menos Saiu no período. Positivo = sobrou; negativo = faltou."
              >
                <span>Sobra do período</span>
                <strong>{money(Number(resumoContaCorrentePeriodo.sobra ?? 0))}</strong>
              </article>
            </div>

            <div className="rest-strip" title="Movimentos internos entre corrente e reserva (não somem do seu patrimônio)">
              <span>
                Aplicado na reserva: {money(Number(resumoContaCorrentePeriodo.guardado ?? 0))} · Resgatado:{" "}
                {money(Number(resumoContaCorrentePeriodo.resgatado ?? 0))}
              </span>
              <strong>
                Líquido: {money(
                  Number(resumoContaCorrentePeriodo.guardado ?? 0)
                    - Number(resumoContaCorrentePeriodo.resgatado ?? 0),
                )}
              </strong>
            </div>
            <p className="muted compact-hint">
              Base real desde {formatYearDay(baseRealFrom)}. Reserva configurada em {percent(percentualReserva)}%.
            </p>
          </section>

          <section className="card full" id="fatura" style={{ marginTop: 12 }}>
            <h3>Cartao de credito</h3>
            {cartoesComCiclo.length === 0 ? (
              <p className="muted" style={{ marginTop: 8 }}>
                Nenhum cartao cadastrado nesta gestao.
              </p>
            ) : (
              <div className="overview" style={{ marginTop: 12, marginBottom: 0 }}>
                <article>
                  <span>Fatura atual</span>
                  <strong>{money(resumoCartao.saldo)}</strong>
                </article>
                <article>
                  <span>Compras do ciclo</span>
                  <strong>{money(resumoCartao.compras)}</strong>
                </article>
                <article>
                  <span>Pagamentos do ciclo</span>
                  <strong>{money(resumoCartao.pagamentos)}</strong>
                </article>
              </div>
            )}
          </section>

          <section className="card full decision-box" style={{ marginTop: 12 }}>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Primeiro passo</p>
              <h3 className="text-2xl font-semibold">{startStepResolved.title}</h3>
              <p className="muted">{startStepResolved.description}</p>
            </div>
            <div className="mt-3">
              <Link className="tab active inline-flex" href={startStepResolved.href}>
                {startStepResolved.action}
              </Link>
            </div>
          </section>

          <div className="period-strip">
            <div className="period-range">{periodoAtual.range}</div>
            <div className="period-mapped">Dias mapeados: {periodoAtual.mapped}</div>
          </div>

          <nav className="tabs" aria-label="Secoes do dashboard">
            <a className="tab active" href="#familia">
              {gestaoEhFamiliar ? "Familia" : "Individual"}
            </a>
            <a className="tab" href="#resumo">
              Resumo
            </a>
            <a className="tab" href="#extrato">
              Extrato
            </a>
            <a className="tab" href="#lancar">
              Lancar
            </a>
            <a className="tab" href="#fatura">
              Fatura
            </a>
            <a className="tab" href="#config">
              Config
            </a>
          </nav>

          {status ? <div className="decision-box">{status}</div> : null}

          <section className="card full" id="familia">
            <h3>{gestaoEhFamiliar ? "Hierarquia da familia" : "Visao individual"}</h3>
            <FamilyScopeSwitcher
              familyName={gestaoAtiva.nome}
              familyWeekExpense={Number(resumoContaCorrentePeriodo.saidas ?? 0)}
              familyWeekIncome={Number(resumoContaCorrentePeriodo.entradas ?? 0)}
              familyCurrentSaved={guardadoAtual}
              modeLabel={gestaoEhFamiliar ? "Familia" : "Base pessoal"}
              memberCount={membros.length}
              members={familyScopeMembers}
              periodLabel={periodoAtual.label}
              periodRange={periodoAtual.range}
              ownerName={proprietario?.nome ?? gestaoAtiva.nome}
              showFamilyRoot={gestaoEhFamiliar}
            />

            <table>
              <thead>
                <tr>
                  <th>Hierarquia</th>
                  <th>Pessoa</th>
                  <th>Papel</th>
                  <th>Semana</th>
                  <th>Mes</th>
                </tr>
              </thead>
              <tbody>
                {membrosOrdenados.length === 0 ? (
                  <tr>
                    <td className="muted" colSpan={5}>
                      Nenhum membro encontrado nesta gestao.
                    </td>
                  </tr>
                  ) : (
                  membrosOrdenados.map((membro, index) => {
                    const resumoSemana = resumoMembrosSemana.find((item) => item.usuario_id === membro.usuario_id);
                    const resumoMes = resumoMembrosMes.find((item) => item.usuario_id === membro.usuario_id);
                    const destaque = membro.usuario_id === user.id ? "familia-row-me" : "";

                    return (
                      <tr key={membro.usuario_id} className={destaque}>
                        <td>{membro.papel === "proprietario" ? "Pai" : index === 1 ? "Esposa" : `Membro ${index + 1}`}</td>
                        <td>{membro.nome}</td>
                        <td>{membro.papel}</td>
                        <td>{money(Number(resumoSemana?.despesas ?? 0))}</td>
                        <td>{money(Number(resumoMes?.despesas ?? 0))}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>

          <div className="columns">
            <section className="card" id="extrato">
              <h3>Gastos por categoria</h3>
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
                  {despesasVisiveisPeriodo.length === 0 ? (
                    <tr>
                      <td className="muted" colSpan={4}>
                        Sem dados.
                      </td>
                    </tr>
                  ) : (
                    Array.from(
                      new Map(
                        despesasVisiveisPeriodo.reduce<Array<[string, number]>>((acc, item) => {
                            const key = item.categoria_nome ?? "Sem categoria";
                            const prev = acc.find(([name]) => name === key);
                            if (prev) {
                              prev[1] += Number(item.valor_total ?? 0);
                            } else {
                              acc.push([key, Number(item.valor_total ?? 0)]);
                            }
                            return acc;
                          }, []),
                      ).entries(),
                    )
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, value]) => (
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
                                  width: `${Math.min(
                                    100,
                                    (value / Number(totalGastosVisiveis || 1)) * 100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </section>

            <section className="card" id="conta-cartao">
              <h3>Conta x Cartao</h3>
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

          <section id="lancar" className="scroll-mt-4">
            <DashboardActionCenter categorias={categorias} contas={contas} gestaoId={gestaoAtiva.id} hoje={hoje} />
          </section>

          <RecentLancamentosTable
            categorias={categorias}
            contas={contas}
            gestaoId={gestaoAtiva.id}
            lancamentos={lancamentosDashboard}
            saldoInicialDisponivel={saldoInicialDisponivel}
            showFiltersSummary={false}
          />

          <section className="card full" id="config">
            <h3>Configuracoes e acesso</h3>
            <form action={updateGestaoPercentualReservaAction} className="card" style={{ marginTop: 12 }}>
              <input type="hidden" name="gestaoId" value={gestaoAtiva.id} />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Reserva do periodo</p>
                <h4 className="text-lg font-semibold">Percentual de reserva</h4>
                <p className="muted">
                  Esse valor define quanto entra na reserva quando você fecha a semana ou analisa o periodo.
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1">
                  <span className="block text-xs uppercase tracking-[0.18em] text-muted">Percentual</span>
                  <input
                    name="percentualReserva"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue={percentualReserva}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <button className="tab active h-[46px] px-5" type="submit">
                  Salvar percentual
                </button>
              </div>
            </form>
            <div className="overview" style={{ marginBottom: 0 }}>
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
              Liquidez: {contasPorLiquidez.disponivel.length} disponiveis, {contasPorLiquidez.poupanca.length} poupanca,{" "}
              {contasPorLiquidez.investimento.length} investimentos.
            </p>
            <p className="muted" style={{ marginTop: 12 }}>
              Papel atual: {roleUsuarioAtual ?? "-"}
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
                Nenhum membro encontrado nesta gestao.
              </p>
            )}
          </section>
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
