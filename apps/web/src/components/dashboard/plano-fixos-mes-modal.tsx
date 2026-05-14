"use client";

import type { PlanoFixosMesItem } from "@ltcashflow/validation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { gerarPrevistosPlanoFixosMesAction, savePlanoFixosMesAction } from "@/app/dashboard/actions";
import { DateInput } from "@/components/ui/date-input";
import { MoneyInput } from "@/components/ui/money-input";
import { buildMonthCalendarDate, formatDateForDisplay, normalizeDateInput } from "@/lib/date";

type ContaOpt = { id: number; nome: string; tipo: string };
type CatOpt = { id: number; nome: string };

/** Linha no modal: mesma informação do modelo + máscara de data enquanto digita. */
type MacroRow = PlanoFixosMesItem & { _dateDisplay?: string };

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

function normalizeInitialRows(itens: PlanoFixosMesItem[], mes: string): MacroRow[] {
  return cloneMacroRows(itens).map((item) => {
    const competencia =
      item.competenciaData && /^\d{4}-\d{2}-\d{2}$/.test(item.competenciaData)
        ? item.competenciaData
        : buildMonthCalendarDate(mes, item.dia);
    return {
      ...item,
      competenciaData: competencia,
      dia: Number(competencia.slice(8, 10)),
    };
  });
}

function defaultRow(contaId: number, categoriaId: number, mes: string): MacroRow {
  const competenciaData = buildMonthCalendarDate(mes, 10);
  return {
    nome: "",
    valor: 0.01,
    dia: 10,
    contaId,
    categoriaId,
    meio: null,
    competenciaData,
  };
}

function cleanItensForSave(rows: MacroRow[], mesDestino: string): PlanoFixosMesItem[] {
  return rows
    .map((row) => {
  const { _dateDisplay: _mask, ...rest } = row;
  void _mask;
      const raw =
        rest.competenciaData && /^\d{4}-\d{2}-\d{2}$/.test(rest.competenciaData)
          ? rest.competenciaData
          : buildMonthCalendarDate(mesDestino, rest.dia);
      const day = Math.min(31, Math.max(1, Number(raw.slice(8, 10)) || rest.dia));
      const competenciaData = buildMonthCalendarDate(mesDestino, day);
      return {
        ...rest,
        competenciaData,
        dia: day,
        nome: rest.nome.trim(),
        meio: rest.meio && String(rest.meio).length > 0 ? rest.meio : null,
      };
    })
    .filter((row) => row.nome.length > 0 && row.valor > 0 && row.dia >= 1 && row.dia <= 31);
}

export function PlanoFixosMesModal({
  gestaoId,
  defaultMesDestino,
  initialItens,
  contas,
  categoriasDespesa,
}: {
  gestaoId: number;
  defaultMesDestino: string;
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
  const [mesDestino, setMesDestino] = useState(defaultMesDestino);
  const [rows, setRows] = useState<MacroRow[]>(() =>
    initialItens.length > 0 ? normalizeInitialRows(initialItens, defaultMesDestino) : [],
  );
  const [pending, startTransition] = useTransition();

  const syncRowsToMes = (nextMes: string) => {
    setRows((prev) =>
      prev.map((r) => {
        const daySource = r.competenciaData ? Number(r.competenciaData.slice(8, 10)) : r.dia;
        const day = Math.min(Math.max(daySource || 1, 1), 31);
        const competenciaData = buildMonthCalendarDate(nextMes, day);
        return { ...r, competenciaData, dia: day, _dateDisplay: undefined };
      }),
    );
  };

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
    setRows((prev) => [...prev, defaultRow(defaultContaId, defaultCatId, mesDestino)]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const runSave = () => {
    const cleaned = cleanItensForSave(rows, mesDestino);
    startTransition(async () => {
      await savePlanoFixosMesAction({ gestaoId, itens: cleaned });
    });
  };

  const runGerar = () => {
    const cleaned = cleanItensForSave(rows, mesDestino);
    startTransition(async () => {
      await gerarPrevistosPlanoFixosMesAction({
        gestaoId,
        anoMesDestino: mesDestino,
        itens: cleaned.length > 0 ? cleaned : undefined,
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 py-0 sm:px-4 sm:py-8"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-line bg-surface p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Acao</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
                  Modelo de gastos fixos
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  Mesmo desenho do <strong>Novo lançamento</strong> do botão + : aqui é só rascunho. Nada vai para
                  extrato ou fatura até <strong>Lançar gastos fixos</strong> no mês certo.
                </p>
              </div>
              <button
                aria-label="Fechar modal"
                className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-foreground"
                onClick={() => setOpen(false)}
                type="button"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-3 rounded-2xl border border-line bg-background p-4 md:grid-cols-2">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted md:col-span-2">
                  Mês de destino ao lançar
                </label>
                <input
                  className="rounded-2xl border border-line bg-background px-4 py-3 md:col-span-2"
                  onChange={(e) => {
                    const next = e.target.value;
                    setMesDestino(next);
                    syncRowsToMes(next);
                  }}
                  type="month"
                  value={mesDestino}
                />
                <p className="text-xs leading-relaxed text-muted md:col-span-2">
                  Ao lançar, os previstos usam este mês na chave do sistema; em cada linha você define a data de
                  competência (como no lançamento normal).
                </p>
              </div>

              {rows.length === 0 ? (
                <p className="text-sm text-muted">
                  Nenhuma linha. Use &quot;Adicionar linha&quot; — os campos seguem o mesmo padrão visual do
                  lançamento rápido.
                </p>
              ) : (
                <div className="space-y-4">
                  {rows.map((row, index) => (
                    <div className="rounded-2xl border border-line bg-background p-4" key={`${index}-${row.contaId}`}>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        Linha {index + 1}
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          className="rounded-2xl border border-line bg-background px-4 py-3 md:col-span-2"
                          onChange={(e) => updateRow(index, { nome: e.target.value })}
                          placeholder="Descricao do lancamento"
                          type="text"
                          value={row.nome}
                        />
                        <select
                          className="rounded-2xl border border-line bg-background px-4 py-3"
                          onChange={(e) => updateRow(index, { contaId: Number(e.target.value) })}
                          value={row.contaId}
                        >
                          {contas.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-2xl border border-line bg-background px-4 py-3"
                          onChange={(e) => updateRow(index, { categoriaId: Number(e.target.value) })}
                          value={row.categoriaId}
                        >
                          {categoriasDespesa.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-2xl border border-line bg-background px-4 py-3"
                          onChange={(e) =>
                            updateRow(index, {
                              meio: e.target.value ? (e.target.value as PlanoFixosMesItem["meio"]) : null,
                            })
                          }
                          value={row.meio ?? ""}
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
                        <MoneyInput
                          className="rounded-2xl border border-line bg-background px-4 py-3"
                          defaultValue={String(row.valor)}
                          key={`valor-${index}-${row.valor}`}
                          name={`valor-${index}`}
                          onValueChange={(v) => updateRow(index, { valor: Number(v) || 0 })}
                          placeholder="R$ 0,00"
                          required
                        />
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-muted">
                            Competencia (data)
                          </label>
                          <DateInput
                            className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                            onValueChange={(masked) => {
                              const iso = normalizeDateInput(masked);
                              updateRow(index, {
                                _dateDisplay: masked,
                                ...(iso
                                  ? {
                                      competenciaData: iso,
                                      dia: Number(iso.slice(8, 10)),
                                    }
                                  : {}),
                              });
                            }}
                            value={row._dateDisplay ?? formatDateForDisplay(row.competenciaData)}
                          />
                        </div>
                        <div className="flex justify-end md:col-span-2">
                          <button
                            className="text-sm text-muted underline decoration-dotted"
                            onClick={() => removeRow(index)}
                            type="button"
                          >
                            Remover linha
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-line bg-background px-4 py-2.5 text-sm font-medium text-foreground"
                  disabled={baseDisabled || pending}
                  onClick={addRow}
                  type="button"
                >
                  Adicionar linha
                </button>
                <button
                  className="rounded-full border border-line bg-background px-4 py-2.5 text-sm font-medium text-foreground"
                  disabled={baseDisabled || pending}
                  onClick={runSave}
                  type="button"
                >
                  Salvar modelo
                </button>
                <button
                  className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={baseDisabled || pending}
                  onClick={runGerar}
                  type="button"
                >
                  Lançar gastos fixos
                </button>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                Só entra no extrato depois de &quot;Lançar&quot;. Despesas em <strong>crédito</strong> no cartão
                obedecem à fatura como em qualquer lançamento.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
