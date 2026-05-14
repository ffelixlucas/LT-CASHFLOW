"use client";

import { useMemo, useState } from "react";

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
        <div aria-modal="true" className="category-modal-backdrop" role="dialog">
          <div className="category-modal">
            <div className="panel-head">
              <div>
                <p className="dashboard-kicker">Categoria</p>
                <h3>{selectedGroup.name}</h3>
                <p className="muted">
                  {selectedGroup.items.length} lançamento(s), total {money(selectedGroup.total)}. Se algo estiver errado, troque a categoria na linha.
                </p>
              </div>
              <button className="decision-button modal-close" onClick={() => setSelectedCategory(null)} type="button">
                Fechar
              </button>
            </div>

            <div className="category-modal-list">
              {selectedGroup.items.map((item) => (
                <form action={updateLancamentoAction} className="category-edit-row" key={item.id}>
                  <input name="gestaoId" type="hidden" value={gestaoId} />
                  <input name="lancamentoId" type="hidden" value={item.id} />
                  <input name="descricao" type="hidden" value={item.descricao} />
                  <input name="tipo" type="hidden" value={item.tipo} />
                  <input name="status" type="hidden" value={item.status} />
                  <input name="meio" type="hidden" value={item.meio ?? ""} />
                  <input name="contaId" type="hidden" value={item.conta_id} />
                  <input name="contaDestinoId" type="hidden" value={item.conta_destino_id ?? ""} />
                  <input name="valorTotal" type="hidden" value={item.valor_total} />
                  <input name="competenciaData" type="hidden" value={item.competencia_data} />
                  <input name="faturaCompetenciaData" type="hidden" value={item.fatura_competencia_data ?? ""} />
                  <input name="competenciaHora" type="hidden" value={item.competencia_hora ?? ""} />
                  <input name="vencimentoData" type="hidden" value={item.vencimento_data ?? ""} />

                  <div className="category-edit-main">
                    <strong>{item.descricao}</strong>
                    <span>
                      {formatDateForDisplay(item.competencia_data)}
                      {formatTimeForDisplay(item.competencia_hora) ? ` · ${formatTimeForDisplay(item.competencia_hora)}` : ""} · {item.conta_nome} · {meioLabel(item.meio)}
                    </span>
                  </div>
                  <b>{money(item.valor_total)}</b>
                  <select name="categoriaId" defaultValue={item.categoria_id ?? ""}>
                    <option value="">Sem categoria</option>
                    {expenseCategories.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Salvar</button>
                </form>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
