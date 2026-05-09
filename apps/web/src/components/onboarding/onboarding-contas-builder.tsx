"use client";

import { useState } from "react";

type ContaRow = {
  id: string;
  nome: string;
  tipo: "carteira" | "corrente" | "poupanca" | "cartao_credito" | "investimento" | "caixa" | "outro";
  instituicao: string;
};

function newRow(id: string): ContaRow {
  return {
    id,
    nome: "",
    tipo: "corrente",
    instituicao: "",
  };
}

function nextId() {
  return `conta-${Math.random().toString(36).slice(2, 10)}`;
}

export function OnboardingContasBuilder() {
  const [rows, setRows] = useState<ContaRow[]>(() => [newRow(nextId())]);

  const canRemove = rows.length > 1;

  return (
    <section className="space-y-2.5 rounded-[1.25rem] border border-line bg-background p-3 sm:space-y-4 sm:p-4">
      <div className="space-y-2.5 sm:space-y-3">
        {rows.map((row, index) => (
          <article key={row.id} className="rounded-[0.9rem] border border-line bg-surface p-2.5 sm:rounded-[1rem] sm:p-4">
            <div className="flex items-center justify-end gap-3">
              {canRemove ? (
                <button
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
                  onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                  type="button"
                >
                  Remover
                </button>
              ) : null}
            </div>

            <div className="mt-2.5 grid gap-2.5 sm:mt-3 sm:gap-3 md:grid-cols-2">
              <input name="contaNome" type="hidden" value={row.nome} readOnly />
              <input name="contaTipo" type="hidden" value={row.tipo} readOnly />
              <input name="contaInstituicao" type="hidden" value={row.instituicao} readOnly />

              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Nome</label>
                <input
                  className="w-full rounded-2xl border border-line bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted/70 sm:px-4 sm:py-3"
                  onChange={(event) => {
                    const value = event.target.value;
                    setRows((current) =>
                      current.map((item) => (item.id === row.id ? { ...item, nome: value } : item)),
                    );
                  }}
                  placeholder="Ex: Banco Inter Lucas"
                  value={row.nome}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Tipo</label>
                <select
                  className="w-full rounded-2xl border border-line bg-background px-3 py-2.5 text-sm outline-none sm:px-4 sm:py-3"
                  onChange={(event) => {
                    const value = event.target.value as ContaRow["tipo"];
                    setRows((current) =>
                      current.map((item) => (item.id === row.id ? { ...item, tipo: value } : item)),
                    );
                  }}
                  value={row.tipo}
                >
                  <option value="corrente">Conta corrente</option>
                  <option value="cartao_credito">Cartão de crédito</option>
                  <option value="poupanca">Poupança</option>
                  <option value="investimento">Investimento</option>
                  <option value="carteira">Carteira</option>
                  <option value="caixa">Caixa</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full border border-line bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm"
          onClick={() => setRows((current) => [...current, newRow(nextId())])}
          type="button"
        >
          + Conta
        </button>
      </div>
    </section>
  );
}
