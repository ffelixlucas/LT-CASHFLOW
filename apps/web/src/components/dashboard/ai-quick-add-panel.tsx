"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SelectOption = {
  id: number;
  nome: string;
};

type Suggestion = {
  descricao: string;
  tipo: "receita" | "despesa" | "ajuste";
  status: "previsto" | "pendente" | "liquidado";
  valorTotal: number;
  competenciaData: string;
  competenciaHora?: string;
  vencimentoData?: string;
  contaId: number;
  categoriaId: number;
  confianca: number;
  motivo: string;
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function providerLabel(provider: string | null) {
  if (provider === "groq") return "Groq";
  if (provider === "openai") return "OpenAI";
  return "Parser local";
}

export function AiQuickAddPanel({
  gestaoId,
  contas,
  categorias,
}: {
  gestaoId: number;
  contas: SelectOption[];
  categorias: SelectOption[];
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyzePrompt() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gestaoId, prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel interpretar o comando.");
      }

      setSuggestion(data.suggestion);
      setProvider(data.provider);
    } catch (err) {
      setSuggestion(null);
      setError(err instanceof Error ? err.message : "Falha inesperada.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSuggestion() {
    if (!suggestion) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/quick-add/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gestaoId, suggestion }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel salvar o lancamento.");
      }

      setPrompt("");
      setSuggestion(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha inesperada.");
    } finally {
      setSaving(false);
    }
  }

  const contaNome = contas.find((item) => item.id === suggestion?.contaId)?.nome ?? "-";
  const categoriaNome = categorias.find((item) => item.id === suggestion?.categoriaId)?.nome ?? "-";

  return (
    <section className="rounded-[2rem] border border-line bg-surface p-6">
      <p className="text-xs tracking-[0.18em] text-muted uppercase">IA para lancamento rapido</p>
      <p className="mt-3 text-sm leading-7 text-muted">
        Digite como falaria naturalmente. Exemplo: <span className="font-mono">mercado 182,90 hoje no nubank</span>
      </p>

      <textarea
        className="mt-4 min-h-28 w-full rounded-2xl border border-line bg-background px-4 py-3 outline-none"
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Descreva o lancamento..."
        value={prompt}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          disabled={!prompt.trim() || loading}
          onClick={analyzePrompt}
          type="button"
        >
          {loading ? "Interpretando..." : "Interpretar com IA"}
        </button>

        {suggestion ? (
          <button
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving}
            onClick={saveSuggestion}
            type="button"
          >
            {saving ? "Salvando..." : "Confirmar e salvar"}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      {suggestion ? (
        <div className="mt-6 rounded-[1.5rem] bg-background p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-heading text-2xl font-semibold">Rascunho interpretado</h3>
            <span className="rounded-full bg-surface px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted">
              {providerLabel(provider)}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Descricao</p>
              <p className="mt-2">{suggestion.descricao}</p>
            </div>
            <div className="rounded-2xl bg-surface px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Valor</p>
              <p className="mt-2">{money(suggestion.valorTotal)}</p>
            </div>
            <div className="rounded-2xl bg-surface px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Conta</p>
              <p className="mt-2">{contaNome}</p>
            </div>
            <div className="rounded-2xl bg-surface px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Categoria</p>
              <p className="mt-2">{categoriaNome}</p>
            </div>
            <div className="rounded-2xl bg-surface px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Data</p>
              <p className="mt-2">
                {suggestion.competenciaData}
                {suggestion.competenciaHora ? ` · ${suggestion.competenciaHora}` : ""}
              </p>
            </div>
            <div className="rounded-2xl bg-surface px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Confianca</p>
              <p className="mt-2">{Math.round(suggestion.confianca * 100)}%</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted">{suggestion.motivo}</p>
        </div>
      ) : null}
    </section>
  );
}
