import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { normalizeFaturaMesKey, resolveFaturaCompetenciaAberta } from "@ltcashflow/finance-core";

import { FaturaMesSelectForm } from "@/app/dashboard/cartao/fatura-mes-select-form";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { DashboardStack } from "@/components/dashboard/dashboard-stack";
import { RecentLancamentosTable } from "@/components/dashboard/recent-lancamentos-table";
import { requireUser } from "@/lib/server/auth";
import { timeServerAsync } from "@/lib/server/dashboard-server-timing";
import {
  parseRequestedGestaoId,
  resolveGestaoAtivaForRead,
} from "@/lib/server/gestao-read-page";
import {
  getResumoFaturaCartaoConta,
  listCategorias,
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
  const requestedGestaoId = parseRequestedGestaoId(params.gestao);
  const gestaoAtiva = await resolveGestaoAtivaForRead(user.id, gestoes, requestedGestaoId);

  const [contas, categorias] = gestaoAtiva
    ? await Promise.all([listContas(gestaoAtiva.id), listCategorias(gestaoAtiva.id)])
    : [[], []];
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

  if (gestaoAtiva && contaCartaoAtiva) {
    const [distinct, res, movs] = await timeServerAsync("dashboard/cartao/data", () =>
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
        }),
      ]),
    );

    const opcaoSet = new Set<string>([...distinct, faturaAberta, faturaQuery ?? faturaAberta]);
    faturaMesKeys = [...opcaoSet].sort((a, b) => b.localeCompare(a));
    resumoFatura = res;
    movimentos = movs;
    totalMovimentos = movs.length;
  }

  const idxFatura =
    contaCartaoAtiva && faturaMesKeys.length > 0
      ? faturaMesKeys.indexOf(faturaSelecionada)
      : -1;
  const prevFatura =
    idxFatura >= 0 && idxFatura < faturaMesKeys.length - 1 ? faturaMesKeys[idxFatura + 1] : null;
  const nextFatura = idxFatura > 0 ? faturaMesKeys[idxFatura - 1] : null;

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
  const contaTipoById = new Map(contas.map((conta) => [conta.id, conta.tipo]));
  const movimentosComoLancamentos = movimentos.map((movimento) => ({
    id: movimento.id,
    conta_id: movimento.conta_id,
    conta_tipo: contaTipoById.get(movimento.conta_id) ?? "outro",
    conta_destino_id: null,
    conta_destino_tipo: null,
    categoria_id: movimento.categoria_id,
    tipo: "despesa",
    status: movimento.status,
    meio: movimento.meio,
    descricao:
      movimento.descricao?.trim() ||
      `${movimento.tipo === "pagamento" ? "Pagamento de fatura" : "Compra no cartão"} #${movimento.id}`,
    valor_total: String(movimento.valor_total),
    competencia_data: movimento.competencia_data,
    fatura_competencia_data: movimento.fatura_competencia_data,
    data_compra: movimento.tipo === "compra" ? movimento.competencia_data : null,
    competencia_hora: movimento.competencia_hora,
    vencimento_data: movimento.vencimento_data,
    categoria_nome: movimento.categoria_nome || null,
    conta_nome: movimento.conta_nome,
    conta_destino_nome: null,
  }));

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
                    <RecentLancamentosTable
                      categorias={categorias}
                      contas={contas}
                      gestaoId={gestaoAtiva.id}
                      groupByDate="competencia"
                      lancamentos={movimentosComoLancamentos}
                      showGroupBalance={false}
                      showSummaryCards={false}
                    />
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
