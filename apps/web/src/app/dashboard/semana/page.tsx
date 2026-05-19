import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { DashboardStack } from "@/components/dashboard/dashboard-stack";
import { requireUser } from "@/lib/server/auth";
import { timeServerAsync } from "@/lib/server/dashboard-server-timing";
import {
  parseRequestedGestaoId,
  resolveGestaoAtivaForRead,
} from "@/lib/server/gestao-read-page";
import {
  findFechamentoPeriodo,
  getSemanaMetricas,
  getSemanaPagamentosFatura,
  getSemanaResumoPorDia,
  listSemanaConferenciaLancamentos,
  listContas,
  listFechamentosPeriodo,
  listUserGestoes,
} from "@/lib/server/repository";
import { fecharSemanaAction } from "./actions";
import { FecharSemanaForm } from "./fechar-semana-form";
import { SemanaConferenciaModal } from "./semana-conferencia-modal";

export const metadata: Metadata = {
  title: "Fechamento semanal",
  robots: { index: false, follow: false },
};

type SemanaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

/** Linhas para o snapshot (coluna JSON ou string do MySQL). */
function reservasPorContaParaSnapshot(raw: unknown): { nome: string; valor: number }[] {
  if (raw == null || raw === "") return [];
  try {
    const data: unknown =
      typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : null;
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        const nome = String(o.nome ?? "").trim();
        const valor = Number(o.valor ?? 0);
        if (!nome || valor <= 0.004) return null;
        return { nome, valor };
      })
      .filter((x): x is { nome: string; valor: number } => x !== null);
  } catch {
    return [];
  }
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Calcula segunda-feira da semana de `base`. */
function segundaDaSemana(base: Date) {
  const dow = base.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  start.setDate(start.getDate() + diff);
  return start;
}

function domingoDaSemana(segunda: Date) {
  const end = new Date(segunda);
  end.setDate(segunda.getDate() + 6);
  return end;
}

function parseInicioParam(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return segundaDaSemana(date);
    }
  }
  return segundaDaSemana(new Date());
}

function formatDiaCurto(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(`${iso}T12:00:00`))
    .replace(/\.$/, "");
}

function formatRange(inicio: string, fim: string) {
  const a = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${inicio}T12:00:00`));
  const b = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${fim}T12:00:00`));
  return `${a} → ${b}`;
}

function diasDaSemana(inicio: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    out.push(isoDate(d));
  }
  return out;
}

export default async function FechamentoSemanaPage({ searchParams }: SemanaPageProps) {
  const user = await requireUser();
  if (!user) redirect("/entrar");

  const params = await searchParams;
  const gestoes = await listUserGestoes(user.id);
  const requestedGestaoId = parseRequestedGestaoId(params.gestao);
  const gestaoAtiva = await resolveGestaoAtivaForRead(user.id, gestoes, requestedGestaoId);
  if (!gestaoAtiva) redirect("/onboarding");

  const inicioParam = typeof params.inicio === "string" ? params.inicio : undefined;
  const segunda = parseInicioParam(inicioParam);
  const domingo = domingoDaSemana(segunda);

  const inicioIso = isoDate(segunda);
  const fimIso = isoDate(domingo);

  const [
    contas,
    metricas,
    porDia,
    fechamento,
    historico,
    pagamentosFaturaExtrato,
    conferenciaLancamentos,
  ] = await timeServerAsync("dashboard/semana/data", () =>
    Promise.all([
      listContas(gestaoAtiva.id),
      getSemanaMetricas({ gestaoId: gestaoAtiva.id, inicio: inicioIso, fim: fimIso }),
      getSemanaResumoPorDia({ gestaoId: gestaoAtiva.id, inicio: inicioIso, fim: fimIso }),
      findFechamentoPeriodo({ gestaoId: gestaoAtiva.id, tipo: "semanal", inicio: inicioIso }),
      listFechamentosPeriodo({ gestaoId: gestaoAtiva.id, tipo: "semanal", limit: 26 }),
      getSemanaPagamentosFatura({ gestaoId: gestaoAtiva.id, inicio: inicioIso, fim: fimIso }),
      listSemanaConferenciaLancamentos({ gestaoId: gestaoAtiva.id, inicio: inicioIso, fim: fimIso }),
    ]),
  );

  const contasCorrentes = contas.filter((c) =>
    ["corrente", "carteira", "caixa", "outro"].includes(c.tipo),
  );
  const contasReserva = contas.filter((c) => c.tipo === "poupanca" || c.tipo === "investimento");
  const contaReservaDiaADia =
    contasReserva.find((c) => c.nome.toLowerCase().includes("dia a dia")) ??
    contasReserva.find((c) => c.nome.toLowerCase().includes("dia")) ??
    contasReserva[0] ??
    null;
  const contaOrigemPadrao = contasCorrentes[0] ?? null;
  const nomeReservaDiaADia = contaReservaDiaADia?.nome ?? "reserva do dia a dia";

  const percentualReserva = Number(gestaoAtiva.percentual_reserva ?? 10);

  const semanaAnterior = new Date(segunda);
  semanaAnterior.setDate(segunda.getDate() - 7);
  const semanaProxima = new Date(segunda);
  semanaProxima.setDate(segunda.getDate() + 7);

  const status = typeof params.status === "string" ? params.status : null;
  const fechada = fechamento !== null;
  const metricasBase = fechamento
    ? {
        entradas: Number(fechamento.entradas ?? 0),
        saidasCorrente: Number(fechamento.saidas_corrente ?? 0),
        comprasCartao: Number(fechamento.compras_cartao ?? 0),
        sobra: Number(fechamento.sobra ?? 0),
      }
    : metricas;
  const reservaFechamento = fechamento
    ? Number(fechamento.reservado ?? 0)
    : Math.max(0, Math.round((metricasBase.entradas * percentualReserva) / 100 * 100) / 100);
  const totalGastoSemana = metricasBase.saidasCorrente + metricasBase.comprasCartao;
  /** Resultado da operação da semana (sem descontar a reserva). É o que sobra para distribuir nas reservas. */
  const resultadoOperacional =
    metricasBase.entradas - metricasBase.saidasCorrente - metricasBase.comprasCartao;
  /** Sobra depois das reservas — usada para a zeragem (aporte/resgate na Dia a Dia). */
  const resultadoFimSemana = resultadoOperacional - reservaFechamento;
  const ajusteDiaADiaTipo = fechamento
    ? fechamento.ajuste_dia_a_dia_tipo
    : Math.abs(resultadoFimSemana) < 0.005
      ? "nenhum"
      : resultadoFimSemana > 0
        ? "aporte"
        : "resgate";
  const ajusteDiaADiaValor = fechamento
    ? Number(fechamento.ajuste_dia_a_dia_valor ?? 0)
    : Math.round(Math.abs(resultadoFimSemana) * 100) / 100;

  const diasIso = diasDaSemana(segunda);
  const mapaPorDia = new Map(porDia.map((row) => [row.data, row]));

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        active="semana"
        gestaoId={gestaoAtiva.id}
        kicker="Fechamento semanal"
        subtitle={
          fechada ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Fechada em{" "}
              {new Date(fechamento.fechado_em).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              por {fechamento.fechado_por_nome ?? "—"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              Em aberto
            </span>
          )
        }
        title={`Semana de ${formatRange(inicioIso, fimIso)}`}
        below={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-full border border-line bg-background px-3 py-2 text-sm"
              href={`/dashboard/semana?gestao=${gestaoAtiva.id}&inicio=${isoDate(semanaAnterior)}`}
            >
              ← Semana anterior
            </Link>
            <Link
              className="rounded-full border border-line bg-background px-3 py-2 text-sm"
              href={`/dashboard/semana?gestao=${gestaoAtiva.id}`}
            >
              Esta semana
            </Link>
            <Link
              className="rounded-full border border-line bg-background px-3 py-2 text-sm"
              href={`/dashboard/semana?gestao=${gestaoAtiva.id}&inicio=${isoDate(semanaProxima)}`}
            >
              Próxima semana →
            </Link>
          </div>
        }
      />

      <DashboardStack>
        {status === "semana-fechada" ? (
          <div className="rounded-[1rem] border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
            Semana fechada com sucesso.
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold">Leitura rápida da semana</h2>
            <p className="text-xs text-muted">
              Sugestão de reserva ({percentualReserva}%):{" "}
              <strong className="text-foreground">{money(reservaFechamento)}</strong>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-[1.2rem] border border-line bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Entradas</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">{money(metricasBase.entradas)}</p>
              <p className="mt-1 text-sm text-muted">Receitas na corrente</p>
            </article>
            <article className="rounded-[1.2rem] border border-line bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Saídas no débito</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{money(metricasBase.saidasCorrente)}</p>
              <p className="mt-1 text-sm text-muted">Débito · Pix da corrente (sem fatura)</p>
              {pagamentosFaturaExtrato > 0 ? (
                <p className="mt-2 text-xs text-muted">
                  No extrato também: <strong className="text-foreground">{money(pagamentosFaturaExtrato)}</strong> de
                  fatura (entra no registro do fechamento, não aqui).
                </p>
              ) : null}
            </article>
            <article className="rounded-[1.2rem] border border-line bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Saídas no crédito</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{money(metricasBase.comprasCartao)}</p>
              <p className="mt-1 text-sm text-muted">Compras no cartão com data nesta semana</p>
            </article>
            <article className="rounded-[1.2rem] border border-line bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Total gasto</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">{money(totalGastoSemana)}</p>
              <p className="mt-1 text-sm text-muted">Débito + crédito</p>
            </article>
            <article
              className={`rounded-[1.2rem] border p-4 ${resultadoOperacional >= 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Resultado da semana</p>
              <p
                className={`mt-2 text-2xl font-semibold ${resultadoOperacional >= 0 ? "text-emerald-700" : "text-rose-700"}`}
              >
                {money(resultadoOperacional)}
              </p>
              <p className="mt-1 text-sm text-muted">Entradas − débito − crédito (antes das reservas)</p>
            </article>
            <article className="rounded-[1.2rem] border border-line bg-surface p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Zeragem da semana</p>
              <p className="mt-2 text-base font-semibold">
                {ajusteDiaADiaTipo === "aporte"
                  ? `Aportar ${money(ajusteDiaADiaValor)}`
                  : ajusteDiaADiaTipo === "resgate"
                    ? `Resgatar ${money(ajusteDiaADiaValor)}`
                    : "Fechou zerada"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {ajusteDiaADiaTipo === "nenhum"
                  ? `Sem ajuste na ${nomeReservaDiaADia}.`
                  : `${nomeReservaDiaADia} — só registra a conferência, não lança de novo se já mexeu no banco.`}
              </p>
            </article>
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-heading text-lg font-semibold">Dia a dia</h2>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Segunda a domingo. <strong>Entradas</strong>, <strong>Débito / Pix</strong> e <strong>Cartão</strong> (compras
            no crédito com data <em>nessa</em> semana). <strong>Líquido do dia</strong> = entradas − débito/Pix − cartão
            (mesma lógica do relatório em PDF). Pagamento de fatura e aplicação/resgate na poupança não entram aqui — é
            sempre fechamento de outra semana.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm tabular-nums">
              <colgroup>
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "26%" }} />
              </colgroup>
              <thead>
                <tr className="text-muted">
                  <th className="px-2 py-2 !text-left font-medium">Dia</th>
                  <th className="px-2 py-2 !text-right font-medium">Entradas</th>
                  <th className="px-2 py-2 !text-right font-medium">Débito / Pix</th>
                  <th className="px-2 py-2 !text-right font-medium">Cartão</th>
                  <th className="px-2 py-2 !text-right font-medium">Líquido do dia</th>
                </tr>
              </thead>
              <tbody>
                {diasIso.map((iso) => {
                  const row = mapaPorDia.get(iso);
                  const r = row ?? {
                    entradas: 0,
                    saidasCorrente: 0,
                    pagamentoFatura: 0,
                    transferenciaSaida: 0,
                    transferenciaEntrada: 0,
                    comprasCartao: 0,
                  };
                  const liquidoOperacao = r.entradas - r.saidasCorrente - r.comprasCartao;
                  return (
                    <tr key={iso} className="border-t border-line">
                      <td className="px-2 py-2 text-left capitalize">{formatDiaCurto(iso)}</td>
                      <td className="px-2 py-2 text-right text-emerald-700">{money(r.entradas)}</td>
                      <td className="px-2 py-2 text-right text-rose-700">{money(r.saidasCorrente)}</td>
                      <td className="px-2 py-2 text-right text-muted">{money(r.comprasCartao)}</td>
                      <td
                        className={`px-2 py-2 text-right font-medium ${liquidoOperacao >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {money(liquidoOperacao)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const totalEntradas = metricasBase.entradas;
                  const totalSaidas = metricasBase.saidasCorrente;
                  const totalCartao = metricasBase.comprasCartao;
                  const totalLiquido = totalEntradas - totalSaidas - totalCartao;
                  return (
                    <tr className="border-t border-line bg-background/60 font-medium">
                      <td className="px-2 py-2 text-left">Total semana</td>
                      <td className="px-2 py-2 text-right text-emerald-700">
                        <SemanaConferenciaModal
                          buttonClassName="weekly-total-button text-emerald-700"
                          initialGrupo="entradas"
                          itens={conferenciaLancamentos}
                        >
                          {money(totalEntradas)}
                        </SemanaConferenciaModal>
                      </td>
                      <td className="px-2 py-2 text-right text-rose-700">
                        <SemanaConferenciaModal
                          buttonClassName="weekly-total-button text-rose-700"
                          initialGrupo="debito_pix"
                          itens={conferenciaLancamentos}
                        >
                          {money(totalSaidas)}
                        </SemanaConferenciaModal>
                      </td>
                      <td className="px-2 py-2 text-right text-rose-700">
                        <SemanaConferenciaModal
                          buttonClassName="weekly-total-button text-rose-700"
                          initialGrupo="cartao"
                          itens={conferenciaLancamentos}
                        >
                          {money(totalCartao)}
                        </SemanaConferenciaModal>
                      </td>
                      <td className={`px-2 py-2 text-right ${totalLiquido >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        <SemanaConferenciaModal
                          buttonClassName={`weekly-total-button ${totalLiquido >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                          initialGrupo="todos"
                          itens={conferenciaLancamentos}
                        >
                          {money(totalLiquido)}
                        </SemanaConferenciaModal>
                      </td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
          {diasIso.some((iso) => {
            const x = mapaPorDia.get(iso);
            if (!x) return false;
            return x.pagamentoFatura > 0 || x.transferenciaSaida > 0 || x.transferenciaEntrada > 0;
          }) ? (
            <p className="mt-3 text-xs text-muted leading-relaxed">
              Nesta semana há dia(s) com <strong>pagamento de fatura</strong> e/ou <strong>movimento com poupança (CDB)</strong>{" "}
              no extrato. Isso muda o saldo real da conta naquele dia, mas não faz parte do líquido operacional acima —
              costuma abater fechamentos de semanas anteriores.
            </p>
          ) : null}
        </section>

        {!fechada ? (
          <section className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5">
            <h2 className="font-heading text-lg font-semibold">Fechar a semana</h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Preencha <strong>fatura paga na corrente</strong> e <strong>reservas</strong>. Ao fechar, o LT grava o
              snapshot e cria os lançamentos no extrato (Liquidez atualiza). A conferência usa o modelo do caderno:
              resultado da semana − fatura − reservas = saldo em caixa.
            </p>

            <FecharSemanaForm
              gestaoId={gestaoAtiva.id}
              inicio={inicioIso}
              fim={fimIso}
              entradasSemana={metricasBase.entradas}
              saidasCorrenteSemana={metricasBase.saidasCorrente}
              comprasCartaoSemana={metricasBase.comprasCartao}
              pagamentoFaturaSugerido={pagamentosFaturaExtrato}
              reservasDisponiveis={contasReserva.map((c) => ({ id: c.id, nome: c.nome }))}
              contasCorrente={contasCorrentes.map((c) => ({ id: c.id, nome: c.nome }))}
              contaOrigemPadraoId={contaOrigemPadrao?.id ?? null}
              action={fecharSemanaAction}
            />
          </section>
        ) : (
          <section className="rounded-[1.4rem] border border-emerald-500/40 bg-emerald-500/5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold">Snapshot do fechamento</h2>
              {Number(fechamento.apenas_snapshot) === 1 ? (
                <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-900 dark:text-amber-100">
                  Já executado no banco
                </span>
              ) : null}
              {fechamento.lancamento_reserva_id ? (
                <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-100">
                  Movimentos registrados
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Valores gravados neste fechamento. No banco, o campo interno <em>sobra</em> é só{" "}
              <strong className="text-foreground">entradas − débito/Pix</strong> (sem descontar o cartão); os rótulos
              abaixo deixam isso explícito.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <span className="text-muted">Entradas:</span> <strong>{money(metricasBase.entradas)}</strong>
              </div>
              <div>
                <span className="text-muted">Saídas corrente (débito/Pix):</span>{" "}
                <strong>{money(metricasBase.saidasCorrente)}</strong>
              </div>
              <div>
                <span className="text-muted">Compras no cartão (semana):</span>{" "}
                <strong>{money(metricasBase.comprasCartao)}</strong>
              </div>
              <div>
                <span
                  className="text-muted"
                  title="Valor salvo no fechamento (entradas − saídas corrente, sem cartão)"
                >
                  Entradas − débito:
                </span>{" "}
                <strong className={metricasBase.sobra >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  {money(metricasBase.sobra)}
                </strong>
              </div>
              <div
                className={`rounded-[0.85rem] border px-3 py-2 sm:col-span-2 lg:col-span-1 ${
                  resultadoOperacional >= 0
                    ? "border-emerald-500/35 bg-emerald-500/5"
                    : "border-rose-500/35 bg-rose-500/5"
                }`}
              >
                <span className="text-muted">Resultado operacional:</span>{" "}
                <strong className={resultadoOperacional >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  {money(resultadoOperacional)}
                </strong>
                <p className="mt-1 text-xs text-muted leading-snug">
                  Entradas − débito − cartão (mesma lógica da leitura rápida).
                </p>
              </div>
              <div>
                <span className="text-muted">Reserva (total registrado):</span>{" "}
                <strong>{money(fechamento.reservado)}</strong>
              </div>
              <div>
                <span className="text-muted">Fatura (registrado):</span>{" "}
                <strong>{money(fechamento.pagamento_fatura ?? 0)}</strong>
              </div>
              <div>
                <span className="text-muted">Zeragem ({nomeReservaDiaADia}):</span>{" "}
                <strong>
                  {fechamento.ajuste_dia_a_dia_tipo === "aporte"
                    ? `Aporte ${money(fechamento.ajuste_dia_a_dia_valor)}`
                    : fechamento.ajuste_dia_a_dia_tipo === "resgate"
                      ? `Resgate ${money(fechamento.ajuste_dia_a_dia_valor)}`
                      : money(0)}
                </strong>
              </div>
            </div>
            {(() => {
              const linhas = reservasPorContaParaSnapshot(fechamento.reservas_por_conta);
              if (linhas.length > 0) {
                return (
                  <div className="mt-4 rounded-[1rem] border border-line bg-background/50 p-3 sm:p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Reservas neste fechamento</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {linhas.map((r, i) => (
                        <li key={`${r.nome}-${i}`} className="flex flex-wrap justify-between gap-2">
                          <span>{r.nome}</span>
                          <strong className="tabular-nums">{money(r.valor)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              if (Number(fechamento.reservado ?? 0) > 0.005) {
                return (
                  <p className="mt-3 text-xs text-muted">
                    O total em reserva foi gravado, mas o detalhe por conta não estava disponível neste registro
                    (fechamentos antigos). Confira em observações ou nos lançamentos de transferência.
                  </p>
                );
              }
              return null;
            })()}
            {fechamento.observacoes ? (
              <p className="mt-3 text-sm text-muted">“{fechamento.observacoes}”</p>
            ) : null}
          </section>
        )}

        <section className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5">
          <h2 className="font-heading text-lg font-semibold">Histórico</h2>
          <p className="mt-1 text-sm text-muted">Últimas {historico.length || 0} semanas fechadas.</p>

          {historico.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhuma semana fechada ainda.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className="py-2 !text-left font-medium">Semana</th>
                    <th className="py-2 !text-right font-medium">Entradas</th>
                    <th className="py-2 !text-right font-medium">Saídas</th>
                    <th className="py-2 !text-right font-medium">Compras cartão</th>
                    <th className="py-2 !text-right font-medium">Sobra</th>
                    <th className="py-2 !text-right font-medium">Reserva</th>
                    <th className="py-2 !text-right font-medium">Zeragem</th>
                    <th className="py-2 !text-right font-medium">Fatura</th>
                    <th className="py-2"> </th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((f) => (
                    <tr key={f.id} className="border-t border-line">
                      <td className="py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            className="text-foreground underline-offset-2 hover:underline"
                            href={`/dashboard/semana?gestao=${gestaoAtiva.id}&inicio=${f.periodo_inicio}`}
                          >
                            {formatRange(f.periodo_inicio, f.periodo_fim)}
                          </Link>
                          {Number(f.apenas_snapshot) === 1 ? (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
                              hist.
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2 text-right text-emerald-700">{money(f.entradas)}</td>
                      <td className="py-2 text-right text-rose-700">{money(f.saidas_corrente)}</td>
                      <td className="py-2 text-right">{money(f.compras_cartao)}</td>
                      <td className={`py-2 text-right ${Number(f.sobra) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {money(f.sobra)}
                      </td>
                      <td className="py-2 text-right">{money(f.reservado)}</td>
                      <td className="py-2 text-right">
                        {f.ajuste_dia_a_dia_tipo === "aporte"
                          ? `+ ${money(f.ajuste_dia_a_dia_valor)}`
                          : f.ajuste_dia_a_dia_tipo === "resgate"
                            ? `- ${money(f.ajuste_dia_a_dia_valor)}`
                            : money(0)}
                      </td>
                      <td className="py-2 text-right">{money(f.pagamento_fatura ?? 0)}</td>
                      <td className="py-2 text-right text-muted text-xs">
                        {new Date(f.fechado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </DashboardStack>
    </DashboardPageShell>
  );
}
