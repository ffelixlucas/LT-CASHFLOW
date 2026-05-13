"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import {
  createCategoriaAction,
  createContaAction,
  createGestaoAction,
  createLancamentoAction,
  createTransferenciaAction,
} from "@/app/dashboard/actions";
import { DateInput } from "@/components/ui/date-input";
import { MoneyInput } from "@/components/ui/money-input";
import { preserveScrollPosition, restorePreservedScrollPosition } from "@/lib/client/scroll-preservation";
import { formatDateForDisplay } from "@/lib/date";

type ContaOption = {
  id: number;
  nome: string;
  tipo: string;
};

type CategoriaOption = {
  id: number;
  nome: string;
  natureza?: string;
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
    tipo: "receita" | "despesa" | "ajuste" | "transferencia";
    status: "previsto" | "pendente" | "liquidado";
    meio?: "pix" | "debito" | "credito" | "dinheiro" | "ted_doc" | "transferencia" | "outro";
    valorTotal: number;
    competenciaData: string;
    competenciaHora?: string;
    contaId: number;
    contaDestinoId?: number;
    categoriaId?: number;
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

type ModalKey = "gestao" | "origem" | "categoria" | "lancamento" | "transferencia" | "extrato" | null;

type LaunchDraft = {
  descricao: string;
  tipo: "receita" | "despesa" | "ajuste" | "transferencia";
  status: "previsto" | "pendente" | "liquidado";
  meio: "" | "pix" | "debito" | "credito" | "dinheiro" | "ted_doc" | "transferencia" | "outro";
  contaId: number | null;
  contaDestinoId: number | null;
  categoriaId: number | null;
  valorTotal: string;
  competenciaData: string;
  competenciaHora: string;
  usaVencimento: boolean;
  vencimentoData: string;
};

const launchDraftStorageKey = "ltcashflow.dashboard.launch-draft";

const defaultLaunchDraft: LaunchDraft = {
  descricao: "",
  tipo: "despesa",
  status: "liquidado",
  meio: "",
  contaId: null,
  contaDestinoId: null,
  categoriaId: null,
  valorTotal: "",
  competenciaData: "",
  competenciaHora: "",
  usaVencimento: false,
  vencimentoData: "",
};

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
      role="dialog"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-line bg-surface p-5 shadow-2xl sm:rounded-[2rem] sm:p-6"
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [launchDraft, setLaunchDraft] = useState<LaunchDraft>(defaultLaunchDraft);
  const [launchFormKey, setLaunchFormKey] = useState(0);
  const [launchHasDueDate, setLaunchHasDueDate] = useState(false);
  const selectedStatementConta = contas.find((conta) => conta.id === statementContaId) ?? null;
  const statementContaIsCredit = selectedStatementConta?.tipo === "cartao_credito";
  const selectedCategory = categorias.find((categoria) => categoria.id === selectedCategoryId) ?? null;

  const closeModal = () => setOpenModal(null);
  const openAction = (key: Exclude<ModalKey, null>) => {
    setMenuOpen(false);
    setOpenModal(key);
  };
  const openCategoryCreate = () => {
    setSelectedCategoryId(null);
    setOpenModal("categoria");
  };
  const openCategoryEdit = (categoriaId: number) => {
    setSelectedCategoryId(categoriaId);
    setOpenModal("categoria");
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (openModal !== "lancamento") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(launchDraftStorageKey);
      if (!stored) {
        setLaunchDraft(defaultLaunchDraft);
        setLaunchFormKey((current) => current + 1);
        return;
      }

      const parsed = JSON.parse(stored) as Partial<LaunchDraft>;
      setLaunchDraft({
        ...defaultLaunchDraft,
        ...parsed,
        valorTotal: typeof parsed.valorTotal === "string" ? parsed.valorTotal : defaultLaunchDraft.valorTotal,
        contaId: typeof parsed.contaId === "number" ? parsed.contaId : null,
        contaDestinoId: typeof parsed.contaDestinoId === "number" ? parsed.contaDestinoId : null,
        categoriaId: typeof parsed.categoriaId === "number" ? parsed.categoriaId : null,
        usaVencimento: Boolean(parsed.usaVencimento),
      });
      setLaunchHasDueDate(Boolean(parsed.usaVencimento));
      setLaunchFormKey((current) => current + 1);
    } catch {
      setLaunchDraft(defaultLaunchDraft);
      setLaunchHasDueDate(false);
      setLaunchFormKey((current) => current + 1);
    }
  }, [openModal]);

  function rememberLaunchDraft(form: HTMLFormElement) {
    const data = new FormData(form);
    const draft: LaunchDraft = {
      descricao: String(data.get("descricao") ?? ""),
      tipo: (String(data.get("tipo") ?? "despesa") as LaunchDraft["tipo"]),
      status: (String(data.get("status") ?? "liquidado") as LaunchDraft["status"]),
      meio: (String(data.get("meio") ?? "") as LaunchDraft["meio"]),
      contaId: Number(data.get("contaId") || 0) || null,
      contaDestinoId: Number(data.get("contaDestinoId") || 0) || null,
      categoriaId: Number(data.get("categoriaId") || 0) || null,
      valorTotal: String(data.get("valorTotal") ?? ""),
      competenciaData: String(data.get("competenciaData") ?? ""),
      competenciaHora: String(data.get("competenciaHora") ?? ""),
      usaVencimento: data.get("usaVencimento") === "on",
      vencimentoData: String(data.get("vencimentoData") ?? ""),
    };

    window.localStorage.setItem(launchDraftStorageKey, JSON.stringify(draft));
  }

  function updateLaunchDraft(next: Partial<LaunchDraft>) {
    setLaunchDraft((current) => {
      const updated = { ...current, ...next };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(launchDraftStorageKey, JSON.stringify(updated));
      }
      return updated;
    });
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

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
      preserveScrollPosition();
      router.refresh();
      setTimeout(restorePreservedScrollPosition, 120);
      setTimeout(restorePreservedScrollPosition, 360);
    } catch (error) {
      setReconcileError(error instanceof Error ? error.message : "Nao foi possivel importar os faltantes.");
    } finally {
      setReconcileLoading(false);
    }
  }

  async function handleStatementFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    const content = await file.text();
    setStatementText(content);
    setPreview(null);
    setReconcileError(null);
  }

  return (
    <>
      <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
        <div className="relative h-48 w-48 overflow-visible sm:h-56 sm:w-56">
          {menuOpen && gestaoId ? (
            <>
              <div className="absolute right-0 bottom-0 flex w-20 flex-col items-center gap-1" style={{ transform: "translate(-6px, -92px)" }}>
                <button className="action-arc-circle" onClick={() => openAction("lancamento")} type="button">
                  +
                </button>
                <span className="text-[10px] font-medium text-muted">Lancamento</span>
              </div>
              <div className="absolute right-0 bottom-0 flex w-20 flex-col items-center gap-1" style={{ transform: "translate(-54px, -146px)" }}>
                <button className="action-arc-circle" onClick={() => openAction("transferencia")} type="button">
                  ↔
                </button>
                <span className="text-[10px] font-medium text-muted">Aplicacao</span>
              </div>
              <div className="absolute right-0 bottom-0 flex w-20 flex-col items-center gap-1" style={{ transform: "translate(-110px, -172px)" }}>
                <button className="action-arc-circle" onClick={() => openAction("extrato")} type="button">
                  ≡
                </button>
                <span className="text-[10px] font-medium text-muted">Extrato</span>
              </div>
              <div className="absolute right-0 bottom-0 flex w-20 flex-col items-center gap-1" style={{ transform: "translate(-166px, -146px)" }}>
                <button className="action-arc-circle" onClick={() => openAction("origem")} type="button">
                  ⊕
                </button>
                <span className="text-[10px] font-medium text-muted">Conta</span>
              </div>
              <div className="absolute right-0 bottom-0 flex w-20 flex-col items-center gap-1" style={{ transform: "translate(-220px, -92px)" }}>
                <button className="action-arc-circle" onClick={openCategoryCreate} type="button">
                  #
                </button>
                <span className="text-[10px] font-medium text-muted">Categoria</span>
              </div>
            </>
          ) : null}

          <button
            aria-expanded={menuOpen}
            aria-label="Abrir acoes rapidas"
            className="absolute right-0 bottom-0 flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-3xl font-light text-white shadow-[0_18px_50px_rgba(30,42,47,0.22)] transition-transform duration-200 hover:scale-105 active:scale-95"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            {menuOpen ? "×" : "+"}
          </button>
        </div>
      </div>

      <DashboardModal
        description="Crie uma nova gestao. As contas, cartões e reservas vêm depois."
        onClose={closeModal}
        open={openModal === "gestao"}
        title="Nova gestao"
      >
        <form action={createGestaoAction} className="grid gap-3">
          <input
            className="rounded-2xl border border-line bg-background px-4 py-3"
            name="nome"
            placeholder="Ex: Lucas, Familia Felix ou Empresa XYZ"
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
        description="Adicione uma conta, cartão, poupança ou investimento. Você pode criar mais depois, sem limite fixo."
        onClose={closeModal}
        open={openModal === "origem"}
        title="Nova conta"
      >
        {gestaoId ? (
          <form action={createContaAction} className="grid gap-3">
            <input name="gestaoId" type="hidden" value={gestaoId} />
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="nome"
              placeholder="Ex: Banco principal ou Cartão principal"
              required
            />
            <p className="text-xs leading-5 text-muted">
              Depois de criar a gestão, você pode voltar aqui e adicionar quantas contas, cartões, poupanças ou investimentos quiser.
            </p>
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
            <p className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-muted">
              Depois de criar a gestao, você pode voltar aqui quantas vezes quiser para adicionar mais contas e cartões.
            </p>

            <div className="mt-2 flex justify-end">
              <button
                className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
                type="submit"
              >
                Adicionar conta
              </button>
            </div>
          </form>
        ) : null}
      </DashboardModal>

      <DashboardModal
        description="Use categorias para classificar receitas, despesas e saídas da conta."
        onClose={closeModal}
        open={openModal === "categoria"}
        title={selectedCategory ? "Editar categoria" : "Nova categoria"}
      >
        {gestaoId ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Categorias atuais</p>
                  <p className="text-sm text-muted">Toque em editar para ajustar nome e natureza.</p>
                </div>
                <button className="tab" onClick={openCategoryCreate} type="button">
                  Nova categoria
                </button>
              </div>
              <div className="max-h-48 overflow-auto rounded-2xl border border-line bg-background p-2">
                {categorias.length > 0 ? (
                  <div className="grid gap-2">
                    {categorias.map((categoria) => (
                      <button
                        key={categoria.id}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                          selectedCategoryId === categoria.id
                            ? "border-foreground bg-surface"
                            : "border-line bg-background hover:border-foreground/40"
                        }`}
                        onClick={() => openCategoryEdit(categoria.id)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{categoria.nome}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">{categoria.natureza}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-foreground">Editar</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-4 text-sm text-muted">Nenhuma categoria criada ainda.</p>
                )}
              </div>
            </div>

            <form action={createCategoriaAction} className="grid gap-3">
              <input name="gestaoId" type="hidden" value={gestaoId} />
              {selectedCategory ? <input name="categoriaId" type="hidden" value={selectedCategory.id} /> : null}
              <input
                key={`${selectedCategory?.id ?? "nova"}-nome`}
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedCategory?.nome ?? ""}
                name="nome"
                placeholder="Ex: Mercado"
                required
              />
              <select
                key={`${selectedCategory?.id ?? "nova"}-natureza`}
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedCategory?.natureza ?? "despesa"}
                name="natureza"
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
                <option value="ambos">Ambos</option>
              </select>

              <div className="mt-2 flex items-center justify-between gap-3">
                <button className="tab" onClick={openCategoryCreate} type="button">
                  Limpar
                </button>
                <button className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white" type="submit">
                  {selectedCategory ? "Salvar categoria" : "Criar categoria"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </DashboardModal>

      <DashboardModal
        description="Cole o texto bruto do extrato bancario para comparar com os lancamentos da conta escolhida e importar o que estiver faltando."
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
                Essa conta e um cartao de credito. A conciliacao deste modal e bancaria e nao pode importar extrato em cartao. Use uma conta para PIX, debito, transferencias e saldo.
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
            <div className="grid gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Arquivo de extrato (OFX ou texto)
              </label>
              <input
                accept=".ofx,.txt,text/plain,application/octet-stream"
                className="rounded-2xl border border-line bg-background px-4 py-3 text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleStatementFileSelected(file);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
              <p className="text-xs text-muted">
                Ao selecionar um arquivo, o conteudo e carregado para previa. A importacao continua manual com confirmacao.
              </p>
            </div>

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
                    Tudo o que foi reconhecido nesse extrato ja parece bater com o sistema para essa conta.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </DashboardModal>

      <DashboardModal
        description="Registre um movimento da gestao ativa. Para aplicacao, escolha transferencia e informe a conta destino."
        onClose={closeModal}
        open={openModal === "lancamento"}
        title="Novo lancamento"
      >
        {gestaoId ? (
          <form
            action={createLancamentoAction}
            className="grid gap-3 md:grid-cols-2"
            key={launchFormKey}
            onSubmitCapture={(event) => rememberLaunchDraft(event.currentTarget)}
          >
            <input name="gestaoId" type="hidden" value={gestaoId} />
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3 md:col-span-2"
              name="descricao"
              onChange={(event) => updateLaunchDraft({ descricao: event.target.value })}
              value={launchDraft.descricao}
              placeholder="Descricao do lancamento"
              required
            />
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="tipo"
              onChange={(event) => {
                const tipo = event.target.value as LaunchDraft["tipo"];
                updateLaunchDraft({
                  tipo,
                  categoriaId: tipo === "transferencia" ? null : launchDraft.categoriaId,
                  contaDestinoId: tipo === "transferencia" ? launchDraft.contaDestinoId : null,
                  meio: tipo === "transferencia" ? "transferencia" : launchDraft.meio,
                });
              }}
              value={launchDraft.tipo}
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
              <option value="ajuste">Ajuste</option>
              <option value="transferencia">Transferencia / Aplicacao</option>
            </select>
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="status"
              onChange={(event) => updateLaunchDraft({ status: event.target.value as LaunchDraft["status"] })}
              value={launchDraft.status}
            >
              <option value="liquidado">Liquidado</option>
              <option value="pendente">Pendente</option>
              <option value="previsto">Previsto</option>
            </select>
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="meio"
              onChange={(event) => updateLaunchDraft({ meio: event.target.value as LaunchDraft["meio"] })}
              value={launchDraft.meio}
              hidden={launchDraft.tipo === "transferencia"}
            >
              <option value="">Meio nao informado</option>
              <option value="pix">PIX</option>
              <option value="debito">Debito</option>
              <option value="credito">Credito</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="ted_doc">TED/DOC</option>
              <option value="transferencia">Transferencia</option>
              <option value="outro">Outro</option>
            </select>
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="contaId"
              onChange={(event) => updateLaunchDraft({ contaId: Number(event.target.value) || null })}
              value={launchDraft.contaId ?? ""}
              required
            >
              <option value="">Conta</option>
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}
                </option>
              ))}
            </select>
            {launchDraft.tipo === "transferencia" ? (
              <select
                className="rounded-2xl border border-line bg-background px-4 py-3"
                name="contaDestinoId"
                onChange={(event) => updateLaunchDraft({ contaDestinoId: Number(event.target.value) || null })}
                value={launchDraft.contaDestinoId ?? ""}
                required
              >
                <option value="">Conta destino (poupanca ou investimento)</option>
                {contas
                  .filter((conta) => conta.tipo === "poupanca" || conta.tipo === "investimento")
                  .map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome}
                    </option>
                  ))}
              </select>
            ) : (
              <select
                className="rounded-2xl border border-line bg-background px-4 py-3"
                name="categoriaId"
                onChange={(event) => updateLaunchDraft({ categoriaId: Number(event.target.value) || null })}
                value={launchDraft.categoriaId ?? ""}
                required
              >
                <option value="">Categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            )}
            <MoneyInput
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue={launchDraft.valorTotal}
              name="valorTotal"
              onValueChange={(value) => updateLaunchDraft({ valorTotal: value })}
              placeholder="R$ 0,00"
              required
            />
            <DateInput
              className="rounded-2xl border border-line bg-background px-4 py-3"
              defaultValue={launchDraft.competenciaData || hoje}
              name="competenciaData"
              onValueChange={(value) => updateLaunchDraft({ competenciaData: value })}
              required
            />
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="competenciaHora"
              onChange={(event) => updateLaunchDraft({ competenciaHora: event.target.value })}
              value={launchDraft.competenciaHora}
              type="time"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-line bg-background px-4 py-3 md:col-span-2">
              <input
                checked={launchHasDueDate}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setLaunchHasDueDate(checked);
                  updateLaunchDraft({
                    usaVencimento: checked,
                    vencimentoData: checked ? launchDraft.vencimentoData || hoje : "",
                  });
                }}
                type="checkbox"
              />
              <span className="text-sm font-medium text-foreground">Habilitar vencimento</span>
            </label>

            {launchHasDueDate ? (
              <DateInput
                key={`vencimento-${launchFormKey}-${launchHasDueDate ? "on" : "off"}`}
                className="rounded-2xl border border-line bg-background px-4 py-3 md:col-span-2"
                defaultValue={launchDraft.vencimentoData || hoje}
                name="vencimentoData"
                onValueChange={(value) => updateLaunchDraft({ vencimentoData: value })}
                required
              />
            ) : (
              <input name="vencimentoData" type="hidden" value="" />
            )}

            <p className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-muted md:col-span-2">
              Transferencia / Aplicacao move dinheiro entre contas. Ela nao entra como despesa. Para porquinho ou investimento, escolha esse tipo e informe a conta destino.
            </p>

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

      <DashboardModal
        description="Use para mandar valor da conta corrente para poupança ou investimento sem virar despesa. Se quiser apenas mover entre contas, funciona do mesmo jeito."
        onClose={closeModal}
        open={openModal === "transferencia"}
        title="Nova aplicacao"
      >
        {gestaoId ? (
          <form action={createTransferenciaAction} className="grid gap-3 md:grid-cols-2">
            <input name="gestaoId" type="hidden" value={gestaoId} />
            <input
              className="rounded-2xl border border-line bg-background px-4 py-3 md:col-span-2"
              name="descricao"
              placeholder="Ex.: Aplicacao CDB Porquinho"
              required
            />
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="contaOrigemId"
              required
            >
              <option value="">Conta origem</option>
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}
                </option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="contaDestinoId"
              required
            >
              <option value="">Conta destino (poupanca ou investimento)</option>
              {contas
                .filter((conta) => conta.tipo === "poupanca" || conta.tipo === "investimento")
                .map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                  </option>
                ))}
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
            <MoneyInput
              className="rounded-2xl border border-line bg-background px-4 py-3"
              name="valorTotal"
              placeholder="R$ 0,00"
              required
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

            <p className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-muted md:col-span-2">
              Se a conta destino for poupança ou investimento, o sistema vai tratar isso como aplicação e não como despesa.
            </p>

            <div className="mt-2 flex justify-end md:col-span-2">
              <button
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
                type="submit"
              >
                Registrar aplicacao
              </button>
            </div>
          </form>
        ) : null}
      </DashboardModal>
    </>
  );
}
