"use client";

import { useEffect, useMemo, useState } from "react";

import { updateLancamentoAction } from "@/app/dashboard/actions";
import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/date";

type CategoriaOption = {
  id: number;
  nome: string;
  natureza?: string;
};

type LancamentoCategoriaItem = {
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
  return "Outro";
}

export function CategoryDrilldown({
  gestaoId,
  categorias,
  lancamentos,
}: {
  gestaoId: number;
  categorias: CategoriaOption[];
  lancamentos: LancamentoCategoriaItem[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const expenseCategories = categorias.filter(
    (categoria) => categoria.natureza === "despesa" || categoria.natureza === "ambos",
  );

  const groups = useMemo(() => {
    const map = new Map<string, { total: number; items: LancamentoCategoriaItem[] }>();

    for (const item of lancamentos) {
      const key = item.categoria_nome ?? "Sem categoria";
      const current = map.get(key) ?? { total: 0, items: [] };
      current.total += Number(item.valor_total ?? 0);
      current.items.push(item);
      map.set(key, current);
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.total - a.total);
  }, [lancamentos]);

  const selectedGroup = groups.find((group) => group.name === selectedCategory) ?? null;
  const total = groups.reduce((sum, group) => sum + group.total, 0);

  useEffect(() => {
    if (!selectedGroup) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedCategory(null);
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
        {groups.slice(0, 6).map((group) => {
          const width = total > 0 ? Math.min(100, (group.total / total) * 100) : 0;
          return (
            <button className="rank-row category-trigger" key={group.name} onClick={() => setSelectedCategory(group.name)} type="button">
              <div>
                <span>{group.name}</span>
                <strong>{money(group.total)}</strong>
              </div>
              <i style={{ width: `${width}%` }} />
            </button>
          );
        })}
        {groups.length === 0 ? <p className="muted">Sem despesas no recorte.</p> : null}
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
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Categoria</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
                  {selectedGroup.name}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  {selectedGroup.items.length} lançamento(s), total {money(selectedGroup.total)}. Se algo estiver errado, ajuste a categoria na linha.
                </p>
              </div>
              <button
                aria-label="Fechar modal"
                className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-foreground"
                onClick={() => setSelectedCategory(null)}
                type="button"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-3 lg:hidden">
              {selectedGroup.items.map((item) => {
                const formId = `category-review-mobile-${item.id}`;
                return (
                  <article className="rounded-[1rem] border border-line bg-background p-4" key={item.id}>
                    <CategoryEditHiddenFields formId={formId} gestaoId={gestaoId} item={item} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{item.descricao}</p>
                        <p className="mt-1 text-xs text-muted">
                          {formatDateForDisplay(item.competencia_data)}
                          {formatTimeForDisplay(item.competencia_hora) ? ` · ${formatTimeForDisplay(item.competencia_hora)}` : ""} · {item.conta_nome}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-accent-strong">{money(item.valor_total)}</span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <select
                        className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm"
                        defaultValue={item.categoria_id ?? ""}
                        form={formId}
                        name="categoriaId"
                      >
                        <option value="">Sem categoria</option>
                        {expenseCategories.map((categoria) => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-white"
                        form={formId}
                        type="submit"
                      >
                        Salvar
                      </button>
                    </div>
                    <form action={updateLancamentoAction as (formData: FormData) => Promise<void>} id={formId} />
                  </article>
                );
              })}
            </div>

            <div className="mt-6 hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="pb-3 pr-4">Descrição</th>
                    <th className="pb-3 pr-4">Data</th>
                    <th className="pb-3 pr-4">Meio</th>
                    <th className="pb-3 pr-4">Origem</th>
                    <th className="pb-3 pr-4">Categoria</th>
                    <th className="pb-3">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGroup.items.map((item, index) => {
                    const formId = `category-review-${item.id}`;
                    return (
                      <tr
                        className={`border-t border-line transition ${
                          index % 2 === 0 ? "bg-background hover:bg-surface/70" : "bg-surface/60 hover:bg-surface/70"
                        }`}
                        key={item.id}
                      >
                        <td className="py-3 pr-4">
                          <CategoryEditHiddenFields formId={formId} gestaoId={gestaoId} item={item} />
                          <p className="font-medium text-foreground">{item.descricao}</p>
                        </td>
                        <td className="py-3 pr-4 text-muted">
                          {formatDateForDisplay(item.competencia_data)}
                          {formatTimeForDisplay(item.competencia_hora) ? (
                            <span className="block text-xs">{formatTimeForDisplay(item.competencia_hora)}</span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4">{meioLabel(item.meio)}</td>
                        <td className="py-3 pr-4">{item.conta_nome}</td>
                        <td className="py-3 pr-4">
                          <div className="flex min-w-[260px] items-center gap-2">
                            <select
                              className="min-h-10 flex-1 rounded-2xl border border-line bg-background px-3 text-sm"
                              defaultValue={item.categoria_id ?? ""}
                              form={formId}
                              name="categoriaId"
                            >
                              <option value="">Sem categoria</option>
                              {expenseCategories.map((categoria) => (
                                <option key={categoria.id} value={categoria.id}>
                                  {categoria.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-white"
                              form={formId}
                              type="submit"
                            >
                              Salvar
                            </button>
                          </div>
                          <form action={updateLancamentoAction as (formData: FormData) => Promise<void>} id={formId} />
                        </td>
                        <td className="py-3 font-semibold text-accent-strong">{money(item.valor_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CategoryEditHiddenFields({
  formId,
  gestaoId,
  item,
}: {
  formId: string;
  gestaoId: number;
  item: LancamentoCategoriaItem;
}) {
  return (
    <>
      <input form={formId} name="gestaoId" type="hidden" value={gestaoId} />
      <input form={formId} name="lancamentoId" type="hidden" value={item.id} />
      <input form={formId} name="descricao" type="hidden" value={item.descricao} />
      <input form={formId} name="tipo" type="hidden" value={item.tipo} />
      <input form={formId} name="status" type="hidden" value={item.status} />
      <input form={formId} name="meio" type="hidden" value={item.meio ?? ""} />
      <input form={formId} name="contaId" type="hidden" value={item.conta_id} />
      <input form={formId} name="contaDestinoId" type="hidden" value={item.conta_destino_id ?? ""} />
      <input form={formId} name="valorTotal" type="hidden" value={item.valor_total} />
      <input form={formId} name="competenciaData" type="hidden" value={item.competencia_data} />
      <input form={formId} name="faturaCompetenciaData" type="hidden" value={item.fatura_competencia_data ?? ""} />
      <input form={formId} name="competenciaHora" type="hidden" value={item.competencia_hora ?? ""} />
      <input form={formId} name="vencimentoData" type="hidden" value={item.vencimento_data ?? ""} />
    </>
  );
}
