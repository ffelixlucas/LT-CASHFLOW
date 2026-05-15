import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { normalizeFaturaMesKey, resolveFaturaCompetenciaAberta } from "@ltcashflow/finance-core";

import { FaturaMesSelectForm } from "@/app/dashboard/cartao/fatura-mes-select-form";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { DashboardStack } from "@/components/dashboard/dashboard-stack";
import { requireUser } from "@/lib/server/auth";
import { timeServerAsync } from "@/lib/server/dashboard-server-timing";
import {
  countMovimentosFaturaCartaoConta,
  getResumoFaturaCartaoConta,
  listContas,
  listFaturaMesKeysParaCartaoConta,
  listMovimentosFaturaCartaoConta,
  listUserGestoes,
  type MovimentoFaturaCartao,
} from "@/lib/server/repository";

export const metadata: Metadata = {
  title: "Fatura do cartão",
  robots: { index: false, follow: false },
};

type CartaoPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function parseFaturaQuery(raw: string | string[] | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v?.trim()) {
    return null;
  }

  const t = v.trim();
  if (/^\d{4}-\d{2}$/.test(t)) {
    return normalizeFaturaMesKey(`${t}-01`);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return normalizeFaturaMesKey(t);
  }

  return null;
}

function parsePositiveInt(raw: string | string[] | undefined, fallback = 1) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function formatListaDia(isoDay: string) {
  const withNoonUtc = `${isoDay}T12:00:00Z`;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(withNoonUtc));
}

function agruparMovPorData(movs: MovimentoFaturaCartao[]): [string, MovimentoFaturaCartao[]][] {
  const map = new Map<string, MovimentoFaturaCartao[]>();
  for (const m of movs) {
    const arr = map.get(m.competencia_data) ?? [];
    arr.push(m);
    map.set(m.competencia_data, arr);
  }
  return [...map.entries()]
    .map(([dia, lista]) => [
      dia,
      [...lista].sort((a, b) => {
        const horaDiff = (b.competencia_hora ?? "00:00").localeCompare(a.competencia_hora ?? "00:00");
        return horaDiff || b.id - a.id;
      }),
    ] as [string, MovimentoFaturaCartao[]])
    .sort(([a], [b]) => b.localeCompare(a));
}

function montarHrefCartao(input: {
  gestaoId: number;
  contaId: number;
  fatura?: string;
  pagina?: number;
}) {
  const qs = new URLSearchParams({
    gestao: String(input.gestaoId),
    conta: String(input.contaId),
  });

  if (input.fatura) {
    qs.set("fatura", input.fatura);
  }

  if (input.pagina && input.pagina > 1) {
    qs.set("pagina", String(input.pagina));
  }

  return `/dashboard/cartao?${qs.toString()}`;
}

export default async function DashboardCartaoPage({ searchParams }: CartaoPageProps) {
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

  const contas = gestaoAtiva ? await listContas(gestaoAtiva.id) : [];
  const cartoes = contas.filter((conta) => conta.tipo === "cartao_credito");

  const requestedContaId =
    typeof params.conta === "string" ? Number(params.conta) : undefined;
  const contaCartaoAtiva =
    cartoes.find((item) => item.id === requestedContaId) ?? cartoes[0] ?? null;

  const hoje = new Date().toISOString().slice(0, 10);

  let faturaMesKeys: string[] = [];
  let faturaAberta = "";
  let faturaQuery: string | null = null;

  if (gestaoAtiva && contaCartaoAtiva) {
    faturaAberta = resolveFaturaCompetenciaAberta(
      hoje,
      contaCartaoAtiva.fechamento_dia ?? 30,
    );
    faturaQuery = parseFaturaQuery(params.fatura);
  }

  const faturaSelecionada =
    gestaoAtiva && contaCartaoAtiva
      ? (faturaQuery ?? faturaAberta)
      : normalizeFaturaMesKey(`${hoje.slice(0, 7)}-01`);

  let resumoFatura = null;
  let movimentos: MovimentoFaturaCartao[] = [];
  let totalMovimentos = 0;
  const movimentosPorPagina = 14;
  const paginaMovimentos = parsePositiveInt(params.pagina);
  const offsetMovimentos = (paginaMovimentos - 1) * movimentosPorPagina;

  if (gestaoAtiva && contaCartaoAtiva) {
    const [distinct, res, movs, totalMovs] = await timeServerAsync("dashboard/cartao/data", () =>
      Promise.all([
        listFaturaMesKeysParaCartaoConta({
          gestaoId: gestaoAtiva.id,
          contaCartaoId: contaCartaoAtiva.id,
          maxMeses: 36,
        }),
        getResumoFaturaCartaoConta({
          gestaoId: gestaoAtiva.id,
          contaCartaoId: contaCartaoAtiva.id,
          faturaCompetenciaData: faturaSelecionada,
          aplicarCreditosNoSaldo: false,
        }),
        listMovimentosFaturaCartaoConta({
          gestaoId: gestaoAtiva.id,
          contaCartaoId: contaCartaoAtiva.id,
          faturaCompetenciaData: faturaSelecionada,
          limit: movimentosPorPagina,
          offset: offsetMovimentos,
        }),
        countMovimentosFaturaCartaoConta({
          gestaoId: gestaoAtiva.id,
          contaCartaoId: contaCartaoAtiva.id,
          faturaCompetenciaData: faturaSelecionada,
        }),
      ]),
    );

    const opcaoSet = new Set<string>([...distinct, faturaAberta, faturaQuery ?? faturaAberta]);
    faturaMesKeys = [...opcaoSet].sort((a, b) => b.localeCompare(a));
    resumoFatura = res;
    movimentos = movs;
    totalMovimentos = totalMovs;
  }

  const totalPaginasMovimentos = Math.max(1, Math.ceil(totalMovimentos / movimentosPorPagina));
  const paginaMovimentosSegura = Math.min(paginaMovimentos, totalPaginasMovimentos);

  if (gestaoAtiva && contaCartaoAtiva && paginaMovimentos > totalPaginasMovimentos && totalMovimentos > 0) {
    redirect(
      montarHrefCartao({
        gestaoId: gestaoAtiva.id,
        contaId: contaCartaoAtiva.id,
        fatura: faturaSelecionada,
        pagina: totalPaginasMovimentos,
      }),
    );
  }

  const idxFatura =
    contaCartaoAtiva && faturaMesKeys.length > 0
      ? faturaMesKeys.indexOf(faturaSelecionada)
      : -1;
  const prevFatura =
    idxFatura >= 0 && idxFatura < faturaMesKeys.length - 1 ? faturaMesKeys[idxFatura + 1] : null;
  const nextFatura = idxFatura > 0 ? faturaMesKeys[idxFatura - 1] : null;

  const grupoMovimentos = agruparMovPorData(movimentos);

  const rotuloMesFatura = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${faturaSelecionada}T12:00:00Z`));

  const faturaOpcoesSelect = faturaMesKeys.map((mo) => {
    const lbl = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${mo}T12:00:00Z`));
    const mark = mo === faturaAberta ? " (atual)" : "";
    return { valor: mo, rotulo: `${lbl}${mark}` };
  });

  const fechTxt =
    contaCartaoAtiva?.fechamento_dia !== undefined && contaCartaoAtiva.fechamento_dia !== null
      ? `Dia ${contaCartaoAtiva.fechamento_dia}`
      : "—";
  const vencTxt =
    contaCartaoAtiva?.vencimento_dia !== undefined && contaCartaoAtiva.vencimento_dia !== null
      ? `Dia ${contaCartaoAtiva.vencimento_dia}`
      : "—";

  return (
    <DashboardPageShell>
      {!gestaoAtiva ? (
        <p className="muted">Nenhuma gestão disponível.</p>
      ) : (
        <>
          <DashboardPageHeader
            active="cartao"
            gestaoId={gestaoAtiva.id}
            kicker="Cartão de crédito"
            subtitle={contaCartaoAtiva?.nome ?? "Nenhum cartão selecionado"}
            title="Fatura"
            below={
              gestoes.length > 1 ? (
                <div className="period-chips">
                  {gestoes.map((gestao) => (
                    <Link
                      className={`period-chip ${gestaoAtiva.id === gestao.id ? "active" : ""}`}
                      href={`/dashboard/cartao?gestao=${gestao.id}`}
                      key={gestao.id}
                    >
                      {gestao.nome}
                    </Link>
                  ))}
                </div>
              ) : null
            }
          />

          <DashboardStack>
            {cartoes.length === 0 ? (
              <section className="decision-box">
                Nenhuma origem do tipo cartão cadastrada. Crie uma conta com tipo cartão de crédito em Origens.
              </section>
            ) : contaCartaoAtiva ? (
              <>
                {cartoes.length > 1 ? (
                  <div className="period-chips">
                    {cartoes.map((c) => (
                      <Link
                        key={c.id}
                        href={montarHrefCartao({ gestaoId: gestaoAtiva.id, contaId: c.id })}
                        className={`period-chip ${c.id === contaCartaoAtiva.id ? "active" : ""}`}
                      >
                        {c.nome}
                      </Link>
                    ))}
                  </div>
                ) : null}

                <section className="decision-hero">
                  <div className="decision-copy">
                    <p className="dashboard-kicker">Fatura selecionada</p>
                    <h2 className="capitalize">{rotuloMesFatura}</h2>
                    <p>
                      Fechamento: <strong>{fechTxt}</strong>. Vencimento: <strong>{vencTxt}</strong>.
                    </p>
                    <div className="decision-actions">
                      {prevFatura ? (
                        <Link
                          className="decision-button"
                          href={montarHrefCartao({
                            gestaoId: gestaoAtiva.id,
                            contaId: contaCartaoAtiva.id,
                            fatura: prevFatura,
                          })}
                        >
                          Fatura anterior
                        </Link>
                      ) : null}
                      <FaturaMesSelectForm
                        contaId={contaCartaoAtiva.id}
                        gestaoId={gestaoAtiva.id}
                        opcoes={faturaOpcoesSelect}
                        valorAtual={faturaSelecionada}
                      />
                      {nextFatura ? (
                        <Link
                          className="decision-button"
                          href={montarHrefCartao({
                            gestaoId: gestaoAtiva.id,
                            contaId: contaCartaoAtiva.id,
                            fatura: nextFatura,
                          })}
                        >
                          Próxima fatura
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="decision-ledger" aria-label="Resumo da fatura">
                    <div>
                      <span>Compras</span>
                      <strong className="bad">{resumoFatura ? money(resumoFatura.comprasFatura) : "—"}</strong>
                    </div>
                    <div>
                      <span>Pagamentos</span>
                      <strong className="good">
                        {resumoFatura && resumoFatura.pagamentosCorrente > 0
                          ? money(resumoFatura.pagamentosCorrente)
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span>Saldo em aberto</span>
                      <strong>{resumoFatura ? money(resumoFatura.saldoFatura) : "—"}</strong>
                    </div>
                    <div>
                      <span>Movimentos</span>
                      <strong>{totalMovimentos}</strong>
                    </div>
                  </div>
                </section>

                <section className="analysis-panel">
                  <div className="panel-head">
                    <div>
                      <p className="dashboard-kicker">Movimentações</p>
                      <h3>Compras e pagamentos</h3>
                    </div>
                    <span className="muted capitalize">{rotuloMesFatura}</span>
                  </div>

                  {movimentos.length === 0 ? (
                    <p className="muted">Nenhum lançamento nesta fatura.</p>
                  ) : (
                    <>
                      <div className="activity-list">
                        {grupoMovimentos.map(([dia, lista]) => (
                          <div className="card-statement-day" key={dia}>
                            <p className="card-statement-date">{formatListaDia(dia)}</p>
                            <div>
                              {lista.map((m) => {
                                const texto =
                                  (m.descricao && m.descricao.trim()) ||
                                  `${m.tipo === "compra" ? "Compra" : "Pagamento"} #${m.id}`;
                                const extra = `${m.categoria_nome}${m.conta_nome ? ` · ${m.conta_nome}` : ""}`;
                                const ehCompra = m.tipo === "compra";

                                return (
                                  <div className="activity-row" key={`${m.tipo}-${m.id}`}>
                                    <div>
                                      <strong>{texto}</strong>
                                      {extra.trim() !== "" ? <span>{extra}</span> : null}
                                    </div>
                                    <b className={ehCompra ? "bad" : "good"}>
                                      {ehCompra ? "-" : "+"}
                                      {money(m.valor_total)}
                                    </b>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="dashboard-pagination">
                        <span>
                          Página {paginaMovimentosSegura} de {totalPaginasMovimentos}
                        </span>
                        <div className="period-chips">
                          {paginaMovimentosSegura > 1 ? (
                            <Link
                              className="period-chip"
                              href={montarHrefCartao({
                                gestaoId: gestaoAtiva.id,
                                contaId: contaCartaoAtiva.id,
                                fatura: faturaSelecionada,
                                pagina: paginaMovimentosSegura - 1,
                              })}
                            >
                              ← Anterior
                            </Link>
                          ) : null}
                          {paginaMovimentosSegura < totalPaginasMovimentos ? (
                            <Link
                              className="period-chip"
                              href={montarHrefCartao({
                                gestaoId: gestaoAtiva.id,
                                contaId: contaCartaoAtiva.id,
                                fatura: faturaSelecionada,
                                pagina: paginaMovimentosSegura + 1,
                              })}
                            >
                              Próxima →
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </section>
              </>
            ) : (
              <p className="muted">Nenhum cartão de crédito cadastrado nesta gestão.</p>
            )}
          </DashboardStack>
        </>
      )}
    </DashboardPageShell>
  );
}
