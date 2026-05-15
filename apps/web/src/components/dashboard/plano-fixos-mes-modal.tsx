"use client";

import type { PlanoFixosMesItem } from "@ltcashflow/validation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { gerarPrevistosPlanoFixosMesAction, savePlanoFixosMesAction } from "@/app/dashboard/actions";
import { MoneyInput } from "@/components/ui/money-input";

type ContaOpt = { id: number; nome: string; tipo: string };
type CatOpt = { id: number; nome: string };

type MacroRow = PlanoFixosMesItem;

function NotebookIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height="44"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="44"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function cloneMacroRows(itens: PlanoFixosMesItem[]): MacroRow[] {
  return itens.map((item) => ({ ...item, meio: item.meio ?? null }));
}

function normalizeInitialRows(itens: PlanoFixosMesItem[]): MacroRow[] {
  return cloneMacroRows(itens).map((item) => ({
    ...item,
    competenciaData: undefined,
    dia: 1,
  }));
}

function defaultRow(contaId: number, categoriaId: number): MacroRow {
  return {
    nome: "",
    valor: 0.01,
    dia: 1,
    contaId,
    categoriaId,
    meio: null,
  };
}

function cleanItensForSave(rows: MacroRow[]): PlanoFixosMesItem[] {
  return rows
    .map((row) => {
      return {
        ...row,
        competenciaData: undefined,
        dia: 1,
        nome: row.nome.trim(),
        meio: row.meio && String(row.meio).length > 0 ? row.meio : null,
      };
    })
    .filter((row) => row.nome.length > 0 && row.valor > 0);
}

const inputCell =
  "w-full min-w-0 border-0 border-b border-[rgba(15,23,42,0.12)] bg-transparent py-[0.35rem] text-sm text-foreground outline-none transition-colors placeholder:text-muted/55 focus:border-[rgba(15,23,42,0.28)] focus:ring-0 dark:border-white/10 dark:focus:border-white/25";

const selectCell =
  "w-full min-w-0 cursor-pointer appearance-none border-0 border-b border-[rgba(15,23,42,0.12)] bg-transparent py-[0.35rem] pr-6 text-sm text-foreground outline-none transition-colors focus:border-[rgba(15,23,42,0.28)] focus:ring-0 dark:border-white/10 dark:focus:border-white/25";

function MeioSelect({ value, onChange }: { value: string; onChange: (v: PlanoFixosMesItem["meio"]) => void }) {
  return (
    <select
      className={selectCell}
      onChange={(e) => onChange(e.target.value ? (e.target.value as PlanoFixosMesItem["meio"]) : null)}
      value={value}
    >
      <option value="">—</option>
      <option value="pix">PIX</option>
      <option value="debito">Débito</option>
      <option value="credito">Crédito</option>
      <option value="dinheiro">Dinheiro</option>
      <option value="ted_doc">TED/DOC</option>
      <option value="transferencia">Transferência</option>
      <option value="outro">Outro</option>
    </select>
  );
}

export function PlanoFixosMesModal({
  gestaoId,
  initialItens,
  contas,
  categoriasDespesa,
}: {
  gestaoId: number;
  initialItens: PlanoFixosMesItem[];
  contas: ContaOpt[];
  categoriasDespesa: CatOpt[];
}) {
  const defaultContaId = useMemo(
    () => contas.find((c) => c.tipo === "corrente")?.id ?? contas[0]?.id ?? 0,
    [contas],
  );
  const defaultCatId = useMemo(() => categoriasDespesa[0]?.id ?? 0, [categoriasDespesa]);

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MacroRow[]>(() =>
    initialItens.length > 0 ? normalizeInitialRows(initialItens) : [],
  );
  const [selectedForLaunch, setSelectedForLaunch] = useState<Set<number>>(
    () => new Set(initialItens.map((_, index) => index)),
  );
  const [confirmLaunchOpen, setConfirmLaunchOpen] = useState(false);
  const [launchDate, setLaunchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const baseDisabled = !contas.length || !categoriasDespesa.length || !defaultContaId || !defaultCatId;

  const updateRow = (index: number, patch: Partial<MacroRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    if (baseDisabled) {
      return;
    }
    setRows((prev) => {
      const nextIndex = prev.length;
      setSelectedForLaunch((selected) => new Set([...selected, nextIndex]));
      return [...prev, defaultRow(defaultContaId, defaultCatId)];
    });
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setSelectedForLaunch((prev) => {
      const next = new Set<number>();
      Array.from(prev).forEach((itemIndex) => {
        if (itemIndex < index) {
          next.add(itemIndex);
        } else if (itemIndex > index) {
          next.add(itemIndex - 1);
        }
      });
      return next;
    });
  };

  const toggleLaunchRow = (index: number) => {
    setSelectedForLaunch((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const runSave = () => {
    const cleaned = cleanItensForSave(rows);
    startTransition(async () => {
      await savePlanoFixosMesAction({ gestaoId, itens: cleaned });
    });
  };

  const runGerar = () => {
    const cleaned = cleanItensForSave(rows);
    const selectedCleaned = cleaned.filter((_, index) => selectedForLaunch.has(index));
    startTransition(async () => {
      await gerarPrevistosPlanoFixosMesAction({
        gestaoId,
        anoMesDestino: launchDate.slice(0, 7),
        competenciaData: launchDate,
        itens: selectedCleaned.length > 0 ? selectedCleaned : [],
      });
    });
  };

  return (
    <>
      <button
        className="gastos-fixos-mes-card"
        disabled={baseDisabled}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="gastos-fixos-mes-card-icon" aria-hidden>
          <NotebookIcon />
        </span>
        <span className="gastos-fixos-mes-card-text">
          <span className="gastos-fixos-mes-card-title">Gastos fixos do mês</span>
          <span className="gastos-fixos-mes-card-hint">Modelo (igual lançamento, sem ir pro extrato até lançar)</span>
        </span>
      </button>

      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-0 py-0 sm:items-center sm:px-5 sm:py-8"
          role="dialog"
        >
          <div className="notebook-modal-sheet relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-black/[0.08] sm:rounded-2xl">
            <div aria-hidden className="notebook-modal-gutter" />

            <div className="notebook-modal-content flex min-h-0 flex-1 flex-col">
              <header className="shrink-0 border-b border-[rgba(15,23,42,0.1)] px-3 pb-3 pt-4 sm:px-4 sm:pb-4 sm:pt-5 dark:border-white/12">
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted">Modelo</p>
                    <h3 className="notebook-modal-title mt-1.5 text-[1.35rem] leading-tight text-foreground sm:text-[1.55rem]">
                      Gastos fixos
                    </h3>
                    <p className="mt-2 text-[13px] leading-snug text-muted sm:text-sm">
                      Sem mês nem dia aqui — só o que repete. Ao lançar, usa a <strong>data do clique</strong>.
                    </p>
                  </div>
                  <button
                    aria-label="Fechar modal"
                    className="notebook-modal-close shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium"
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    Fechar
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2 sm:px-2 sm:py-3">
                <div className="hidden gap-2 border-b border-dotted border-[rgba(15,23,42,0.12)] px-1 py-2 pl-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted sm:grid sm:grid-cols-[2rem_minmax(5rem,1.25fr)_minmax(4.5rem,0.75fr)_minmax(4.5rem,0.75fr)_minmax(3rem,0.55fr)_minmax(4.25rem,0.65fr)_1.5rem] sm:gap-x-2 dark:border-white/12">
                  <span>Lançar</span>
                  <span>Descrição</span>
                  <span>Conta</span>
                  <span>Categoria</span>
                  <span>Meio</span>
                  <span className="text-right">Valor</span>
                  <span />
                </div>

                {rows.length === 0 ? (
                  <p className="border-b border-dotted border-[rgba(15,23,42,0.1)] py-8 pl-1 text-sm text-muted dark:border-white/10">
                    Nenhuma linha. Use &quot;Adicionar linha&quot; no rodapé.
                  </p>
                ) : (
                  <ul className="divide-y divide-[rgba(15,23,42,0.08)] dark:divide-white/10">
                    {rows.map((row, index) => (
                      <li className="group/row transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04]" key={index}>
                        <div className="grid gap-2 py-2 pl-0.5 sm:grid-cols-[2rem_minmax(5rem,1.25fr)_minmax(4.5rem,0.75fr)_minmax(4.5rem,0.75fr)_minmax(3rem,0.55fr)_minmax(4.25rem,0.65fr)_1.5rem] sm:items-center sm:gap-x-2 sm:py-1.5">
                          <label className="flex items-center gap-2 text-[11px] text-muted sm:justify-center">
                            <input
                              checked={selectedForLaunch.has(index)}
                              className="h-4 w-4 accent-[var(--accent-strong)]"
                              onChange={() => toggleLaunchRow(index)}
                              type="checkbox"
                            />
                            <span className="sm:hidden">Lançar</span>
                          </label>
                          <div className="min-w-0">
                            <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted sm:hidden">
                              Descrição
                            </label>
                            <input
                              className={inputCell}
                              onChange={(e) => updateRow(index, { nome: e.target.value })}
                              placeholder="Descrição"
                              type="text"
                              value={row.nome}
                            />
                          </div>
                          <div className="min-w-0">
                            <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted sm:hidden">
                              Conta
                            </label>
                            <select
                              className={selectCell}
                              onChange={(e) => updateRow(index, { contaId: Number(e.target.value) })}
                              value={row.contaId}
                            >
                              {contas.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="min-w-0">
                            <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted sm:hidden">
                              Categoria
                            </label>
                            <select
                              className={selectCell}
                              onChange={(e) => updateRow(index, { categoriaId: Number(e.target.value) })}
                              value={row.categoriaId}
                            >
                              {categoriasDespesa.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="min-w-0">
                            <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted sm:hidden">
                              Meio
                            </label>
                            <MeioSelect onChange={(meio) => updateRow(index, { meio })} value={row.meio ?? ""} />
                          </div>
                          <div className="min-w-0">
                            <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted sm:hidden">
                              Valor
                            </label>
                            <MoneyInput
                              className={`${inputCell} text-right tabular-nums`}
                              defaultValue={String(row.valor)}
                              name={`valor-${index}`}
                              onValueChange={(v) => updateRow(index, { valor: Number(v) || 0 })}
                              placeholder="0,00"
                              required
                            />
                          </div>
                          <div className="flex justify-end sm:items-center sm:justify-center">
                            <button
                              aria-label={`Remover linha ${index + 1}`}
                              className="rounded px-1 py-0.5 text-[13px] text-muted opacity-75 transition-opacity hover:text-accent-strong hover:opacity-100"
                              onClick={() => removeRow(index)}
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <footer className="shrink-0 border-t border-[rgba(15,23,42,0.1)] bg-[rgba(255,255,255,0.22)] px-3 py-3 backdrop-blur-[2px] dark:border-white/12 dark:bg-black/15 sm:px-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    className="notebook-modal-btn-secondary rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50 sm:text-sm"
                    disabled={baseDisabled || pending}
                    onClick={addRow}
                    type="button"
                  >
                    Adicionar linha
                  </button>
                  <button
                    className="notebook-modal-btn-secondary rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50 sm:text-sm"
                    disabled={baseDisabled || pending}
                    onClick={runSave}
                    type="button"
                  >
                    Salvar modelo
                  </button>
                  <button
                    className="notebook-modal-btn-primary rounded-md px-3.5 py-2 text-xs font-semibold disabled:opacity-55 sm:text-sm"
                    disabled={baseDisabled || pending || selectedForLaunch.size === 0}
                    onClick={() => {
                      setLaunchDate(new Date().toISOString().slice(0, 10));
                      setConfirmLaunchOpen(true);
                    }}
                    type="button"
                  >
                    Lançar gastos fixos
                  </button>
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
                  Só entra no extrato depois de &quot;Lançar&quot;. Todos na <strong>data de hoje</strong>. Crédito no
                  cartão segue a fatura como nos outros lançamentos.
                </p>
              </footer>
            </div>

            {confirmLaunchOpen ? (
              <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/25 p-3 sm:items-center">
                <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-4 shadow-xl">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Confirmar lançamento</p>
                  <h4 className="mt-1 font-heading text-lg font-semibold text-foreground">
                    Lançar itens marcados em qual data?
                  </h4>
                  <input
                    className="mt-4 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
                    onChange={(e) => setLaunchDate(e.target.value)}
                    type="date"
                    value={launchDate}
                  />
                  <p className="mt-2 text-xs text-muted">
                    {selectedForLaunch.size} item(ns) marcado(s) serão criados como previstos nessa data.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      className="rounded-md border border-line px-3 py-2 text-sm font-medium"
                      onClick={() => setConfirmLaunchOpen(false)}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button
                      className="rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-white disabled:opacity-55"
                      disabled={pending || !launchDate}
                      onClick={runGerar}
                      type="button"
                    >
                      Confirmar lançamento
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
