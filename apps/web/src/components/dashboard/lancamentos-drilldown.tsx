"use client";

import { useEffect, useState } from "react";

import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/date";

export type DrilldownLancamentoItem = {
  id: number;
  conta_id: number;
  conta_destino_id?: number | null;
  categoria_id: number | null;
  tipo: string;
  status: string;
  meio: string | null;
  descricao: string;
  valor_total: string;
  competencia_data: string;
  fatura_competencia_data?: string | null;
  competencia_hora: string | null;
  vencimento_data: string | null;
  categoria_nome: string | null;
  conta_nome: string;
  conta_destino_nome?: string | null;
};

export type DrilldownGroup = {
  name: string;
  total: number;
  items: DrilldownLancamentoItem[];
  description?: string;
};

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function meioLabel(value: string | null) {
  if (value === "pix") return "Pix";
  if (value === "debito") return "Débito";
  if (value === "credito") return "Crédito";
  if (value === "dinheiro") return "Dinheiro";
  if (value === "transferencia") return "Transferência";
  if (value === "ted_doc") return "TED/DOC";
  return "Outro";
}

function signedValue(item: DrilldownLancamentoItem) {
  if (item.tipo === "receita") return Number(item.valor_total ?? 0);
  if (item.tipo === "despesa") return -Number(item.valor_total ?? 0);
  if (item.tipo === "transferencia") {
    return item.conta_destino_id === item.conta_id
      ? Number(item.valor_total ?? 0)
      : -Number(item.valor_total ?? 0);
  }
  return Number(item.valor_total ?? 0);
}

function tipoLabel(value: string) {
  if (value === "receita") return "Receita";
  if (value === "despesa") return "Despesa";
  if (value === "transferencia") return "Transferência";
  if (value === "ajuste") return "Ajuste";
  return value;
}

export function LancamentosDrilldown({
  groups,
  emptyText = "Sem lançamentos no recorte.",
  modalKicker,
}: {
  groups: DrilldownGroup[];
  emptyText?: string;
  modalKicker: string;
}) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const selectedGroup = groups.find((group) => group.name === selectedName) ?? null;
  const denominator = groups.reduce((sum, group) => sum + Math.max(0, group.total), 0);

  useEffect(() => {
    if (!selectedGroup) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedName(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedGroup]);

  return (
    <>
      <div className="rank-list">
        {groups.map((group) => {
          const width = denominator > 0 ? Math.min(100, (Math.max(0, group.total) / denominator) * 100) : 0;
          return (
            <button className="rank-row category-trigger" key={group.name} onClick={() => setSelectedName(group.name)} type="button">
              <div>
                <span>{group.name}</span>
                <strong>{money(group.total)}</strong>
              </div>
              <i style={{ width: `${width}%` }} />
            </button>
          );
        })}
        {groups.length === 0 ? <p className="muted">{emptyText}</p> : null}
      </div>

      {selectedGroup ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
        >
          <div className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-line bg-surface p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">{modalKicker}</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
                  {selectedGroup.name}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  {selectedGroup.items.length} lançamento(s), base {money(selectedGroup.total)}.
                  {selectedGroup.description ? ` ${selectedGroup.description}` : ""}
                </p>
              </div>
              <button
                aria-label="Fechar modal"
                className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-foreground"
                onClick={() => setSelectedName(null)}
                type="button"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-3 lg:hidden">
              {selectedGroup.items.map((item) => (
                <article className="rounded-[1rem] border border-line bg-background p-4" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.descricao}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatDateForDisplay(item.competencia_data)}
                        {formatTimeForDisplay(item.competencia_hora) ? ` · ${formatTimeForDisplay(item.competencia_hora)}` : ""} · {item.conta_nome}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {item.categoria_nome ?? "Sem categoria"} · {meioLabel(item.meio)}
                      </p>
                    </div>
                    <span className={signedValue(item) >= 0 ? "shrink-0 font-semibold text-success" : "shrink-0 font-semibold text-accent-strong"}>
                      {signedValue(item) >= 0 ? "+" : "-"}
                      {money(Math.abs(Number(item.valor_total ?? 0)))}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="pb-3 pr-4">Descrição</th>
                    <th className="pb-3 pr-4">Data</th>
                    <th className="pb-3 pr-4">Tipo</th>
                    <th className="pb-3 pr-4">Categoria</th>
                    <th className="pb-3 pr-4">Meio</th>
                    <th className="pb-3 pr-4">Origem</th>
                    <th className="pb-3">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGroup.items.map((item, index) => (
                    <tr
                      className={`border-t border-line transition ${
                        index % 2 === 0 ? "bg-background hover:bg-surface/70" : "bg-surface/60 hover:bg-surface/70"
                      }`}
                      key={`${item.id}-${index}`}
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{item.descricao}</p>
                      </td>
                      <td className="py-3 pr-4 text-muted">
                        {formatDateForDisplay(item.competencia_data)}
                        {formatTimeForDisplay(item.competencia_hora) ? (
                          <span className="block text-xs">{formatTimeForDisplay(item.competencia_hora)}</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">{tipoLabel(item.tipo)}</td>
                      <td className="py-3 pr-4">{item.categoria_nome ?? "Sem categoria"}</td>
                      <td className="py-3 pr-4">{meioLabel(item.meio)}</td>
                      <td className="py-3 pr-4">{item.conta_destino_nome ? `${item.conta_nome} -> ${item.conta_destino_nome}` : item.conta_nome}</td>
                      <td className={signedValue(item) >= 0 ? "py-3 font-semibold text-success" : "py-3 font-semibold text-accent-strong"}>
                        {signedValue(item) >= 0 ? "+" : "-"}
                        {money(Math.abs(Number(item.valor_total ?? 0)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
