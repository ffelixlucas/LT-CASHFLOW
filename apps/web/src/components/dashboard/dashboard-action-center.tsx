"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import {
  createCategoriaAction,
  createContaAction,
  createGestaoAction,
  createLancamentoAction,
} from "@/app/dashboard/actions";
import { DateInput } from "@/components/ui/date-input";
import { formatDateForDisplay } from "@/lib/date";

type ContaOption = {
  id: number;
  nome: string;
  tipo: string;
};

type CategoriaOption = {
  id: number;
  nome: string;
};

type ExtratoPreviewItem = {
  id: string;
  date: string;
  label: string;
  detail: string;
  direction: "in" | "out";
  amount: number;
  balanceAfter: number | null;
  rationale: string;
  draft: {
    descricao: string;
    tipo: "receita" | "despesa" | "ajuste";
    status: "previsto" | "pendente" | "liquidado";
    meio?: "pix" | "debito" | "credito" | "dinheiro" | "boleto" | "ted_doc" | "transferencia" | "outro";
    valorTotal: number;
    competenciaData: string;
    competenciaHora?: string;
    contaId: number;
    categoriaId: number;
  };
};

type ExtratoPreview = {
  parsedCount: number;
  matchedCount: number;
  missingCount: number;
  ignoredCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  missingItems: ExtratoPreviewItem[];
};

type ModalKey = "gestao" | "origem" | "categoria" | "lancamento" | "extrato" | null;

function ActionButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "shrink-0 whitespace-nowrap rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-white"
      : "shrink-0 whitespace-nowrap rounded-full border border-line bg-background px-4 py-2.5 text-sm font-medium text-foreground";

  return (
    <button className={className} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function DashboardModal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 py-0 sm:px-4 sm:py-8"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-line bg-surface p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Acao</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              {title}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
          </div>

          <button
            aria-label="Fechar modal"
            className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-foreground"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function DashboardActionCenter({
  gestaoId,
  hoje,
  contas,
  categorias,
}: {
  gestaoId: number | null;
  hoje: string;
  contas: ContaOption[];
  categorias: CategoriaOption[];
}) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState<ModalKey>(null);
  const [statementContaId, setStatementContaId] = useState<number | null>(contas[0]?.id ?? null);
  const [statementText, setStatementText] = useState("");
  const [statementBaseDate, setStatementBaseDate] = useState(() => formatDateForDisplay(hoje));
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExtratoPreview | null>(null);
  const selectedStatementConta = contas.find((conta) => conta.id === statementContaId) ?? null;
  const statementContaIsCredit = selectedStatementConta?.tipo === "cartao_credito";

  const closeModal = () => setOpenModal(null);

  useEffect(() => {
    if (contas.length === 0) {
      setStatementContaId(null);
      return;
    }

    if (!statementContaId || !contas.some((conta) => conta.id === statementContaId)) {
      setStatementContaId(contas[0]?.id ?? null);
    }
  }, [contas, statementContaId]);

  async function handlePreviewExtrato() {
    if (!gestaoId || !statementContaId || !statementText.trim() || statementContaIsCredit) {
      return;
    }

    setReconcileLoading(true);
    setReconcileError(null);

    try {
      const response = await fetch("/api/reconciliacao/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId,
          contaId: statementContaId,
          text: statementText,
          fallbackDate: statementBaseDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel gerar a previa do extrato.");
      }

      setPreview(data as ExtratoPreview);
    } catch (error) {
      setPreview(null);
      setReconcileError(error instanceof Error ? error.message : "Nao foi possivel gerar a previa do extrato.");
    } finally {
      setReconcileLoading(false);
    }
  }

  async function handleImportMissing() {
    if (!gestaoId || !preview || preview.missingItems.length === 0 || statementContaIsCredit) {
      return;
    }

    setReconcileLoading(true);
    setReconcileError(null);

    try {
      const response = await fetch("/api/reconciliacao/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId,
          items: preview.missingItems.map((item) => item.draft),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel importar os faltantes.");
      }

      setPreview(null);
      setStatementText("");
      closeModal();
      router.refresh();
    } catch (error) {
      setReconcileError(error instanceof Error ? error.message : "Nao foi possivel importar os faltantes.");
    } finally {
      setReconcileLoading(false);
    }
  }

  return (
    <>
      <section className="rounded-[1.15rem] border border-line bg-surface p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Acoes rapidas</p>
            <p className="mt-1 text-sm text-muted">Cadastre ou confira sem sair do extrato.</p>
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {gestaoId ? (
              <>
                <ActionButton onClick={() => setOpenModal("lancamento")} variant="primary">
                  + Lancamento
                </ActionButton>
                <ActionButton onClick={() => setOpenModal("extrato")}>Conferir extrato</ActionButton>
                <ActionButton onClick={() => setOpenModal("origem")}>Origem</ActionButton>
                <ActionButton onClick={() => setOpenModal("categoria")}>Categoria</ActionButton>
              </>
            ) : null}

            <ActionButton onClick={() => setOpenModal("gestao")}>Gestao</ActionButton>
          </div>
      </section>

      <DashboardModal
        description="Crie uma nova gestao com origem principal e categorias padrao."
        onClose={closeModal}
        open={openModal === "gestao"}
        title="Nova gestao"
      >
        <form action={createGestaoAction} className="grid gap-3">
          <input
            className="rounded-2xl border border-line bg-background px-4 py-3"
            name="nome"
            placeholder="Ex: Familia Felix"
            required
          />
          <textarea
            className="min-h-28 rounded-2xl border border-line bg-background px-4 py-3"
            name="descricao"
            placeholder="Descricao opcional"
          />
          <select
            className="rounded-2xl border border-line bg-background px-4 py-3"
            defaultValue="familiar"
            name="tipo"
          >
            <option value="familiar">Familiar</option>
            <option value="pessoal">Pessoal</option>
            <option value="profissional">Profissional</option>
            <option value="projeto">Projeto</option>
          </select>

          <div className="mt-2 flex justify-end">
            <button
              className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Criar gestao
            </button>
          </div>
        </form>
      </DashboardModal>

      <DashboardModal
        description="Cadastre uma nova origem para entradas, saídas e transferencias."
        onClose={closeModal}
        open={openModal === "origem"}
        title="Nova origem"
      >
        {gestaoId ? (
          <form action={createContaAction} className="grid gap-3">
            <input name="gestaoId" type="hidden" value={gestaoId} />
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="nome"
              placeholder="Ex: Inter Lucas"
              required
            />
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue="corrente"
              name="tipo"
            >
              <option value="corrente">Conta corrente</option>
              <option value="poupanca">Poupanca</option>
              <option value="carteira">Carteira</option>
              <option value="cartao_credito">Cartao de credito</option>
              <option value="investimento">Investimento</option>
              <option value="caixa">Caixa</option>
              <option value="outro">Outro</option>
            </select>
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="instituicao"
              placeholder="Instituicao"
            />
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue="0"
              min="0"
              name="saldoInicial"
              step="0.01"
              type="number"
            />

            <div className="mt-2 flex justify-end">
              <button
                className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
                type="submit"
              >
                Criar origem
              </button>
            </div>
          </form>
        ) : null}
      </DashboardModal>

      <DashboardModal
        description="Use categorias para classificar receitas, despesas e saídas da conta."
        onClose={closeModal}
        open={openModal === "categoria"}
        title="Nova categoria"
      >
        {gestaoId ? (
          <form action={createCategoriaAction} className="grid gap-3">
            <input name="gestaoId" type="hidden" value={gestaoId} />
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="nome"
              placeholder="Ex: Mercado"
              required
            />
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue="despesa"
              name="natureza"
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
              <option value="ambos">Ambos</option>
            </select>

            <div className="mt-2 flex justify-end">
              <button
                className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
                type="submit"
              >
                Criar categoria
              </button>
            </div>
          </form>
        ) : null}
      </DashboardModal>

      <DashboardModal
        description="Cole o texto bruto do extrato bancario para comparar com os lancamentos da origem escolhida e importar o que estiver faltando."
        onClose={closeModal}
        open={openModal === "extrato"}
        title="Conciliar extrato"
      >
        {gestaoId ? (
          <div className="grid gap-3">
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              onChange={(event) => {
                setStatementContaId(Number(event.target.value));
                setPreview(null);
              }}
              value={statementContaId ?? ""}
            >
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}{conta.tipo === "cartao_credito" ? " · cartao de credito" : ""}
                </option>
              ))}
            </select>

            {statementContaIsCredit ? (
              <p className="rounded-2xl border border-[var(--color-warning,#b54708)]/20 bg-[var(--color-warning,#b54708)]/8 px-4 py-3 text-sm text-[var(--color-warning,#8a4600)]">
                Essa origem e um cartao de credito. A conciliacao deste modal e bancaria e nao pode importar extrato em cartao. Use uma origem de conta para PIX, debito, transferencias e saldo.
              </p>
            ) : null}

            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Data base do trecho
              </label>
              <DateInput
                className="rounded-2xl border border-line bg-background px-4 py-3"
                onValueChange={(value) => {
                  setStatementBaseDate(value);
                  setPreview(null);
                }}
                placeholder="dd/mm/aaaa"
                value={statementBaseDate}
              />
              <p className="text-xs leading-5 text-muted">
                Use este campo quando voce colar so um trecho do dia sem a linha de data do PDF.
              </p>
            </div>

            <textarea
              className="min-h-56 rounded-2xl border border-line bg-background px-4 py-3 text-sm"
              onChange={(event) => {
                setStatementText(event.target.value);
                setPreview(null);
              }}
              placeholder="Cole aqui o texto do extrato. Se colar so as movimentacoes, informe a data base acima."
              value={statementText}
            />

            {reconcileError ? (
              <p className="rounded-2xl border border-[var(--color-danger,#b42318)]/20 bg-[var(--color-danger,#b42318)]/8 px-4 py-3 text-sm text-[var(--color-danger,#b42318)]">
                {reconcileError}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-line bg-background px-4 py-2.5 text-sm font-medium text-foreground"
                disabled={reconcileLoading || !statementText.trim() || !statementContaId || statementContaIsCredit}
                onClick={() => void handlePreviewExtrato()}
                type="button"
              >
                {reconcileLoading ? "Conferindo..." : "Gerar previa"}
              </button>
              <button
                className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                disabled={reconcileLoading || !preview || preview.missingItems.length === 0 || statementContaIsCredit}
                onClick={() => void handleImportMissing()}
                type="button"
              >
                Importar faltantes
              </button>
            </div>

            {preview ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-[1rem] border border-line bg-background px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Lidas</p>
                    <p className="mt-2 text-lg font-semibold">{preview.parsedCount}</p>
                  </div>
                  <div className="rounded-[1rem] border border-line bg-background px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Ja batem</p>
                    <p className="mt-2 text-lg font-semibold text-success">{preview.matchedCount}</p>
                  </div>
                  <div className="rounded-[1rem] border border-line bg-background px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Faltando</p>
                    <p className="mt-2 text-lg font-semibold text-accent-strong">{preview.missingCount}</p>
                  </div>
                  <div className="rounded-[1rem] border border-line bg-background px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Ignoradas</p>
                    <p className="mt-2 text-lg font-semibold">{preview.ignoredCount}</p>
                  </div>
                </div>

                <div className="rounded-[1rem] border border-line bg-background px-4 py-3 text-sm text-muted">
                  Recorte lido: {preview.dateFrom ?? "-"} ate {preview.dateTo ?? "-"}.
                </div>

                {preview.missingItems.length > 0 ? (
                  <div className="space-y-2">
                    {preview.missingItems.map((item) => (
                      <article
                        className="rounded-[1rem] border border-line bg-background px-4 py-3"
                        key={item.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{item.draft.descricao}</p>
                            <p className="mt-1 text-xs text-muted">
                              {item.date} · {item.label}
                            </p>
                            <p className="mt-2 text-xs text-muted">{item.rationale}</p>
                          </div>
                          <p className={`shrink-0 text-base font-semibold ${item.direction === "in" ? "text-success" : "text-accent-strong"}`}>
                            {item.direction === "in" ? "+" : "-"} R$ {item.amount.toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1rem] border border-line bg-background px-4 py-4 text-sm text-foreground">
                    Tudo o que foi reconhecido nesse extrato ja parece bater com o sistema para essa origem.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </DashboardModal>

      <DashboardModal
        description="Registre um movimento da gestao ativa sem poluir a tela principal."
        onClose={closeModal}
        open={openModal === "lancamento"}
        title="Novo lancamento"
      >
        {gestaoId ? (
          <form action={createLancamentoAction} className="grid gap-3 md:grid-cols-2">
            <input name="gestaoId" type="hidden" value={gestaoId} />
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3 md:col-span-2"
              name="descricao"
              placeholder="Descricao do lancamento"
              required
            />
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue="despesa"
              name="tipo"
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
              <option value="ajuste">Ajuste</option>
            </select>
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue="liquidado"
              name="status"
            >
              <option value="liquidado">Liquidado</option>
              <option value="pendente">Pendente</option>
              <option value="previsto">Previsto</option>
            </select>
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue=""
              name="meio"
            >
              <option value="">Meio nao informado</option>
              <option value="pix">PIX</option>
              <option value="debito">Debito</option>
              <option value="credito">Credito</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="boleto">Boleto</option>
              <option value="ted_doc">TED/DOC</option>
              <option value="transferencia">Transferencia</option>
              <option value="outro">Outro</option>
            </select>
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="contaId"
              required
            >
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}
                </option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="categoriaId"
              required
            >
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3"
              min="0.01"
              name="valorTotal"
              placeholder="Valor"
              required
              step="0.01"
              type="number"
            />
            <DateInput
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue={hoje}
              name="competenciaData"
              required
            />
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue=""
              name="competenciaHora"
              type="time"
            />
            <DateInput
              className="rounded-2xl border border-line bg-background px-4 py-3 md:col-span-2"
              defaultValue={hoje}
              name="vencimentoData"
            />

            <div className="mt-2 flex justify-end md:col-span-2">
              <button
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
                type="submit"
              >
                Registrar lancamento
              </button>
            </div>
          </form>
        ) : null}
      </DashboardModal>
    </>
  );
}
