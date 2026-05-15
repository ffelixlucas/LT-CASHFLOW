import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { DashboardStack } from "@/components/dashboard/dashboard-stack";
import { requireUser } from "@/lib/server/auth";
import { timeServerAsync } from "@/lib/server/dashboard-server-timing";
import {
  getContaCorrentePeriodoResumo,
  getGestaoSaldosPorBucket,
  getResumoFaturasCartaoGestao,
  listGestaoFluxoMesesPeriodo,
  listLancamentosPorPeriodo,
  listUserGestoes,
} from "@/lib/server/repository";

export const metadata: Metadata = {
  title: "Dashboard executivo",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function signedMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
}

function pct(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isCategoriaEssencial(nome: string) {
  const normalized = normalizeText(nome);
  return [
    "alimentacao",
    "moradia",
    "transporte",
    "impostos",
    "saude",
    "educacao",
    "mercado",
    "supermercado",
  ].some((term) => normalized.includes(term));
}

function periodBounds(scope: "ano" | "mes") {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (scope === "ano") {
    const start = new Date(now.getFullYear(), 0, 1);
    return {
      from: start.toISOString().slice(0, 10),
      to: today,
      label: `${now.getFullYear()} até hoje`,
      labelLong: `01/01/${now.getFullYear()} a ${today.split("-").reverse().join("/")}`,
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${start.toISOString().slice(0, 10)}T12:00:00Z`));

  return {
    from: start.toISOString().slice(0, 10),
    to: today,
    label,
    labelLong: `${start.toISOString().slice(0, 10).split("-").reverse().join("/")} a ${today.split("-").reverse().join("/")}`,
  };
}

function statusExecutivo(input: {
  sobraCaixa: number;
  reservaLiquida: number;
  patrimonioLiquido: number;
  faturaAberta: number;
  reservaPct: number;
}) {
  if (input.reservaLiquida > 0 && input.sobraCaixa + input.reservaLiquida > 0) {
    return {
      label: "Construção de patrimônio",
      tone: "good",
      text: "Parte do dinheiro saiu da corrente porque virou reserva. Isso não é prejuízo: é patrimônio sendo formado.",
    };
  }

  if (input.sobraCaixa < 0) {
    return {
      label: "Atenção no caixa",
      tone: "bad",
      text: "O caixa ficou pressionado sem formação de reserva suficiente para explicar a queda.",
    };
  }

  if (input.faturaAberta > input.patrimonioLiquido * 0.2) {
    return {
      label: "Cartão alto",
      tone: "warn",
      text: "A fatura aberta pesa no patrimônio líquido. Bom acompanhar antes do fechamento.",
    };
  }

  if (input.reservaPct >= 60) {
    return {
      label: "Operação blindada",
      tone: "good",
      text: "A reserva cobre a maior parte do dinheiro mapeado e o fluxo do recorte está positivo.",
    };
  }

  return {
    label: "Operação controlada",
    tone: "good",
    text: "O recorte está positivo. O próximo ganho vem de transformar sobra em reserva sem perder liquidez.",
  };
}

export default async function DashboardExecutivoPage({ searchParams }: PageProps) {
  const user = await requireUser();

  if (!user) {
    redirect("/entrar");
  }

  const params = await searchParams;
  const gestoes = await listUserGestoes(user.id);
  const requestedGestaoId = typeof params.gestao === "string" ? Number(params.gestao) : undefined;
  const escopo = params.escopo === "mes" ? "mes" : "ano";
  const gestaoAtiva = gestoes.find((item) => item.id === requestedGestaoId) ?? gestoes[0] ?? null;

  if (!gestaoAtiva) {
    redirect("/onboarding");
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const periodo = periodBounds(escopo);

  const [saldos, resumoPeriodo, resumoCartao, serie, lancamentosPeriodo] = await timeServerAsync(
    "dashboard/executivo/data",
    () =>
      Promise.all([
        getGestaoSaldosPorBucket(gestaoAtiva.id),
        getContaCorrentePeriodoResumo({
          gestaoId: gestaoAtiva.id,
          dateFrom: periodo.from,
          dateTo: periodo.to,
        }),
        getResumoFaturasCartaoGestao(gestaoAtiva.id, hoje),
        listGestaoFluxoMesesPeriodo({
          gestaoId: gestaoAtiva.id,
          dateFrom: periodo.from,
          dateTo: periodo.to,
        }),
        listLancamentosPorPeriodo({
          gestaoId: gestaoAtiva.id,
          dateFrom: periodo.from,
          dateTo: periodo.to,
        }),
      ]),
  );

  const liquidez = Number(saldos.disponivel ?? 0);
  const reserva = Number(saldos.poupanca ?? 0) + Number(saldos.investimento ?? 0);
  const faturaAberta = Number(resumoCartao.totalSaldoFatura ?? 0);
  const patrimonioBruto = liquidez + reserva;
  const patrimonioLiquido = patrimonioBruto - Math.max(0, faturaAberta);
  const entradas = Number(resumoPeriodo.entradas ?? 0);
  const saidas = Number(resumoPeriodo.saidas_total ?? 0);
  const guardadoMes = Number(resumoPeriodo.guardado ?? 0);
  const resgatadoMes = Number(resumoPeriodo.resgatado ?? 0);
  const reservaLiquidaMes = guardadoMes - resgatadoMes;
  const sobraCaixa = Number(resumoPeriodo.saldo ?? 0);
  const resultadoAntesReserva = sobraCaixa + reservaLiquidaMes;
  const margem = entradas > 0 ? (resultadoAntesReserva / entradas) * 100 : 0;
  const reservaPct = patrimonioBruto > 0 ? (reserva / patrimonioBruto) * 100 : 0;

  const despesas = lancamentosPeriodo.filter(
    (item) => item.status !== "cancelado" && item.tipo === "despesa" && item.categoria_nome !== "Saida da conta",
  );
  const meios = Array.from(
    despesas.reduce<Map<string, number>>((acc, item) => {
      const nome = item.meio === "credito" ? "Crédito" : item.meio === "debito" ? "Débito" : item.meio === "pix" ? "Pix" : "Outros";
      acc.set(nome, (acc.get(nome) ?? 0) + Number(item.valor_total ?? 0));
      return acc;
    }, new Map()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const categorias = Array.from(
    despesas.reduce<Map<string, number>>((acc, item) => {
      const nome = item.categoria_nome ?? "Sem categoria";
      acc.set(nome, (acc.get(nome) ?? 0) + Number(item.valor_total ?? 0));
      return acc;
    }, new Map()),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const totalTopCategorias = categorias.reduce((sum, item) => sum + item.value, 0);
  const maxFluxo = Math.max(
    1,
    entradas,
    saidas,
    guardadoMes,
    ...serie.map((row) => Math.max(Number(row.receitas), Number(row.despesas), Number(row.guardado ?? 0))),
  );
  const totalMeios = meios.reduce((sum, item) => sum + item.value, 0);
  const creditoPct = totalMeios > 0 ? ((meios.find((item) => item.name === "Crédito")?.value ?? 0) / totalMeios) * 100 : 0;
  const faturaPressaoPct = patrimonioBruto > 0 ? Math.min(100, (faturaAberta / patrimonioBruto) * 100) : 0;
  const faturaSobreLiquidezPct = liquidez > 0 ? (faturaAberta / liquidez) * 100 : 0;
  const folgaAposFatura = liquidez - faturaAberta;
  const maiorCategoria = categorias[0] ?? null;
  const categoriaRevisao = categorias.find((item) => !isCategoriaEssencial(item.name)) ?? null;
  const totalReservaSerie = serie.reduce(
    (sum, item) => sum + Math.max(0, Number(item.guardado ?? 0) - Number(item.resgatado ?? 0)),
    0,
  );
  const totalResultadoAntesReservaSerie = serie.reduce(
    (sum, item) => sum + Number(item.receitas) - Number(item.despesas),
    0,
  );
  const status = statusExecutivo({
    sobraCaixa,
    reservaLiquida: reservaLiquidaMes,
    patrimonioLiquido,
    faturaAberta,
    reservaPct,
  });
  const recomendacao =
    reservaLiquidaMes > 0 && resultadoAntesReserva >= 0
      ? "Manter o plano: você está convertendo renda em patrimônio."
      : sobraCaixa < 0
        ? "Separar queda de caixa real de aporte em reserva antes de cortar gastos."
      : faturaAberta > liquidez
        ? "Evitar novas compras no crédito até a fatura ficar abaixo da liquidez."
        : "Manter o ritmo e direcionar a sobra para reserva no fechamento.";
  const caixaStatus =
    folgaAposFatura >= 0
      ? `Depois de pagar a fatura ainda sobram ${money(folgaAposFatura)} no caixa.`
      : `A fatura passa do caixa em ${money(Math.abs(folgaAposFatura))}.`;
  const periodoStatus =
    resultadoAntesReserva >= 0
      ? `Antes da reserva, o recorte gerou ${money(resultadoAntesReserva)}.`
      : `Antes da reserva, faltaram ${money(Math.abs(resultadoAntesReserva))}.`;
  const formacaoStatus =
    reservaLiquidaMes >= 0
      ? `Você formou ${money(reservaLiquidaMes)} de reserva líquida no período.`
      : `Você usou ${money(Math.abs(reservaLiquidaMes))} da reserva no período.`;
  const revisaoStatus = categoriaRevisao
    ? `${categoriaRevisao.name} é a primeira categoria flexível para revisar.`
    : maiorCategoria
      ? `${maiorCategoria.name} é alto, mas parece essencial; acompanhe meta, não corte no escuro.`
      : "Sem categoria flexível relevante para revisar.";
  const leituraSeisMeses =
    totalReservaSerie > 0
      ? `No recorte, ${money(totalReservaSerie)} virou reserva. Isso é construção de patrimônio.`
      : totalResultadoAntesReservaSerie >= 0
        ? `No recorte, o resultado antes da reserva ficou positivo em ${money(totalResultadoAntesReservaSerie)}.`
        : `No recorte, faltaram ${money(Math.abs(totalResultadoAntesReservaSerie))} antes da reserva.`;

  return (
    <DashboardPageShell className="executive-page executive-decision-page">
      <DashboardPageHeader
        active={null}
        gestaoId={gestaoAtiva.id}
        kicker="Central executiva"
        subtitle={`${gestaoAtiva.nome} · ${periodo.label}`}
        title="Painel de decisão"
        below={
          <div className="period-chips">
            <Link
              className={`period-chip ${escopo === "ano" ? "active" : ""}`}
              href={`/dashboard/executivo?gestao=${gestaoAtiva.id}&escopo=ano`}
            >
              Ano
            </Link>
            <Link
              className={`period-chip ${escopo === "mes" ? "active" : ""}`}
              href={`/dashboard/executivo?gestao=${gestaoAtiva.id}&escopo=mes`}
            >
              Mês
            </Link>
            <Link className="period-chip" href={`/dashboard?gestao=${gestaoAtiva.id}`}>
              Voltar ao operacional
            </Link>
          </div>
        }
      />

      <DashboardStack>
        <section className="exec-decision-hero">
          <div>
            <p className="dashboard-kicker">Resposta curta</p>
            <h2>{status.label}</h2>
            <p>{status.text} {leituraSeisMeses}</p>
          </div>
          <div className="exec-next-action">
            <span>Decisão agora</span>
            <strong>{recomendacao}</strong>
          </div>
        </section>

        <section className="exec-question-grid" aria-label="Perguntas principais">
          <article>
            <span>Consigo pagar o cartão?</span>
            <strong className={folgaAposFatura >= 0 ? "good" : "bad"}>{money(folgaAposFatura)}</strong>
            <p>{caixaStatus}</p>
          </article>
          <article>
            <span>Formei patrimônio?</span>
            <strong className={reservaLiquidaMes >= 0 ? "good" : "bad"}>{signedMoney(reservaLiquidaMes)}</strong>
            <p>{formacaoStatus}</p>
          </article>
          <article>
            <span>O recorte se pagou?</span>
            <strong className={resultadoAntesReserva >= 0 ? "good" : "bad"}>{signedMoney(resultadoAntesReserva)}</strong>
            <p>{periodoStatus} Margem de {pct(margem)}%.</p>
          </article>
          <article>
            <span>Onde revisar primeiro?</span>
            <strong>{categoriaRevisao?.name ?? "Sem corte óbvio"}</strong>
            <p>{revisaoStatus}</p>
          </article>
        </section>

        <section className="exec-board-grid">
          <article className="exec-board-panel exec-board-wide">
            <div className="exec-board-head">
              <div>
                <p className="dashboard-kicker">Pergunta</p>
                <h3>Renda virou consumo ou reserva?</h3>
              </div>
              <span>{periodo.labelLong}</span>
            </div>
            <div className="exec-month-bars">
              {serie.map((item) => {
                const receitas = Number(item.receitas);
                const despesasMes = Number(item.despesas);
                const guardado = Number(item.guardado ?? 0);
                const resgatado = Number(item.resgatado ?? 0);
                const reservaLiquida = guardado - resgatado;
                const saldoAntesReserva = receitas - despesasMes;
                const entradaHeight = Math.max(8, (receitas / maxFluxo) * 170);
                const saidaHeight = Math.max(8, (despesasMes / maxFluxo) * 170);
                const reservaHeight = Math.max(8, (guardado / maxFluxo) * 170);

                return (
                  <div className="exec-month-column" key={item.mes}>
                    <div className="exec-month-bars-pair">
                      <i className="entrada" style={{ height: `${entradaHeight}px` }} />
                      <i className="saida" style={{ height: `${saidaHeight}px` }} />
                      <i className="reserva" style={{ height: `${reservaHeight}px` }} />
                    </div>
                    <strong className={reservaLiquida > 0 || saldoAntesReserva >= 0 ? "good" : "bad"}>
                      {reservaLiquida > 0 ? signedMoney(reservaLiquida) : signedMoney(saldoAntesReserva)}
                    </strong>
                    <span>{item.mes.slice(5)}/{item.mes.slice(2, 4)}</span>
                  </div>
                );
              })}
            </div>
            <div className="exec-chart-legend">
              <span><i className="good-bg" /> entrou</span>
              <span><i className="bad-bg" /> saiu</span>
              <span><i className="reserve-bg" /> virou reserva</span>
              <span>número abaixo prioriza reserva formada</span>
            </div>
          </article>

          <article className="exec-board-panel">
            <div className="exec-board-head">
              <div>
                <p className="dashboard-kicker">Cartão</p>
                <h3>Risco para o caixa</h3>
              </div>
            </div>
            <div className="exec-gauge" style={{ "--p": `${Math.min(100, faturaSobreLiquidezPct)}%` } as CSSProperties}>
              <strong>{pct(faturaSobreLiquidezPct)}%</strong>
              <span>da liquidez</span>
            </div>
            <p className="exec-board-note">Fatura {money(faturaAberta)} contra caixa de {money(liquidez)}.</p>
          </article>

          <article className="exec-board-panel">
            <div className="exec-board-head">
              <div>
                <p className="dashboard-kicker">Patrimônio</p>
                <h3>O que é meu de verdade?</h3>
              </div>
            </div>
            <div className="exec-stack-list">
              <div>
                <span>Liquidez</span>
                <b>{money(liquidez)}</b>
                <i style={{ width: `${Math.max(4, (liquidez / Math.max(1, patrimonioBruto)) * 100)}%` }} />
              </div>
              <div>
                <span>Reserva</span>
                <b>{money(reserva)}</b>
                <i style={{ width: `${Math.max(4, (reserva / Math.max(1, patrimonioBruto)) * 100)}%` }} />
              </div>
              <div>
                <span>Menos fatura</span>
                <b>{money(faturaAberta)}</b>
                <i className="danger" style={{ width: `${Math.max(4, faturaPressaoPct)}%` }} />
              </div>
            </div>
            <p className="exec-board-note">Patrimônio líquido: <strong>{money(patrimonioLiquido)}</strong>.</p>
          </article>

          <article className="exec-board-panel exec-board-wide">
            <div className="exec-board-head">
              <div>
                <p className="dashboard-kicker">Leitura de gastos</p>
                <h3>O que é essencial e o que dá para revisar</h3>
              </div>
              <span>{periodo.labelLong}</span>
            </div>
            <div className="exec-impact-list">
              {categorias.map((item, index) => (
                <div className="exec-impact-row" key={item.name}>
                  <span>{index + 1}</span>
                  <strong>
                    {item.name}
                    <small>{isCategoriaEssencial(item.name) ? "essencial" : "revisar"}</small>
                  </strong>
                  <b>{money(item.value)}</b>
                  <i style={{ width: `${Math.max(4, (item.value / Math.max(1, totalTopCategorias)) * 100)}%` }} />
                </div>
              ))}
            </div>
          </article>

          <article className="exec-board-panel">
            <div className="exec-board-head">
              <div>
                <p className="dashboard-kicker">Comportamento</p>
                <h3>Como o dinheiro saiu?</h3>
              </div>
            </div>
            <div className="exec-stack-list compact">
              {meios.map((item) => (
                <div key={item.name}>
                  <span>{item.name}</span>
                  <b>{money(item.value)}</b>
                  <i style={{ width: `${Math.max(4, (item.value / Math.max(1, totalMeios)) * 100)}%` }} />
                </div>
              ))}
            </div>
            <p className="exec-board-note">Crédito representa {pct(creditoPct)}% das saídas categorizadas.</p>
          </article>
        </section>
      </DashboardStack>
    </DashboardPageShell>
  );
}
