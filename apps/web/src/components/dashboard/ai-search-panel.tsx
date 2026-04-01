"use client";

import { useState } from "react";

type Result = {
  id: number;
  tipo: string;
  status: string;
  descricao: string;
  valor_total: string;
  competencia_data: string;
  categoria_nome: string | null;
  conta_nome: string;
};

type Filters = {
  tipo?: string;
  minValor?: number;
  maxValor?: number;
  dateFrom?: string;
  dateTo?: string;
  motivo: string;
};

type SearchPlan = {
  intent: string;
  filters: Filters;
  answerHint: string;
};

function money(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function providerLabel(provider: string | null) {
  if (provider === "groq") return "Groq";
  if (provider === "openai") return "OpenAI";
  return "Parser local";
}

export function AiSearchPanel({ gestaoId }: { gestaoId: number }) {
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [plan, setPlan] = useState<SearchPlan | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gestaoId, prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel executar a busca.");
      }

      setResults(data.results);
      setPlan(data.plan);
      setAnswer(data.answer);
      setProvider(data.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha inesperada.");
      setResults([]);
      setPlan(null);
      setAnswer(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-line bg-surface p-6">
      <p className="text-xs tracking-[0.18em] text-muted uppercase">IA para busca</p>
      <p className="mt-3 text-sm leading-7 text-muted">
        Exemplos:{" "}
        <span className="font-mono">
          qual foi o ultimo lancamento? / maior gasto do mes / quanto gastei com mercado?
        </span>
      </p>

      <textarea
        className="mt-4 min-h-24 w-full rounded-2xl border border-line bg-background px-4 py-3 outline-none"
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Descreva o que voce quer encontrar..."
        value={prompt}
      />

      <button
        className="mt-4 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        disabled={!prompt.trim() || loading}
        onClick={handleSearch}
        type="button"
      >
        {loading ? "Buscando..." : "Buscar com IA"}
      </button>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      {plan ? (
        <div className="mt-6 rounded-[1.5rem] bg-background p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-heading text-2xl font-semibold">Assistente interpretou</h3>
            <span className="rounded-full bg-surface px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted">
              {providerLabel(provider)}
            </span>
          </div>
          {answer ? <p className="mt-3 text-base leading-8">{answer}</p> : null}
          <p className="mt-3 text-sm leading-7 text-muted">{plan.filters.motivo}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-line px-3 py-1 text-xs">
              intencao: {plan.intent}
            </span>
            {plan.filters.tipo ? (
              <span className="rounded-full border border-line px-3 py-1 text-xs">
                {plan.filters.tipo}
              </span>
            ) : null}
            {plan.filters.minValor ? (
              <span className="rounded-full border border-line px-3 py-1 text-xs">
                Min {money(String(plan.filters.minValor))}
              </span>
            ) : null}
            {plan.filters.maxValor ? (
              <span className="rounded-full border border-line px-3 py-1 text-xs">
                Max {money(String(plan.filters.maxValor))}
              </span>
            ) : null}
            {plan.filters.dateFrom ? (
              <span className="rounded-full border border-line px-3 py-1 text-xs">
                De {plan.filters.dateFrom}
              </span>
            ) : null}
            {plan.filters.dateTo ? (
              <span className="rounded-full border border-line px-3 py-1 text-xs">
                Ate {plan.filters.dateTo}
              </span>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            {results.length > 0 ? (
              results.map((item) => (
                <article className="rounded-2xl bg-surface px-4 py-3" key={item.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{item.descricao}</p>
                      <p className="text-sm text-muted">
                        {item.competencia_data} · {item.conta_nome} · {item.categoria_nome ?? "-"}
                      </p>
                    </div>
                    <p className="font-semibold">{money(item.valor_total)}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted">Nenhum lancamento encontrado com esses filtros.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
