"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type Grupo = "entradas" | "debito_pix" | "cartao" | "todos";

export type SemanaConferenciaItem = {
  grupo: "entradas" | "debito_pix" | "cartao";
  id: number;
  data: string;
  hora: string | null;
  descricao: string;
  valor: number;
  tipo: string;
  meio: string | null;
  conta_nome: string;
  conta_tipo: string;
  categoria_nome: string | null;
};

type SemanaConferenciaModalProps = {
  itens: SemanaConferenciaItem[];
  initialGrupo: Grupo;
  buttonClassName?: string;
  children: ReactNode;
};

const labels: Record<Grupo, string> = {
  entradas: "Entradas",
  debito_pix: "Débito / Pix",
  cartao: "Cartão",
  todos: "Tudo",
};

function money(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${iso}T12:00:00`));
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

function totalGrupo(itens: SemanaConferenciaItem[], grupo: Grupo) {
  if (grupo === "todos") {
    return itens.reduce((sum, item) => {
      if (item.grupo === "entradas") return sum + item.valor;
      return sum - item.valor;
    }, 0);
  }

  return itens
    .filter((item) => item.grupo === grupo)
    .reduce((sum, item) => sum + item.valor, 0);
}

export function SemanaConferenciaModal({
  itens,
  initialGrupo,
  buttonClassName,
  children,
}: SemanaConferenciaModalProps) {
  const [open, setOpen] = useState(false);
  const [grupo, setGrupo] = useState<Grupo>(initialGrupo);

  const filtered = useMemo(
    () => (grupo === "todos" ? itens : itens.filter((item) => item.grupo === grupo)),
    [grupo, itens],
  );

  function openModal() {
    setGrupo(initialGrupo);
    setOpen(true);
  }

  return (
    <>
      <button className={buttonClassName} onClick={openModal} type="button">
        {children}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-line bg-surface p-5 shadow-2xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Conferência da semana</p>
                <h3 className="mt-2 font-heading text-2xl font-semibold">{labels[grupo]}</h3>
                <p className="mt-1 text-sm text-muted">
                  Esses são os lançamentos usados nas somas do Dia a dia.
                </p>
              </div>
              <button
                className="rounded-full border border-line px-3 py-2 text-sm font-semibold"
                onClick={() => setOpen(false)}
                type="button"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["todos", "entradas", "debito_pix", "cartao"] as Grupo[]).map((item) => (
                <button
                  className={`rounded-full border px-3 py-2 text-sm ${
                    grupo === item ? "border-accent bg-accent text-white" : "border-line bg-background"
                  }`}
                  key={item}
                  onClick={() => setGrupo(item)}
                  type="button"
                >
                  {labels[item]} · {money(totalGrupo(itens, item))}
                </button>
              ))}
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="px-2 py-2 !text-left font-medium">Data</th>
                    <th className="px-2 py-2 !text-left font-medium">Descrição</th>
                    <th className="px-2 py-2 !text-left font-medium">Grupo</th>
                    <th className="px-2 py-2 !text-left font-medium">Conta</th>
                    <th className="px-2 py-2 !text-left font-medium">Categoria</th>
                    <th className="px-2 py-2 !text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-2 py-5 text-center text-muted" colSpan={6}>
                        Nenhum lançamento nesse grupo.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr className="border-b border-line/70" key={`${item.grupo}-${item.id}`}>
                        <td className="px-2 py-2 whitespace-nowrap">
                          {formatDate(item.data)}
                          {item.hora ? <span className="text-muted"> · {item.hora}</span> : null}
                        </td>
                        <td className="px-2 py-2">
                          <strong className="font-medium">{item.descricao}</strong>
                          <span className="mt-0.5 block text-xs text-muted">#{item.id} · {meioLabel(item.meio)}</span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">{labels[item.grupo]}</td>
                        <td className="px-2 py-2">{item.conta_nome}</td>
                        <td className="px-2 py-2">{item.categoria_nome ?? "Sem categoria"}</td>
                        <td
                          className={`px-2 py-2 text-right font-medium ${
                            item.grupo === "entradas" ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {item.grupo === "entradas" ? "+" : "-"}
                          {money(item.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
