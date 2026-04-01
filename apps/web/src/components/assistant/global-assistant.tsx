"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { DateInput } from "@/components/ui/date-input";

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type GestaoOption = {
  id: number;
  nome: string;
  contas: Array<{
    id: number;
    nome: string;
  }>;
  categorias: Array<{
    id: number;
    nome: string;
  }>;
};

type SearchResult = {
  id: number;
  tipo: string;
  status: string;
  descricao: string;
  valor_total: string;
  competencia_data: string;
  categoria_nome: string | null;
  conta_nome: string;
};

type QuickAddSuggestion = {
  descricao: string;
  tipo: "receita" | "despesa" | "ajuste";
  status: "previsto" | "pendente" | "liquidado";
  meio?: "pix" | "debito" | "credito" | "dinheiro" | "boleto" | "ted_doc" | "transferencia" | "outro";
  valorTotal: number;
  competenciaData: string;
  competenciaHora?: string;
  vencimentoData?: string;
  contaId: number;
  categoriaId: number;
  confianca: number;
  motivo: string;
};

type QuickAddBatchSuggestion = {
  items: QuickAddSuggestion[];
  quantidade: number;
  valorTotalLote: number;
  confianca: number;
  motivo: string;
};

type CreateAccountSuggestion = {
  nome: string;
  tipo: "carteira" | "corrente" | "poupanca" | "cartao_credito" | "investimento" | "caixa" | "outro";
  instituicao?: string;
  saldoInicial: number;
  confianca: number;
  motivo: string;
};

type RenameAccountSuggestion = {
  contaId: number;
  nomeAtual: string;
  novoNome: string;
  confianca: number;
  motivo: string;
};

type KeepAccountsSuggestion = {
  manterContaIds: number[];
  manterNomes: string[];
  desativarContaIds: number[];
  desativarNomes: string[];
  confianca: number;
  motivo: string;
};

type UpdateLancamentosSuggestion = {
  lancamentoIds: number[];
  quantidade: number;
  meio: "pix" | "debito" | "credito" | "dinheiro" | "boleto" | "ted_doc" | "transferencia" | "outro";
  filtroResumo: string;
  confianca: number;
  motivo: string;
};

type UpdateLancamentosDataSuggestion = {
  lancamentoIds: number[];
  quantidade: number;
  competenciaData: string;
  resumo: string;
  confianca: number;
  motivo: string;
};

type DeleteLancamentosSuggestion = {
  lancamentoIds: number[];
  quantidade: number;
  resumo: string;
  confianca: number;
  motivo: string;
};

type SearchPlan = {
  intent: "search" | "latest_transaction" | "largest_expense" | "largest_income" | "summary";
  filters: {
    text?: string;
    tipo?: "receita" | "despesa" | "ajuste";
    contaId?: number;
    categoriaId?: number;
    minValor?: number;
    maxValor?: number;
    dateFrom?: string;
    dateTo?: string;
    motivo: string;
  };
  answerHint: string;
};

type AssistantMessage =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      text: string;
      provider: string;
      kind:
        | "search"
        | "quick_add"
        | "quick_add_batch"
        | "account_create"
        | "account_rename"
        | "account_keep"
        | "transactions_update"
        | "transactions_date_update"
        | "transactions_delete"
        | "info";
      results?: SearchResult[];
      suggestion?:
        | QuickAddSuggestion
        | QuickAddBatchSuggestion
        | CreateAccountSuggestion
        | RenameAccountSuggestion
        | KeepAccountsSuggestion
        | UpdateLancamentosSuggestion
        | UpdateLancamentosDataSuggestion
        | DeleteLancamentosSuggestion;
      plan?: SearchPlan;
    };

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function money(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function providerLabel(provider: string) {
  if (provider === "groq") return "Groq";
  if (provider === "openai") return "OpenAI";
  return "Assistente local";
}

function meioLabel(meio: UpdateLancamentosSuggestion["meio"]) {
  if (meio === "credito") return "cartao de credito";
  if (meio === "debito") return "cartao de debito";
  if (meio === "ted_doc") return "TED ou DOC";
  return meio;
}

const HISTORY_KEY = "ltcashflow-assistant-history";
const GESTAO_KEY = "ltcashflow-assistant-gestao";

function historyKeyForGestao(gestaoId: number | null) {
  return `${HISTORY_KEY}:${gestaoId ?? "none"}`;
}

function initialAssistantMessage(): AssistantMessage {
  return {
    id: messageId(),
    role: "assistant",
    text:
      "Sou seu assistente financeiro. Posso responder perguntas sobre os lancamentos da gestao ativa, resumir gastos e montar rascunhos de novos lancamentos a partir do que voce escrever.",
    provider: "info",
    kind: "info",
  };
}

export function GlobalAssistant({
  gestoes,
}: {
  gestoes: GestaoOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [selectedGestaoId, setSelectedGestaoId] = useState<number | null>(gestoes[0]?.id ?? null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [editingQuickAddMessageId, setEditingQuickAddMessageId] = useState<string | null>(null);
  const [editingQuickAddSuggestion, setEditingQuickAddSuggestion] = useState<QuickAddSuggestion | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedGestao = localStorage.getItem(GESTAO_KEY);

    if (storedGestao) {
      const parsed = Number(storedGestao);
      if (gestoes.some((item) => item.id === parsed)) {
        setSelectedGestaoId(parsed);
      }
    }
  }, [gestoes]);

  useEffect(() => {
    const key = historyKeyForGestao(selectedGestaoId);
    const storedHistory = localStorage.getItem(key);

    if (storedHistory) {
      try {
        setMessages(JSON.parse(storedHistory));
        return;
      } catch {
        localStorage.removeItem(key);
      }
    }

    setMessages([initialAssistantMessage()]);
  }, [selectedGestaoId]);

  useEffect(() => {
    setEditingQuickAddMessageId(null);
    setEditingQuickAddSuggestion(null);
  }, [selectedGestaoId]);

  useEffect(() => {
    localStorage.setItem(historyKeyForGestao(selectedGestaoId), JSON.stringify(messages));
  }, [messages, selectedGestaoId]);

  useEffect(() => {
    if (selectedGestaoId) {
      localStorage.setItem(GESTAO_KEY, String(selectedGestaoId));
    }
  }, [selectedGestaoId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const container = messagesContainerRef.current;

      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, messages]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (result?.[0]?.transcript) {
          transcript += result[0].transcript;
        }
      }

      if (transcript.trim()) {
        setPrompt(transcript.trim());
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setVoiceError("Permita o uso do microfone no navegador para falar com o assistente.");
      } else if (event.error === "no-speech") {
        setVoiceError("Nao consegui ouvir sua fala. Tente novamente mais perto do microfone.");
      } else {
        setVoiceError("Nao foi possivel usar o microfone agora.");
      }

      setVoiceListening(false);
    };
    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognitionRef.current = recognition;
    setVoiceSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const selectedGestao = useMemo(
    () => gestoes.find((item) => item.id === selectedGestaoId) ?? null,
    [gestoes, selectedGestaoId],
  );
  const selectedGestaoContas = selectedGestao?.contas ?? [];
  const selectedGestaoCategorias = selectedGestao?.categorias ?? [];

  function handleNewConversation() {
    const nextMessages = [initialAssistantMessage()];
    const key = historyKeyForGestao(selectedGestaoId);

    localStorage.setItem(key, JSON.stringify(nextMessages));
    setMessages(nextMessages);
    setPrompt("");
    setVoiceError(null);
    setEditingQuickAddMessageId(null);
    setEditingQuickAddSuggestion(null);
  }

  function startQuickAddEditing(message: AssistantMessage) {
    if (message.role !== "assistant" || message.kind !== "quick_add" || !message.suggestion) {
      return;
    }

    setEditingQuickAddMessageId(message.id);
    setEditingQuickAddSuggestion(message.suggestion as QuickAddSuggestion);
  }

  function cancelQuickAddEditing() {
    setEditingQuickAddMessageId(null);
    setEditingQuickAddSuggestion(null);
  }

  function saveQuickAddEditing(message: AssistantMessage) {
    if (
      message.role !== "assistant" ||
      message.kind !== "quick_add" ||
      !editingQuickAddSuggestion ||
      editingQuickAddMessageId !== message.id
    ) {
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? {
              ...item,
              suggestion: editingQuickAddSuggestion,
            }
          : item,
      ),
    );
    cancelQuickAddEditing();
  }

  async function handleSubmit() {
    if (!prompt.trim() || !selectedGestaoId) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: messageId(),
      role: "user",
      text: prompt.trim(),
    };

    const previousAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    const previousUser = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          gestaoId: selectedGestaoId,
          previousPrompt: previousUser?.text,
          previousAnswer: previousAssistant?.text,
          previousKind: previousAssistant?.role === "assistant" ? previousAssistant.kind : undefined,
          previousResults: previousAssistant?.role === "assistant" ? previousAssistant.results : undefined,
          previousPlan: previousAssistant?.role === "assistant" ? previousAssistant.plan : undefined,
          previousSuggestion: previousAssistant?.role === "assistant" ? previousAssistant.suggestion : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Falha ao consultar o assistente.");
      }

      const assistantMessage: AssistantMessage = {
        id: messageId(),
        role: "assistant",
        text: data.answer,
        provider: data.provider,
        kind: data.kind,
        results: data.results,
        suggestion: data.suggestion,
        plan: data.plan,
      };

      setMessages((current) => [...current, assistantMessage]);
      setPrompt("");
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Falha inesperada no assistente.",
          provider: "info",
          kind: "info",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      void handleSubmit();
    }
  }

  function handleVoiceToggle() {
    if (!recognitionRef.current) {
      setVoiceError("Seu navegador nao suporta reconhecimento de voz neste campo.");
      return;
    }

    if (voiceListening) {
      recognitionRef.current.stop();
      setVoiceListening(false);
      return;
    }

    setVoiceError(null);
    setVoiceListening(true);
    recognitionRef.current.start();
  }

  async function confirmQuickAdd(message: AssistantMessage) {
    if (message.role !== "assistant" || message.kind !== "quick_add" || !message.suggestion || !selectedGestaoId) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/ai/quick-add/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId: selectedGestaoId,
          suggestion: message.suggestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel salvar o lancamento.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: "Lancamento salvo com sucesso. Atualizei a base da gestao.",
          provider: "info",
          kind: "info",
        },
      ]);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel salvar o lancamento.",
          provider: "info",
          kind: "info",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmQuickAddBatch(message: AssistantMessage) {
    if (
      message.role !== "assistant" ||
      message.kind !== "quick_add_batch" ||
      !message.suggestion ||
      !selectedGestaoId
    ) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/ai/quick-add/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId: selectedGestaoId,
          suggestion: message.suggestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel salvar o lote de lancamentos.");
      }

      const quantidade =
        "quantidade" in message.suggestion ? message.suggestion.quantidade : data.quantidade ?? 0;

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: `Lote salvo com sucesso. Registrei ${quantidade} lancamento(s) na gestao ativa.`,
          provider: "info",
          kind: "info",
        },
      ]);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel salvar o lote de lancamentos.",
          provider: "info",
          kind: "info",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmCreateAccount(message: AssistantMessage) {
    if (message.role !== "assistant" || message.kind !== "account_create" || !message.suggestion || !selectedGestaoId) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/assistant/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId: selectedGestaoId,
          suggestion: message.suggestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel criar a origem.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: "Origem criada com sucesso. Atualizei a base da gestao.",
          provider: "info",
          kind: "info",
        },
      ]);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel criar a origem.",
          provider: "info",
          kind: "info",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmRenameAccount(message: AssistantMessage) {
    if (message.role !== "assistant" || message.kind !== "account_rename" || !message.suggestion || !selectedGestaoId) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/assistant/rename-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId: selectedGestaoId,
          suggestion: message.suggestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel renomear a origem.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: "Origem renomeada com sucesso. Atualizei a base da gestao.",
          provider: "info",
          kind: "info",
        },
      ]);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel renomear a origem.",
          provider: "info",
          kind: "info",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmKeepAccounts(message: AssistantMessage) {
    if (message.role !== "assistant" || message.kind !== "account_keep" || !message.suggestion || !selectedGestaoId) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/assistant/keep-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId: selectedGestaoId,
          suggestion: message.suggestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel ajustar as origens ativas.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: "Origens ajustadas com sucesso. Mantive apenas as origens escolhidas ativas.",
          provider: "info",
          kind: "info",
        },
      ]);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel ajustar as origens.",
          provider: "info",
          kind: "info",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmUpdateLancamentos(message: AssistantMessage) {
    if (message.role !== "assistant" || message.kind !== "transactions_update" || !message.suggestion || !selectedGestaoId) {
      return;
    }

    const suggestion = message.suggestion as UpdateLancamentosSuggestion;

    setLoading(true);

    try {
      const response = await fetch("/api/assistant/update-lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId: selectedGestaoId,
          suggestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel editar os lancamentos.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: `Atualizei ${suggestion.quantidade ?? data.updated} lancamento(s) com sucesso.`,
          provider: "info",
          kind: "info",
        },
      ]);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel editar os lancamentos.",
          provider: "info",
          kind: "info",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmUpdateLancamentosData(message: AssistantMessage) {
    if (
      message.role !== "assistant" ||
      message.kind !== "transactions_date_update" ||
      !message.suggestion ||
      !selectedGestaoId
    ) {
      return;
    }

    const suggestion = message.suggestion as UpdateLancamentosDataSuggestion;

    setLoading(true);

    try {
      const response = await fetch("/api/assistant/update-lancamentos-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId: selectedGestaoId,
          suggestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel ajustar a data dos lancamentos.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: `Atualizei ${suggestion.quantidade} lancamento(s) para ${suggestion.competenciaData}.`,
          provider: "info",
          kind: "info",
        },
      ]);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel ajustar a data dos lancamentos.",
          provider: "info",
          kind: "info",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDeleteLancamentos(message: AssistantMessage) {
    if (
      message.role !== "assistant" ||
      message.kind !== "transactions_delete" ||
      !message.suggestion ||
      !selectedGestaoId
    ) {
      return;
    }

    const suggestion = message.suggestion as DeleteLancamentosSuggestion;

    setLoading(true);

    try {
      const response = await fetch("/api/assistant/delete-lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId: selectedGestaoId,
          suggestion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel apagar os lancamentos.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: `Apaguei ${suggestion.quantidade} lancamento(s) com sucesso.`,
          provider: "info",
          kind: "info",
        },
      ]);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel apagar os lancamentos.",
          provider: "info",
          kind: "info",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (gestoes.length === 0) {
    return null;
  }

  return (
    <>
      <button
        className={`fixed right-4 bottom-4 z-50 rounded-full bg-foreground px-4 py-2.5 text-xs font-semibold text-white shadow-[0_18px_50px_rgba(30,42,47,0.18)] transition-opacity duration-200 sm:right-5 sm:bottom-5 sm:px-5 sm:py-3 sm:text-sm lg:right-6 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="sm:hidden">IA</span>
        <span className="hidden sm:inline">Abrir assistente</span>
      </button>

      <aside
        className={`fixed top-0 right-0 z-40 flex h-screen w-full max-w-md flex-col border-l border-line bg-surface shadow-[0_0_60px_rgba(30,42,47,0.12)] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] text-muted uppercase">Assistente LT</p>
              <h2 className="mt-2 font-heading text-2xl font-semibold">Chat lateral</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-line px-3 py-1 text-sm text-muted"
                onClick={handleNewConversation}
                type="button"
              >
                Nova conversa
              </button>
              <button
                className="rounded-full border border-line px-3 py-1 text-sm text-muted"
                onClick={() => setOpen(false)}
                type="button"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs tracking-[0.18em] text-muted uppercase" htmlFor="gestao-assistente">
              Gestao ativa
            </label>
            <select
              className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm"
              id="gestao-assistente"
              onChange={(event) => setSelectedGestaoId(Number(event.target.value))}
              value={selectedGestao?.id ?? ""}
            >
              {gestoes.map((gestao) => (
                <option key={gestao.id} value={gestao.id}>
                  {gestao.nome}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-32" ref={messagesContainerRef}>
          {messages.map((message) => (
            <article
              className={`rounded-[1.5rem] px-4 py-3 ${
                message.role === "user"
                  ? "ml-10 bg-foreground text-white"
                  : "mr-6 border border-line bg-background"
              }`}
              key={message.id}
            >
              <p className="text-sm leading-7">{message.text}</p>

              {message.role === "assistant" ? (
                <>
                  <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
                    <span>{providerLabel(message.provider)}</span>
                    <span>·</span>
                    <span>{message.kind === "quick_add" || message.kind === "quick_add_batch" || message.kind === "account_create" || message.kind === "account_rename" || message.kind === "account_keep" || message.kind === "transactions_update" || message.kind === "transactions_date_update" || message.kind === "transactions_delete" ? "rascunho" : message.kind}</span>
                  </div>

                  {message.kind === "quick_add" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      {(() => {
                        const suggestion = message.suggestion as QuickAddSuggestion;
                        const isEditing =
                          editingQuickAddMessageId === message.id && editingQuickAddSuggestion;

                        return (
                          <>
                            {isEditing ? (
                              <div className="space-y-3">
                                <input
                                  className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                  onChange={(event) =>
                                    setEditingQuickAddSuggestion((current) =>
                                      current
                                        ? {
                                            ...current,
                                            descricao: event.currentTarget.value,
                                          }
                                        : current,
                                    )
                                  }
                                  type="text"
                                  value={editingQuickAddSuggestion.descricao}
                                />

                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    min="0.01"
                                    onChange={(event) =>
                                      setEditingQuickAddSuggestion((current) =>
                                        current
                                          ? {
                                              ...current,
                                              valorTotal: Number(event.currentTarget.value || 0),
                                            }
                                          : current,
                                      )
                                    }
                                    step="0.01"
                                    type="number"
                                    value={editingQuickAddSuggestion.valorTotal}
                                  />
                                  <select
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) =>
                                      setEditingQuickAddSuggestion((current) =>
                                        current
                                          ? {
                                              ...current,
                                              meio: (event.currentTarget.value || undefined) as QuickAddSuggestion["meio"],
                                            }
                                          : current,
                                      )
                                    }
                                    value={editingQuickAddSuggestion.meio ?? ""}
                                  >
                                    <option value="">Meio nao informado</option>
                                    <option value="pix">PIX</option>
                                    <option value="debito">Debito</option>
                                    <option value="credito">Credito</option>
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="boleto">Boleto</option>
                                    <option value="ted_doc">TED/DOC</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="outro">Outro</option>
                                  </select>

                                  <DateInput
                                    className="rounded-2xl border border-line bg-background px-4 py-3"
                                    onValueChange={(value) =>
                                      setEditingQuickAddSuggestion((current) =>
                                        current
                                          ? {
                                              ...current,
                                              competenciaData: value,
                                            }
                                          : current,
                                      )
                                    }
                                    value={editingQuickAddSuggestion.competenciaData}
                                  />
                                  <input
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) =>
                                      setEditingQuickAddSuggestion((current) =>
                                        current
                                          ? {
                                              ...current,
                                              competenciaHora: event.currentTarget.value || undefined,
                                            }
                                          : current,
                                      )
                                    }
                                    type="time"
                                    value={editingQuickAddSuggestion.competenciaHora ?? ""}
                                  />

                                  <select
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) =>
                                      setEditingQuickAddSuggestion((current) =>
                                        current
                                          ? {
                                              ...current,
                                              contaId: Number(event.currentTarget.value),
                                            }
                                          : current,
                                      )
                                    }
                                    value={String(editingQuickAddSuggestion.contaId)}
                                  >
                                    {selectedGestaoContas.map((conta) => (
                                      <option key={conta.id} value={conta.id}>
                                        {conta.nome}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) =>
                                      setEditingQuickAddSuggestion((current) =>
                                        current
                                          ? {
                                              ...current,
                                              categoriaId: Number(event.currentTarget.value),
                                            }
                                          : current,
                                      )
                                    }
                                    value={String(editingQuickAddSuggestion.categoriaId)}
                                  >
                                    {selectedGestaoCategorias.map((categoria) => (
                                      <option key={categoria.id} value={categoria.id}>
                                        {categoria.nome}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                  <button
                                    className="rounded-full border border-line bg-background px-4 py-2 text-sm font-medium text-foreground"
                                    onClick={cancelQuickAddEditing}
                                    type="button"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white"
                                    onClick={() => saveQuickAddEditing(message)}
                                    type="button"
                                  >
                                    Salvar rascunho
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p>
                                  <strong>Descricao:</strong> {suggestion.descricao}
                                </p>
                                <p>
                                  <strong>Valor:</strong> {money(suggestion.valorTotal)}
                                </p>
                                <p>
                                  <strong>Data:</strong>{" "}
                                  {`${suggestion.competenciaData}${suggestion.competenciaHora ? ` · ${suggestion.competenciaHora}` : ""}`}
                                </p>
                                <p>
                                  <strong>Meio:</strong> {suggestion.meio ?? "-"}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button
                                    className="rounded-full border border-line bg-background px-4 py-2 text-sm font-medium text-foreground"
                                    disabled={loading}
                                    onClick={() => startQuickAddEditing(message)}
                                    type="button"
                                  >
                                    Editar rascunho
                                  </button>
                                  <button
                                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                                    disabled={loading}
                                    onClick={() => confirmQuickAdd(message)}
                                    type="button"
                                  >
                                    Confirmar e salvar
                                  </button>
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {message.kind === "quick_add_batch" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      <p>
                        <strong>Lancamentos:</strong>{" "}
                        {"quantidade" in message.suggestion ? message.suggestion.quantidade : "-"}
                      </p>
                      <p>
                        <strong>Total do lote:</strong>{" "}
                        {"valorTotalLote" in message.suggestion ? money(message.suggestion.valorTotalLote) : "-"}
                      </p>
                      {"items" in message.suggestion ? (
                        <div className="space-y-1 pt-1">
                          {message.suggestion.items.slice(0, 5).map((item, index) => (
                            <p key={`${message.id}-item-${index}`}>
                              {index + 1}. {item.descricao} · {money(item.valorTotal)} · {item.competenciaData}
                              {item.competenciaHora ? ` · ${item.competenciaHora}` : ""}
                            </p>
                          ))}
                          {message.suggestion.items.length > 5 ? (
                            <p className="text-muted">...e mais {message.suggestion.items.length - 5} item(ns).</p>
                          ) : null}
                        </div>
                      ) : null}
                      <button
                        className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                        disabled={loading}
                        onClick={() => confirmQuickAddBatch(message)}
                        type="button"
                      >
                        Confirmar e salvar lote
                      </button>
                    </div>
                  ) : null}

                  {message.kind === "account_create" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      <p>
                        <strong>Nome:</strong> {"nome" in message.suggestion ? message.suggestion.nome : "-"}
                      </p>
                      <p>
                        <strong>Tipo:</strong>{" "}
                        {"tipo" in message.suggestion ? message.suggestion.tipo.replace("_", " ") : "-"}
                      </p>
                      <p>
                        <strong>Instituicao:</strong>{" "}
                        {"instituicao" in message.suggestion ? message.suggestion.instituicao ?? "-" : "-"}
                      </p>
                      <p>
                        <strong>Saldo inicial:</strong>{" "}
                        {"saldoInicial" in message.suggestion ? money(message.suggestion.saldoInicial) : "-"}
                      </p>
                      <button
                        className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                        disabled={loading}
                        onClick={() => confirmCreateAccount(message)}
                        type="button"
                      >
                        Confirmar e criar origem
                      </button>
                    </div>
                  ) : null}

                  {message.kind === "account_rename" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      <p>
                        <strong>Origem atual:</strong> {"nomeAtual" in message.suggestion ? message.suggestion.nomeAtual : "-"}
                      </p>
                      <p>
                        <strong>Novo nome:</strong> {"novoNome" in message.suggestion ? message.suggestion.novoNome : "-"}
                      </p>
                      <button
                        className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                        disabled={loading}
                        onClick={() => confirmRenameAccount(message)}
                        type="button"
                      >
                        Confirmar e renomear origem
                      </button>
                    </div>
                  ) : null}

                  {message.kind === "account_keep" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      <p>
                        <strong>Manter:</strong>{" "}
                        {"manterNomes" in message.suggestion ? message.suggestion.manterNomes.join(", ") : "-"}
                      </p>
                      <p>
                        <strong>Desativar:</strong>{" "}
                        {"desativarNomes" in message.suggestion && message.suggestion.desativarNomes.length > 0
                          ? message.suggestion.desativarNomes.join(", ")
                          : "Nada para desativar"}
                      </p>
                      <button
                        className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                        disabled={
                          loading ||
                          !("desativarNomes" in message.suggestion) ||
                          message.suggestion.desativarNomes.length === 0
                        }
                        onClick={() => confirmKeepAccounts(message)}
                        type="button"
                      >
                        Confirmar e ajustar origens
                      </button>
                    </div>
                  ) : null}

                  {message.kind === "transactions_update" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      {(() => {
                        const suggestion = message.suggestion as UpdateLancamentosSuggestion;

                        return (
                          <>
                      <p>
                        <strong>Lancamentos:</strong>{" "}
                        {suggestion.quantidade}
                      </p>
                      <p>
                        <strong>Novo meio:</strong>{" "}
                        {meioLabel(suggestion.meio)}
                      </p>
                      <button
                        className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                        disabled={loading}
                        onClick={() => confirmUpdateLancamentos(message)}
                        type="button"
                      >
                        Confirmar e editar lancamentos
                      </button>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {message.kind === "transactions_date_update" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      {(() => {
                        const suggestion = message.suggestion as UpdateLancamentosDataSuggestion;

                        return (
                          <>
                            <p>
                              <strong>Lancamentos:</strong> {suggestion.quantidade}
                            </p>
                            <p>
                              <strong>Nova data:</strong> {suggestion.competenciaData}
                            </p>
                            <button
                              className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                              disabled={loading}
                              onClick={() => confirmUpdateLancamentosData(message)}
                              type="button"
                            >
                              Confirmar e ajustar data
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {message.kind === "transactions_delete" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      {(() => {
                        const suggestion = message.suggestion as DeleteLancamentosSuggestion;

                        return (
                          <>
                            <p>
                              <strong>Lancamentos:</strong> {suggestion.quantidade}
                            </p>
                            <button
                              className="mt-2 rounded-full bg-[var(--color-danger,#b42318)] px-4 py-2 text-sm font-semibold text-white"
                              disabled={loading}
                              onClick={() => confirmDeleteLancamentos(message)}
                              type="button"
                            >
                              Confirmar e apagar
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {message.results && message.results.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {message.results.slice(0, 5).map((result) => (
                        <div className="rounded-2xl bg-surface px-3 py-3 text-sm" key={result.id}>
                          <p className="font-medium">{result.descricao}</p>
                          <p className="mt-1 text-muted">
                            {result.competencia_data} · {result.conta_nome} · {money(result.valor_total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </article>
          ))}
        </div>

        <div className="border-t border-line px-4 py-4 pb-24 lg:pb-4">
          <div className="rounded-[1.5rem] border border-line bg-background p-3">
            <textarea
              className="min-h-28 w-full resize-none bg-transparent text-sm outline-none"
              onKeyDown={handleKeyDown}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Pergunte sobre os lancamentos, fale no microfone ou descreva uma compra..."
              value={prompt}
            />
            {voiceError ? <p className="mt-2 text-xs text-[var(--color-danger,#b42318)]">{voiceError}</p> : null}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xs text-xs text-muted">
                Exemplo: qual foi o ultimo lancamento? / mercado 182,90 hoje / toque em Falar
              </p>
              <div className="flex items-center gap-2 self-end">
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    voiceListening
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface text-foreground"
                  } disabled:opacity-60`}
                  disabled={!voiceSupported || loading}
                  onClick={handleVoiceToggle}
                  type="button"
                >
                  {voiceListening ? "Ouvindo..." : "Falar"}
                </button>
                <button
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={!prompt.trim() || loading || !selectedGestaoId}
                  onClick={handleSubmit}
                  type="button"
                >
                  {loading ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
