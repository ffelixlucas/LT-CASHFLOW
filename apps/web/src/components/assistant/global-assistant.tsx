"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { DateInput } from "@/components/ui/date-input";
import { preserveScrollPosition, restorePreservedScrollPosition } from "@/lib/client/scroll-preservation";

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

export type GestaoOption = {
  id: number;
  nome: string;
  contas: Array<{
    id: number;
    nome: string;
    tipo?: string;
  }>;
  categorias: Array<{
    id: number;
    nome: string;
    natureza?: "receita" | "despesa" | "ambos";
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
  meio?: "pix" | "debito" | "credito" | "dinheiro" | "ted_doc" | "transferencia" | "outro";
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
  meio: "pix" | "debito" | "credito" | "dinheiro" | "ted_doc" | "transferencia" | "outro";
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

type AssistantApiResponse = {
  error?: string;
  ok?: boolean;
  id?: number;
  ids?: number[];
  duplicated?: boolean;
  avisoDuplicidade?: string;
  quantidade?: number;
  updated?: number;
  answer?: string;
  provider?: string;
  kind?:
    | "search"
    | "quick_add"
    | "quick_add_batch"
    | "account_create"
    | "account_rename"
    | "account_keep"
    | "transactions_update"
    | "transactions_date_update"
    | "transactions_delete"
    | "info"
    | "quick_add_tool"
    | "search_tool"
    | "delete_tool";
  results?: SearchResult[];
  suggestion?: unknown;
  plan?: SearchPlan;
  toolDraft?: ToolDraftSuggestion;
  toolSearchResults?: ToolSearchResult[];
  toolDeleteDraft?: ToolDeleteDraft;
};

// Rascunho retornado pelo tool calling (criar_lancamento com confirmar: false)
type ToolDraftSuggestion = {
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  contaId: number;
  categoriaId: number;
  data: string;
  hora?: string;
  meio: string;
};

// Lançamento retornado por buscar_lancamentos via tool calling
type ToolSearchResult = {
  id: number;
  descricao: string;
  valor_total: string | number;
  competencia_data: string;
  categoria_nome?: string | null;
  conta_nome?: string;
  tipo?: string;
};

// IDs a deletar retornados pelo tool calling (deletar_lancamentos com confirmar: false)
type ToolDeleteDraft = {
  lancamentoIds: number[];
  quantidade: number;
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
        | "info"
        // tool calling kinds
        | "quick_add_tool"
        | "search_tool"
        | "delete_tool";
      results?: SearchResult[];
      suggestion?:
        | QuickAddSuggestion
        | QuickAddBatchSuggestion
        | CreateAccountSuggestion
        | RenameAccountSuggestion
        | KeepAccountsSuggestion
        | UpdateLancamentosSuggestion
        | UpdateLancamentosDataSuggestion
        | DeleteLancamentosSuggestion
        | ToolDraftSuggestion;
      plan?: SearchPlan;
      toolSearchResults?: ToolSearchResult[];
      toolDeleteDraft?: ToolDeleteDraft;
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

function extractTimeFromText(text: string) {
  const match = text.match(/\b(?:as|às|pra|para)?\s*([01]?\d|2[0-3])[:h]([0-5]\d)\b/i);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

function normalizeAssistantText(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function hasMoneyAmount(text: string) {
  return /(?:R\$\s*)?\b\d{1,3}(?:\.\d{3})*,\d{2}\b|\b\d+[,.]\d{1,2}\b|\b(?:de|por|valor)\s+\d+\b/i.test(
    text,
  );
}

function looksLikeNewLancamentoPrompt(text: string) {
  const normalized = normalizeAssistantText(text);

  return (
    hasMoneyAmount(text) &&
    /\b(lanca|lança|entrada|receita|compra|comprei|gasto|gastei|despesa|paguei|pagamento|pix|debito|credito|dinheiro)\b/.test(
      normalized,
    )
  );
}

function looksLikeDraftTimeEdit(text: string) {
  const normalized = normalizeAssistantText(text);

  return /\b(ajusta|ajuste|muda|mude|altera|altere|corrige|corrija|troca|troque)\b/.test(normalized) &&
    /\b(hora|horario)\b/.test(normalized) &&
    Boolean(extractTimeFromText(text));
}

function detectDraftMeioEdit(text: string): QuickAddSuggestion["meio"] | undefined {
  const normalized = normalizeAssistantText(text);

  if (/\bpix\b/.test(normalized)) return "pix";
  if (/\b(cartao de credito|cartao credito|credito)\b/.test(normalized)) return "credito";
  if (/\b(cartao de debito|cartao debito|debito)\b/.test(normalized)) return "debito";
  if (/\b(dinheiro|especie)\b/.test(normalized)) return "dinheiro";
  if (/\b(ted|doc)\b/.test(normalized)) return "ted_doc";
  if (/\btransferencia\b/.test(normalized)) return "transferencia";

  return undefined;
}

function findDraftCategoryEdit(
  text: string,
  categorias: GestaoOption["categorias"],
) {
  const normalized = normalizeAssistantText(text);
  const afterCategoria = normalized.match(/\bcategoria\s+(.+?)(?:\s+(?:nao|não)\b|$)/)?.[1]?.trim();

  if (afterCategoria) {
    const direct = categorias.find((categoria) => {
      const name = normalizeAssistantText(categoria.nome);
      return afterCategoria.includes(name) || name.includes(afterCategoria);
    });

    if (direct) {
      return direct;
    }
  }

  return categorias.find((categoria) => {
    const name = normalizeAssistantText(categoria.nome);
    const index = normalized.indexOf(name);

    if (index < 0) {
      return false;
    }

    const before = normalized.slice(Math.max(0, index - 8), index);
    return !/\bnao\s+$/.test(before) && !/\bn\s+$/.test(before);
  }) ?? null;
}

function findDraftAccountEdit(
  text: string,
  contas: GestaoOption["contas"],
  currentContaId?: number,
) {
  const normalized = normalizeAssistantText(text);
  const currentConta = contas.find((conta) => conta.id === currentContaId);
  const wantsLucas = currentConta ? /\blucas\b/.test(normalizeAssistantText(currentConta.nome)) : false;

  const byName = contas.find((conta) => normalized.includes(normalizeAssistantText(conta.nome)));
  if (byName) {
    return byName;
  }

  if (/\b(cartao de credito|cartao credito|credito)\b/.test(normalized)) {
    return (
      contas.find((conta) => conta.tipo === "cartao_credito" && (!wantsLucas || /\blucas\b/.test(normalizeAssistantText(conta.nome)))) ??
      contas.find((conta) => conta.tipo === "cartao_credito") ??
      null
    );
  }

  return null;
}

function isDraftFieldEdit(text: string) {
  const normalized = normalizeAssistantText(text);

  return (
    (/\b(ajusta|ajuste|muda|mude|altera|altere|corrige|corrija|troca|troque|editar|edita|edite)\b/.test(
      normalized,
    ) &&
      /\b(rascunho|categoria|conta|cartao|credito|debito|pix|meio)\b/.test(normalized)) ||
    /\b(ta|esta|ficou)\s+(errado|errada)\b/.test(normalized) ||
    /\b(nao|não)\b/.test(normalized)
  );
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
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

function sanitizeAssistantText(text: string) {
  const normalized = text.trim();

  if (
    normalized.startsWith("Erro ao chamar Groq:") ||
    normalized.includes("rate_limit_exceeded") ||
    normalized.includes("Rate limit reached")
  ) {
    return "O assistente ficou sobrecarregado agora. Tente novamente em alguns segundos.";
  }

  return text;
}

function sanitizeAssistantHistory(messages: AssistantMessage[]) {
  return messages.map((message) => {
    if (message.role !== "assistant") {
      return message;
    }

    return {
      ...message,
      text: sanitizeAssistantText(message.text),
    };
  });
}

function IconSparkAssistant({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="currentColor" height={26} viewBox="0 0 24 24" width={26}>
      <path d="m14.5 2 1.6 5.8 5.8 1.6-5.8 1.6-1.6 5.8-1.6-5.8L7 9.4l5.9-1.6L14.5 2Z" />
      <path d="M7 14.5 8 17l2.5.5-.5 2.5L8 21l-2.5-1-.5-2.5 2.5-.5L7 14.5ZM17 3l.9 2.1 2.1.9-2.1.9L17 9l-.9-2.1L14 6l2.1-.9L17 3Z" opacity={0.85} />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" height={22} stroke="currentColor" strokeLinecap="round" strokeWidth={2} viewBox="0 0 24 24" width={22}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
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
  const scrollPositionRef = useRef(0);

  function refreshPreservingScroll() {
    preserveScrollPosition();
    router.refresh();
    setTimeout(restorePreservedScrollPosition, 120);
    setTimeout(restorePreservedScrollPosition, 360);
  }

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
        setMessages(sanitizeAssistantHistory(JSON.parse(storedHistory)));
        return;
      } catch {
        localStorage.removeItem(key);
      }
    }

    setMessages([initialAssistantMessage()]);
  }, [selectedGestaoId]);

  useEffect(() => {
    setMessages((current) => {
      const sanitized = sanitizeAssistantHistory(current);
      const changed = sanitized.some((message, index) => message.text !== current[index]?.text);
      return changed ? sanitized : current;
    });
  }, []);

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
    if (!open) {
      return;
    }

    scrollPositionRef.current = window.scrollY;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollPositionRef.current);
    };
  }, [open]);

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
    if (
      message.role !== "assistant" ||
      (message.kind !== "quick_add" && message.kind !== "quick_add_tool") ||
      !message.suggestion
    ) {
      return;
    }

    setEditingQuickAddMessageId(message.id);

    if (message.kind === "quick_add_tool") {
      const draft = message.suggestion as ToolDraftSuggestion;
      setEditingQuickAddSuggestion({
        descricao: draft.descricao,
        tipo: draft.tipo,
        status: "liquidado",
        meio: draft.meio as QuickAddSuggestion["meio"],
        valorTotal: draft.valor,
        competenciaData: draft.data,
        competenciaHora: draft.hora,
        contaId: draft.contaId,
        categoriaId: draft.categoriaId,
        confianca: 0.95,
        motivo: "Rascunho editado pelo usuario.",
      });
      return;
    }

    setEditingQuickAddSuggestion(message.suggestion as QuickAddSuggestion);
  }

  function cancelQuickAddEditing() {
    setEditingQuickAddMessageId(null);
    setEditingQuickAddSuggestion(null);
  }

  function saveQuickAddEditing(message: AssistantMessage) {
    if (
      message.role !== "assistant" ||
      (message.kind !== "quick_add" && message.kind !== "quick_add_tool") ||
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
              suggestion:
                message.kind === "quick_add_tool"
                  ? {
                      descricao: editingQuickAddSuggestion.descricao,
                      valor: editingQuickAddSuggestion.valorTotal,
                      tipo:
                        editingQuickAddSuggestion.tipo === "receita" || editingQuickAddSuggestion.tipo === "despesa"
                          ? editingQuickAddSuggestion.tipo
                          : "despesa",
                      contaId: editingQuickAddSuggestion.contaId,
                      categoriaId: editingQuickAddSuggestion.categoriaId,
                      data: editingQuickAddSuggestion.competenciaData,
                      hora: editingQuickAddSuggestion.competenciaHora,
                      meio: editingQuickAddSuggestion.meio ?? "outro",
                    }
                  : editingQuickAddSuggestion,
            }
          : item,
      ),
    );
    cancelQuickAddEditing();
  }

  function applyDraftTimeEdit(rawPrompt: string, userMessage: AssistantMessage) {
    const nextTime = extractTimeFromText(rawPrompt);

    if (!nextTime || !looksLikeDraftTimeEdit(rawPrompt)) {
      return false;
    }

    const lastDraft = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" &&
          (message.kind === "quick_add" || message.kind === "quick_add_tool") &&
          Boolean(message.suggestion),
      );

    if (!lastDraft || lastDraft.role !== "assistant" || !lastDraft.suggestion) {
      return false;
    }

    const updatedSuggestion =
      lastDraft.kind === "quick_add_tool"
        ? {
            ...(lastDraft.suggestion as ToolDraftSuggestion),
            hora: nextTime,
          }
        : {
            ...(lastDraft.suggestion as QuickAddSuggestion),
            competenciaHora: nextTime,
          };

    const updatedDraft: AssistantMessage = {
      ...lastDraft,
      id: messageId(),
      text: `Ajustei o horario do rascunho para ${nextTime}.`,
      suggestion: updatedSuggestion,
    };

    setMessages((current) => [...current, userMessage, updatedDraft]);
    setPrompt("");
    setVoiceError(null);
    setEditingQuickAddMessageId(null);
    setEditingQuickAddSuggestion(null);

    return true;
  }

  function applyDraftFieldEdit(rawPrompt: string, userMessage: AssistantMessage) {
    if (looksLikeNewLancamentoPrompt(rawPrompt) || !isDraftFieldEdit(rawPrompt)) {
      return false;
    }

    const lastDraft = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" &&
          (message.kind === "quick_add" || message.kind === "quick_add_tool") &&
          Boolean(message.suggestion),
      );

    if (!lastDraft || lastDraft.role !== "assistant" || !lastDraft.suggestion) {
      return false;
    }

    const selectedCategory = findDraftCategoryEdit(rawPrompt, selectedGestaoCategorias);
    const nextMeio = detectDraftMeioEdit(rawPrompt);
    const currentContaId =
      lastDraft.kind === "quick_add_tool"
        ? (lastDraft.suggestion as ToolDraftSuggestion).contaId
        : (lastDraft.suggestion as QuickAddSuggestion).contaId;
    const selectedAccount = findDraftAccountEdit(rawPrompt, selectedGestaoContas, currentContaId);

    if (!selectedCategory && !nextMeio && !selectedAccount) {
      return false;
    }

    const updatedSuggestion =
      lastDraft.kind === "quick_add_tool"
        ? {
            ...(lastDraft.suggestion as ToolDraftSuggestion),
            ...(selectedCategory ? { categoriaId: selectedCategory.id } : {}),
            ...(selectedAccount ? { contaId: selectedAccount.id } : {}),
            ...(nextMeio ? { meio: nextMeio } : {}),
          }
        : {
            ...(lastDraft.suggestion as QuickAddSuggestion),
            ...(selectedCategory ? { categoriaId: selectedCategory.id } : {}),
            ...(selectedAccount ? { contaId: selectedAccount.id } : {}),
            ...(nextMeio ? { meio: nextMeio } : {}),
            motivo: "Rascunho ajustado pela correcao do usuario.",
          };

    const changes = [
      selectedCategory ? `categoria ${selectedCategory.nome}` : null,
      selectedAccount ? `conta ${selectedAccount.nome}` : null,
      nextMeio ? `meio ${meioLabel(nextMeio)}` : null,
    ].filter(Boolean);

    const updatedDraft: AssistantMessage = {
      ...lastDraft,
      id: messageId(),
      text: `Ajustei o rascunho: ${changes.join(", ")}.`,
      suggestion: updatedSuggestion,
    };

    setMessages((current) => [...current, userMessage, updatedDraft]);
    setPrompt("");
    setVoiceError(null);
    setEditingQuickAddMessageId(null);
    setEditingQuickAddSuggestion(null);

    return true;
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

    if (applyDraftTimeEdit(prompt.trim(), userMessage)) {
      return;
    }

    if (applyDraftFieldEdit(prompt.trim(), userMessage)) {
      return;
    }

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
          // Histórico curto para manter o custo de tokens baixo
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.text,
          })),
          // Compatibilidade com o handler antigo
          previousPrompt: previousUser?.text,
          previousAnswer: previousAssistant?.text,
          previousKind: previousAssistant?.role === "assistant" ? previousAssistant.kind : undefined,
          previousResults: previousAssistant?.role === "assistant" ? previousAssistant.results : undefined,
          previousPlan: previousAssistant?.role === "assistant" ? previousAssistant.plan : undefined,
          previousSuggestion: previousAssistant?.role === "assistant" ? previousAssistant.suggestion : undefined,
        }),
      });

      const data = await readJsonResponse<AssistantApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Falha ao consultar o assistente.");
      }

      // Detecta rascunho de lançamento vindo do tool calling
      const toolDraft = data.toolDraft as ToolDraftSuggestion | undefined;
      const toolSearchResults = data.toolSearchResults as ToolSearchResult[] | undefined;
      const toolDeleteDraft = data.toolDeleteDraft as ToolDeleteDraft | undefined;

      const assistantMessage: AssistantMessage = {
        id: messageId(),
        role: "assistant",
        text: data.answer ?? "Sem resposta.",
        provider: data.provider ?? "groq",
        kind: toolDraft
          ? "quick_add_tool"
          : toolDeleteDraft
            ? "delete_tool"
            : toolSearchResults && toolSearchResults.length > 0
              ? "search_tool"
              : (data.kind ?? "info"),
        results: data.results,
        suggestion:
          toolDraft ??
          (data.suggestion as
            | QuickAddSuggestion
            | QuickAddBatchSuggestion
            | CreateAccountSuggestion
            | RenameAccountSuggestion
            | KeepAccountsSuggestion
            | UpdateLancamentosSuggestion
            | UpdateLancamentosDataSuggestion
            | DeleteLancamentosSuggestion
            | ToolDraftSuggestion
            | undefined),
        plan: data.plan,
        ...(toolSearchResults ? { toolSearchResults } : {}),
        ...(toolDeleteDraft ? { toolDeleteDraft } : {}),
      };

      setMessages((current) => [...current, assistantMessage]);
      setPrompt("");
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: sanitizeAssistantText(error instanceof Error ? error.message : "Falha inesperada no assistente."),
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

      const data = await readJsonResponse<AssistantApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel salvar o lancamento.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: data.duplicated
            ? `Esse lancamento ja existia${data.id ? ` (ID: ${data.id})` : ""}. Nao criei outro.`
            : [
                "Lancamento salvo com sucesso. Atualizei a base da gestao.",
                data.avisoDuplicidade,
              ]
                .filter(Boolean)
                .join("\n"),
          provider: "info",
          kind: "info",
        },
      ]);

      refreshPreservingScroll();
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

      const data = await readJsonResponse<AssistantApiResponse>(response);

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

      refreshPreservingScroll();
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

      const data = await readJsonResponse<AssistantApiResponse>(response);

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

      refreshPreservingScroll();
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

      const data = await readJsonResponse<AssistantApiResponse>(response);

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

      refreshPreservingScroll();
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

      const data = await readJsonResponse<AssistantApiResponse>(response);

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

      refreshPreservingScroll();
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

      const data = await readJsonResponse<AssistantApiResponse>(response);

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

      refreshPreservingScroll();
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

      const data = await readJsonResponse<AssistantApiResponse>(response);

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

      refreshPreservingScroll();
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

      const data = await readJsonResponse<AssistantApiResponse>(response);

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

      refreshPreservingScroll();
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

  // Confirma lançamento vindo do tool calling — reenvia ao /api/assistant com instrução de confirmar
  async function confirmToolQuickAdd(message: AssistantMessage) {
    if (message.role !== "assistant" || message.kind !== "quick_add_tool" || !message.suggestion || !selectedGestaoId) {
      return;
    }

    const draft = message.suggestion as ToolDraftSuggestion;
    setLoading(true);

    try {
      const response = await fetch("/api/ai/quick-add/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gestaoId: selectedGestaoId,
          suggestion: {
            descricao: draft.descricao,
            valorTotal: draft.valor,
            tipo: draft.tipo,
            status: "liquidado",
            meio: draft.meio,
            contaId: draft.contaId,
            categoriaId: draft.categoriaId,
            competenciaData: draft.data,
            competenciaHora: draft.hora,
            confianca: 0.95,
            motivo: "Rascunho confirmado pelo usuario a partir do assistente.",
          },
        }),
      });

      const data = await readJsonResponse<AssistantApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel salvar o lancamento.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: data.duplicated
            ? `Esse lancamento ja existia${data.id ? ` (ID: ${data.id})` : ""}. Nao criei outro.`
            : [
                data.ok ? "Lancamento salvo com sucesso. Atualizei a base da gestao." : "Lancamento salvo.",
                data.avisoDuplicidade,
              ]
                .filter(Boolean)
                .join("\n"),
          provider: "info",
          kind: "info" as const,
        },
      ]);

      refreshPreservingScroll();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel salvar o lancamento.",
          provider: "info",
          kind: "info" as const,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Confirma exclusão vinda do tool calling
  async function confirmToolDelete(message: AssistantMessage) {
    if (message.role !== "assistant" || message.kind !== "delete_tool" || !selectedGestaoId) {
      return;
    }

    // Recupera os IDs da mensagem
    const msgWithDraft = message as AssistantMessage & { toolDeleteDraft?: ToolDeleteDraft };
    const draft = msgWithDraft.toolDeleteDraft;

    if (!draft) return;

    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Confirmar exclusão dos lançamentos com IDs: ${draft.lancamentoIds.join(", ")}. Use deletar_lancamentos com confirmar: true.`,
          gestaoId: selectedGestaoId,
          history: [],
        }),
      });

      const data = await readJsonResponse<AssistantApiResponse>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel apagar os lancamentos.");
      }

      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: data.answer ?? `Apaguei ${draft.quantidade} lancamento(s) com sucesso.`,
          provider: data.provider ?? "groq",
          kind: "info" as const,
        },
      ]);

      refreshPreservingScroll();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Nao foi possivel apagar os lancamentos.",
          provider: "info",
          kind: "info" as const,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-label={open ? "Fechar assistente de IA" : "Abrir assistente de IA"}
        className="fixed right-56 bottom-4 z-[56] flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-white shadow-[0_12px_40px_rgba(30,42,47,0.28)] ring-2 ring-white/15 transition-transform hover:scale-[1.04] active:scale-[0.98] sm:right-60 sm:bottom-6 sm:h-[3.75rem] sm:w-[3.75rem]"
        onClick={() => setOpen((current) => !current)}
        title={open ? "Fechar assistente" : "Assistente IA"}
        type="button"
      >
        {open ? <IconClose className="text-white" /> : <IconSparkAssistant className="text-white" />}
      </button>

      <div
        className={`fixed inset-0 z-30 bg-black/22 backdrop-blur-[1px] transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-[62] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden border-l border-line bg-surface shadow-[0_0_60px_rgba(30,42,47,0.12)] transition-transform duration-300 sm:max-w-md ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="shrink-0 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] text-muted uppercase">Assistente LT</p>
              <h2 className="mt-2 font-heading text-xl font-semibold sm:text-2xl">Chat lateral</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted sm:text-sm"
                onClick={handleNewConversation}
                type="button"
              >
                Nova
              </button>
              <button
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted sm:text-sm"
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
              className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-base sm:text-sm disabled:opacity-60"
              disabled={gestoes.length === 0}
              id="gestao-assistente"
              onChange={(event) => setSelectedGestaoId(Number(event.target.value))}
              value={selectedGestao?.id ?? ""}
            >
              {gestoes.length === 0 ? (
                <option value="">Nenhuma gestao disponivel</option>
              ) : (
                gestoes.map((gestao) => (
                  <option key={gestao.id} value={gestao.id}>
                    {gestao.nome}
                  </option>
                ))
              )}
            </select>
            {gestoes.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Crie uma gestao no app para usar o assistente com seus dados.</p>
            ) : null}
          </div>
        </header>

        <div
          className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 pb-28 sm:space-y-4 sm:px-4 sm:py-4 sm:pb-32"
          ref={messagesContainerRef}
        >
          {messages.map((message) => (
            <article
              className={`max-w-full overflow-hidden rounded-[1.35rem] px-3.5 py-3 sm:rounded-[1.5rem] sm:px-4 ${
                message.role === "user"
                  ? "ml-6 bg-foreground text-white sm:ml-10"
                  : "mr-2 border border-line bg-background sm:mr-6"
              }`}
              key={message.id}
            >
              <p className="whitespace-pre-wrap break-words text-[15px] leading-8 sm:text-sm sm:leading-7">
                {message.text}
              </p>

              {message.role === "assistant" ? (
                <>
                  <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted">
                    <span>{providerLabel(message.provider)}</span>
                    <span>·</span>
                    <span>{message.kind === "quick_add" || message.kind === "quick_add_batch" || message.kind === "account_create" || message.kind === "account_rename" || message.kind === "account_keep" || message.kind === "transactions_update" || message.kind === "transactions_date_update" || message.kind === "transactions_delete" || message.kind === "quick_add_tool" || message.kind === "delete_tool" ? "rascunho" : message.kind}</span>
                  </div>

                  {/* ── TOOL CALLING: rascunho de novo lançamento ── */}
                  {message.kind === "quick_add_tool" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      {(() => {
                        const draft = message.suggestion as ToolDraftSuggestion;
                        const isEditing =
                          editingQuickAddMessageId === message.id && editingQuickAddSuggestion;
                        const contaNome = selectedGestaoContas.find((conta) => conta.id === draft.contaId)?.nome ?? `#${draft.contaId}`;
                        const categoriaNome =
                          selectedGestaoCategorias.find((categoria) => categoria.id === draft.categoriaId)?.nome ??
                          `#${draft.categoriaId}`;
                        return (
                          <>
                            {isEditing ? (
                              <div className="space-y-3">
                                <input
                                  className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) => {
                                      const value = event.currentTarget.value;
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, descricao: value } : current,
                                      );
                                    }}
                                  type="text"
                                  value={editingQuickAddSuggestion.descricao}
                                />
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <input
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    min="0.01"
                                    onChange={(event) => {
                                      const value = Number(event.currentTarget.value || 0);
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, valorTotal: value } : current,
                                      );
                                    }}
                                    step="0.01"
                                    type="number"
                                    value={editingQuickAddSuggestion.valorTotal}
                                  />
                                  <select
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) => {
                                      const value = event.currentTarget.value as QuickAddSuggestion["meio"];
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, meio: value } : current,
                                      );
                                    }}
                                    value={editingQuickAddSuggestion.meio ?? "outro"}
                                  >
                                    <option value="pix">PIX</option>
                                    <option value="debito">Debito</option>
                                    <option value="credito">Credito</option>
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="ted_doc">TED/DOC</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="outro">Outro</option>
                                  </select>
                                  <DateInput
                                    className="rounded-2xl border border-line bg-background px-4 py-3"
                                    onValueChange={(value) =>
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, competenciaData: value } : current,
                                      )
                                    }
                                    value={editingQuickAddSuggestion.competenciaData}
                                  />
                                  <input
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) => {
                                      const value = event.currentTarget.value || undefined;
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, competenciaHora: value } : current,
                                      );
                                    }}
                                    type="time"
                                    value={editingQuickAddSuggestion.competenciaHora ?? ""}
                                  />
                                  <select
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) => {
                                      const value = Number(event.currentTarget.value);
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, contaId: value } : current,
                                      );
                                    }}
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
                                    onChange={(event) => {
                                      const value = Number(event.currentTarget.value);
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, categoriaId: value } : current,
                                      );
                                    }}
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
                                <p className="break-words">
                                  <strong>Descricao:</strong> {draft.descricao}
                                </p>
                                <p>
                                  <strong>Valor:</strong> {money(draft.valor)}
                                </p>
                                <p>
                                  <strong>Tipo:</strong> {draft.tipo}
                                </p>
                                <p>
                                  <strong>Conta:</strong> {contaNome}
                                </p>
                                <p>
                                  <strong>Categoria:</strong> {categoriaNome}
                                </p>
                                <p>
                                  <strong>Data:</strong> {draft.data}
                                </p>
                                {draft.hora ? (
                                  <p>
                                    <strong>Hora:</strong> {draft.hora}
                                  </p>
                                ) : null}
                                <p>
                                  <strong>Meio:</strong> {draft.meio}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button
                                    className="rounded-full border border-line bg-background px-4 py-2 text-sm font-medium text-foreground"
                                    onClick={() => startQuickAddEditing(message)}
                                    type="button"
                                  >
                                    Editar rascunho
                                  </button>
                                  <button
                                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                    disabled={loading}
                                    onClick={() => confirmToolQuickAdd(message)}
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

                  {/* ── TOOL CALLING: resultados de busca ── */}
                  {message.kind === "search_tool" ? (
                    <div className="mt-4 space-y-2">
                      {(message.toolSearchResults ?? [])
                        .slice(0, 8)
                        .map((result) => (
                          <div className="rounded-2xl bg-surface px-3 py-3 text-sm" key={result.id}>
                            <p className="break-words font-medium">{result.descricao}</p>
                            <p className="mt-1 text-muted">
                              {result.competencia_data}
                              {result.conta_nome ? ` · ${result.conta_nome}` : ""}
                              {result.categoria_nome ? ` · ${result.categoria_nome}` : ""}
                              {" · "}
                              <span className={result.tipo === "receita" ? "text-green-600" : ""}>
                                {money(result.valor_total)}
                              </span>
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : null}

                  {/* ── TOOL CALLING: confirmação de exclusão ── */}
                  {message.kind === "delete_tool" ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      {(() => {
                        const draft = message.toolDeleteDraft;
                        if (!draft) return null;
                        return (
                          <>
                            <p>
                              <strong>Lancamentos a apagar:</strong> {draft.quantidade}
                            </p>
                            <button
                              className="mt-2 rounded-full bg-[var(--color-danger,#b42318)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                              disabled={loading}
                              onClick={() => confirmToolDelete(message)}
                              type="button"
                            >
                              Confirmar e apagar
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {message.kind === "quick_add" && message.suggestion ? (
                    <div className="mt-4 space-y-2 rounded-2xl bg-surface px-3 py-3 text-sm">
                      {(() => {
                        const suggestion = message.suggestion as QuickAddSuggestion;
                        const isEditing =
                          editingQuickAddMessageId === message.id && editingQuickAddSuggestion;
                        const contaNome =
                          selectedGestaoContas.find((conta) => conta.id === suggestion.contaId)?.nome ??
                          `#${suggestion.contaId}`;
                        const categoriaNome =
                          selectedGestaoCategorias.find((categoria) => categoria.id === suggestion.categoriaId)?.nome ??
                          `#${suggestion.categoriaId}`;

                        return (
                          <>
                            {isEditing ? (
                              <div className="space-y-3">
                                <input
                                  className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                  onChange={(event) => {
                                    const value = event.currentTarget.value;
                                    setEditingQuickAddSuggestion((current) =>
                                      current ? { ...current, descricao: value } : current,
                                    );
                                  }}
                                  type="text"
                                  value={editingQuickAddSuggestion.descricao}
                                />

                                <div className="grid gap-2 sm:grid-cols-2">
                                  <input
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    min="0.01"
                                    onChange={(event) => {
                                      const value = Number(event.currentTarget.value || 0);
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, valorTotal: value } : current,
                                      );
                                    }}
                                    step="0.01"
                                    type="number"
                                    value={editingQuickAddSuggestion.valorTotal}
                                  />
                                  <select
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) => {
                                      const value = (event.currentTarget.value || undefined) as QuickAddSuggestion["meio"];
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, meio: value } : current,
                                      );
                                    }}
                                    value={editingQuickAddSuggestion.meio ?? ""}
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
                                    onChange={(event) => {
                                      const value = event.currentTarget.value || undefined;
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, competenciaHora: value } : current,
                                      );
                                    }}
                                    type="time"
                                    value={editingQuickAddSuggestion.competenciaHora ?? ""}
                                  />

                                  <select
                                    className="w-full rounded-2xl border border-line bg-background px-4 py-3"
                                    onChange={(event) => {
                                      const value = Number(event.currentTarget.value);
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, contaId: value } : current,
                                      );
                                    }}
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
                                    onChange={(event) => {
                                      const value = Number(event.currentTarget.value);
                                      setEditingQuickAddSuggestion((current) =>
                                        current ? { ...current, categoriaId: value } : current,
                                      );
                                    }}
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
                                <p className="break-words">
                                  <strong>Descricao:</strong> {suggestion.descricao}
                                </p>
                                <p>
                                  <strong>Valor:</strong> {money(suggestion.valorTotal)}
                                </p>
                                <p>
                                  <strong>Conta:</strong> {contaNome}
                                </p>
                                <p>
                                  <strong>Categoria:</strong> {categoriaNome}
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
                          <p className="break-words font-medium">{result.descricao}</p>
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

        <div className="shrink-0 border-t border-line bg-surface px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 sm:px-4 sm:py-4">
          <div className="rounded-[1.35rem] border border-line bg-background p-3 sm:rounded-[1.5rem]">
            <textarea
              className="min-h-20 max-h-40 w-full resize-none bg-transparent text-[15px] leading-7 outline-none sm:min-h-28 sm:text-sm"
              onKeyDown={handleKeyDown}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Pergunte sobre os lancamentos, fale no microfone ou descreva uma compra..."
              value={prompt}
            />
            {voiceError ? <p className="mt-2 text-xs text-[var(--color-danger,#b42318)]">{voiceError}</p> : null}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xs text-xs leading-5 text-muted">
                Exemplo: qual foi o ultimo lancamento? / mercado 182,90 hoje / toque em Falar
              </p>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-2">
                <button
                  className={`rounded-full border px-4 py-3 text-sm font-semibold ${
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
                  className="rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
