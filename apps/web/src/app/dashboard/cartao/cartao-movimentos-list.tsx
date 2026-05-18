"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import {
  type LancamentoInlineResult,
  updateLancamentoAction,
} from "@/app/dashboard/actions";

type ContaOption = {
  id: number;
  nome: string;
  tipo?: string;
};

type CategoriaOption = {
  id: number;
  nome: string;
};

export type CartaoMovimentoItem = {
  tipo: "compra" | "pagamento";
  id: number;
  conta_id: number;
  categoria_id: number | null;
  status: string;
  meio: string | null;
  competencia_data: string;
  competencia_hora: string | null;
  fatura_competencia_data: string | null;
  vencimento_data: string | null;
  descricao: string | null;
  categoria_nome: string;
  conta_nome: string;
  valor_total: number;
};

type CartaoMovimentosListProps = {
  gestaoId: number;
  movimentos: CartaoMovimentoItem[];
  contas: ContaOption[];
  categorias: CategoriaOption[];
  paginaAtual: number;
  totalPaginas: number;
  totalMovimentos: number;
  hrefAnterior?: string;
  hrefProxima?: string;
};

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function meioLabel(value: string | null) {
  if (value === "pix") return "PIX";
  if (value === "debito") return "Débito";
  if (value === "credito") return "Crédito";
  if (value === "dinheiro") return "Dinheiro";
  if (value === "boleto") return "Boleto";
  if (value === "ted_doc") return "TED/DOC";
  if (value === "transferencia") return "Transferência";
  if (value === "outro") return "Outro";
  return "Não informado";
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

function agruparMovPorData(movs: CartaoMovimentoItem[]): [string, CartaoMovimentoItem[]][] {
  const map = new Map<string, CartaoMovimentoItem[]>();
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
    ] as [string, CartaoMovimentoItem[]])
    .sort(([a], [b]) => b.localeCompare(a));
}

export function CartaoMovimentosList({
  gestaoId,
  movimentos,
  contas,
  categorias,
  paginaAtual,
  totalPaginas,
  totalMovimentos,
  hrefAnterior,
  hrefProxima,
}: CartaoMovimentosListProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMovimento = useMemo(
    () => movimentos.find((movimento) => movimento.id === selectedId) ?? null,
    [movimentos, selectedId],
  );
  const grupos = useMemo(() => agruparMovPorData(movimentos), [movimentos]);
  const defaultCategoriaId = selectedMovimento?.categoria_id ?? categorias[0]?.id ?? "";

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutating(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("inline", "1");

    try {
      const result = (await updateLancamentoAction(formData)) as LancamentoInlineResult | void;
      if (result && !result.ok) {
        setError(result.error);
        return;
      }

      setSelectedId(null);
      router.refresh();
    } finally {
      setMutating(false);
    }
  }

  return (
    <>
      <div className="activity-list">
        {grupos.map(([dia, lista]) => (
          <div className="card-statement-day" key={dia}>
            <p className="card-statement-date">{formatListaDia(dia)}</p>
            <div>
              {lista.map((m) => {
                const texto =
                  (m.descricao && m.descricao.trim()) ||
                  `${m.tipo === "compra" ? "Compra" : "Pagamento"} #${m.id}`;
                const extra = [
                  m.categoria_nome,
                  m.conta_nome,
                  meioLabel(m.meio),
                ].filter(Boolean).join(" · ");
                const ehCompra = m.tipo === "compra";

                return (
                  <button
                    className="activity-row w-full text-left"
                    key={`${m.tipo}-${m.id}`}
                    onClick={() => setSelectedId(m.id)}
                    title="Editar lançamento"
                    type="button"
                  >
                    <div>
                      <strong>{texto}</strong>
                      {extra.trim() !== "" ? <span>{extra}</span> : null}
                    </div>
                    <b className={ehCompra ? "bad" : "good"}>
                      {ehCompra ? "-" : "+"}
                      {money(m.valor_total)}
                    </b>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-pagination">
        <span>
          Página {paginaAtual} de {totalPaginas} · {totalMovimentos} movimento(s)
        </span>
        <div className="period-chips">
          {hrefAnterior ? (
            <Link className="period-chip" href={hrefAnterior}>
              ← Anterior
            </Link>
          ) : null}
          {hrefProxima ? (
            <Link className="period-chip" href={hrefProxima}>
              Próxima →
            </Link>
          ) : null}
        </div>
      </div>

      {selectedMovimento ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Editar lançamento</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold">
                  {selectedMovimento.descricao ?? `Lançamento #${selectedMovimento.id}`}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Para tirar uma compra da fatura, altere a conta para uma conta corrente/carteira,
                  mude o meio para Débito e deixe a competência da fatura vazia.
                </p>
              </div>
              <button
                className="rounded-full border border-line px-3 py-2 text-sm font-semibold"
                onClick={() => setSelectedId(null)}
                type="button"
              >
                Fechar
              </button>
            </div>

            {error ? <p className="mt-4 rounded-2xl border border-line bg-background p-3 text-sm text-accent-strong">{error}</p> : null}

            <form className="mt-6 grid gap-3 lg:grid-cols-2" onSubmit={handleUpdateSubmit}>
              <input name="inline" type="hidden" value="1" />
              <input name="gestaoId" type="hidden" value={gestaoId} />
              <input name="lancamentoId" type="hidden" value={selectedMovimento.id} />
              <input name="tipo" type="hidden" value="despesa" />

              <input
                className="rounded-2xl border border-line bg-background px-4 py-3 lg:col-span-2"
                defaultValue={selectedMovimento.descricao ?? ""}
                name="descricao"
                placeholder="Descrição"
                required
              />

              <select
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedMovimento.status}
                name="status"
              >
                <option value="liquidado">Liquidado</option>
                <option value="pendente">Pendente</option>
                <option value="previsto">Previsto</option>
              </select>

              <select
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedMovimento.meio ?? ""}
                name="meio"
              >
                <option value="">Meio não informado</option>
                <option value="pix">PIX</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="boleto">Boleto</option>
                <option value="ted_doc">TED/DOC</option>
                <option value="transferencia">Transferência</option>
                <option value="outro">Outro</option>
              </select>

              <select
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={String(selectedMovimento.conta_id)}
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
                defaultValue={String(defaultCategoriaId)}
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
                defaultValue={String(selectedMovimento.valor_total)}
                min="0.01"
                name="valorTotal"
                placeholder="Valor"
                step="0.01"
                type="number"
                required
              />

              <input
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedMovimento.competencia_data}
                name="competenciaData"
                type="date"
                required
              />

              <input
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedMovimento.fatura_competencia_data ?? ""}
                name="faturaCompetenciaData"
                type="date"
              />

              <input
                className="rounded-2xl border border-line bg-background px-4 py-3"
                defaultValue={selectedMovimento.competencia_hora ?? ""}
                name="competenciaHora"
                type="time"
              />

              <input
                className="rounded-2xl border border-line bg-background px-4 py-3 lg:col-span-2"
                defaultValue={selectedMovimento.vencimento_data ?? ""}
                name="vencimentoData"
                type="date"
              />

              <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
                <button
                  className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-foreground disabled:opacity-60"
                  disabled={mutating}
                  onClick={() => setSelectedId(null)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={mutating}
                  type="submit"
                >
                  {mutating ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
