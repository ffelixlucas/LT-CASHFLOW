/**
 * Assistente com tool calling via Groq (API compatível com OpenAI).
 */

import { NextResponse } from "next/server";

import type { LancamentoMeio } from "@ltcashflow/validation";

import { auth } from "@/lib/server/auth";
import { userCanMutateGestao } from "@/lib/server/permissions";
import {
  createLancamento,
  deleteLancamentos,
  findRecentDuplicateLancamentoId,
  getAvailableBalance,
  getCashOverview,
  listCategorias,
  listContas,
  searchLancamentos,
  summarizeLancamentos,
  summarizeLancamentosByCategoria,
  summarizeLancamentosByConta,
  summarizeLancamentosByDia,
  updateLancamentosCompetenciaData,
  updateLancamentosMeio,
  userHasGestaoAccess,
  type SearchLancamentosInput,
} from "@/lib/server/repository";

type Role = "user" | "assistant" | "tool";

interface Message {
  role: Role;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "buscar_lancamentos",
      description:
        "Busca lançamentos (entradas, saídas, despesas, receitas) com filtros opcionais. Use para responder perguntas como 'quanto gastei no mercado', 'me mostra as últimas despesas', etc.",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: ["receita", "despesa", "transferencia", "ajuste"],
            description: "Tipo do lançamento. Omita para buscar todos.",
          },
          categoriaId: {
            type: "number",
            description: "ID da categoria. Use listar_categorias primeiro para obter o ID.",
          },
          contaId: {
            type: "number",
            description: "ID da conta. Use listar_contas primeiro para obter o ID.",
          },
          dataInicio: {
            type: "string",
            description: "Data inicial no formato YYYY-MM-DD.",
          },
          dataFim: {
            type: "string",
            description: "Data final no formato YYYY-MM-DD.",
          },
          descricao: {
            type: "string",
            description: "Texto para busca na descrição do lançamento (ou categoria/conta relacionada).",
          },
          ordem: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Ordem dos resultados. Use asc para primeiro/mais antigo e desc para ultimo/mais recente.",
          },
          limite: {
            type: "number",
            description: "Quantidade máxima de resultados retornados ao modelo. Padrão: 20 (máx. 50).",
          },
        },
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "resumir_lancamentos",
      description:
        "Retorna totais e somas agrupados. Use para 'quanto gastei no total', 'qual categoria gastei mais', 'resumo do mês', etc.",
      parameters: {
        type: "object",
        properties: {
          agrupar_por: {
            type: "string",
            enum: ["categoria", "conta", "dia", "total"],
            description: "Como agrupar os resultados.",
          },
          tipo: {
            type: "string",
            enum: ["receita", "despesa", "transferencia", "ajuste"],
            description: "Tipo do lançamento. Omita para todos.",
          },
          dataInicio: {
            type: "string",
            description: "Data inicial YYYY-MM-DD.",
          },
          dataFim: {
            type: "string",
            description: "Data final YYYY-MM-DD.",
          },
          contaId: {
            type: "number",
            description: "Filtrar por conta.",
          },
        },
        required: ["agrupar_por"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "saldo_disponivel",
      description: "Retorna o saldo disponível atual da gestão.",
      parameters: {
        type: "object",
        properties: {},
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "overview_caixa",
      description:
        "Visão geral do caixa (entradas em conta, despesas, saídas da conta). Use para 'resumo geral', 'como está meu caixa', etc.",
      parameters: {
        type: "object",
        properties: {},
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listar_contas",
      description: "Lista todas as contas da gestão com IDs, nomes e tipos. Use antes de filtrar por conta.",
      parameters: {
        type: "object",
        properties: {},
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listar_categorias",
      description: "Lista todas as categorias com IDs, nomes e natureza. Use antes de filtrar por categoria.",
      parameters: {
        type: "object",
        properties: {},
        required: [] as string[],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "criar_lancamento",
      description:
        "Cria um novo lançamento (entrada ou saída). Use listar_contas e listar_categorias para IDs. Peça confirmação: primeiro confirmar false (rascunho), depois confirmar true.",
      parameters: {
        type: "object",
        properties: {
          descricao: {
            type: "string",
            description: "Descrição do lançamento.",
          },
          valor: {
            type: "number",
            description: "Valor em reais.",
          },
          tipo: {
            type: "string",
            enum: ["receita", "despesa"],
            description: "Tipo do lançamento.",
          },
          contaId: {
            type: "number",
            description: "ID da conta.",
          },
          categoriaId: {
            type: "number",
            description: "ID da categoria.",
          },
          data: {
            type: "string",
            description: "Data no formato YYYY-MM-DD. Padrão: hoje.",
          },
          hora: {
            type: "string",
            description: "Hora no formato HH:mm quando o usuario informar horario.",
          },
          meio: {
            type: "string",
            enum: ["pix", "credito", "debito", "dinheiro", "ted_doc", "transferencia", "outro"],
            description: "Meio de pagamento.",
          },
          confirmar: {
            type: "boolean",
            description:
              "true = executar gravação. false = apenas rascunho para o usuário confirmar. Padrão: false.",
          },
        },
        required: ["descricao", "valor", "tipo", "contaId", "categoriaId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deletar_lancamentos",
      description:
        "Remove lançamentos por ID. Use buscar_lancamentos antes para mostrar o que será apagado. confirmar false apenas prepara; true executa.",
      parameters: {
        type: "object",
        properties: {
          lancamentoIds: {
            type: "array",
            items: { type: "number" },
            description: "IDs dos lançamentos a deletar.",
          },
          confirmar: {
            type: "boolean",
            description: "true = executar. false = apenas aviso do que seria deletado.",
          },
        },
        required: ["lancamentoIds", "confirmar"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "atualizar_meio_lancamentos",
      description: "Atualiza o meio de pagamento de lançamentos existentes.",
      parameters: {
        type: "object",
        properties: {
          lancamentoIds: {
            type: "array",
            items: { type: "number" },
            description: "IDs dos lançamentos.",
          },
          meio: {
            type: "string",
            enum: ["pix", "credito", "debito", "dinheiro", "ted_doc", "transferencia", "outro"],
          },
        },
        required: ["lancamentoIds", "meio"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "atualizar_data_lancamentos",
      description: "Atualiza a data de competência de lançamentos existentes.",
      parameters: {
        type: "object",
        properties: {
          lancamentoIds: {
            type: "array",
            items: { type: "number" },
            description: "IDs dos lançamentos.",
          },
          data: {
            type: "string",
            description: "Nova data YYYY-MM-DD.",
          },
        },
        required: ["lancamentoIds", "data"],
      },
    },
  },
];

function buildSystemPrompt(gestaoId: number, hoje: string) {
  return `Voce e um assistente financeiro integrado ao LT CashFlow.
Data de hoje: ${hoje}
Gestao ativa (id): ${gestaoId}

Voce tem ferramentas que consultam e alteram dados do usuario nesta gestao.

Regras:
- Responda em portugues brasileiro, claro e objetivo.
- Para consultas, use as ferramentas e interprete os JSONs retornados.
- Para "primeiro lancamento", "mais antigo" ou "inicio da base", use buscar_lancamentos com ordem asc.
- Para "ultimo lancamento" ou "mais recente", use buscar_lancamentos com ordem desc.
- Para criar ou deletar, SEMPRE pare apos confirmar: false (rascunho / aviso) e aguarde uma nova mensagem do usuario.
- NUNCA chame uma ferramenta de mutacao com confirmar: true no mesmo turno do rascunho. Confirmar: true so e permitido em um turno cuja mensagem do usuario seja uma confirmacao explicita ("pode salvar", "confirma", "apaga mesmo", etc.).
- Para IDs de conta ou categoria, use listar_contas e listar_categorias quando necessario.
- Quando o usuario disser "igual sempre", "como sempre", "igual o ultimo de X" ou "mesmo padrao", use o historico de lancamentos parecidos para reaproveitar descricao, conta, categoria e meio. Preserve valor, data e hora pedidos pelo usuario.
- Formate valores em R$ no texto final.
- Nao invente dados fora do retorno das ferramentas.
- Se uma ferramenta retornar erro, explique ao usuario.`;
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

type AssistantToolDraft = {
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  contaId: number;
  categoriaId: number;
  data: string;
  hora?: string;
  meio: string;
};

type AssistantToolSearchRow = {
  id: number;
  descricao: string;
  valor_total: string | number;
  competencia_data: string;
  categoria_nome?: string | null;
  conta_nome?: string;
  tipo?: string;
};

type AssistantToolDeleteDraft = {
  lancamentoIds: number[];
  quantidade: number;
};

type AssistantToolArtifacts = {
  toolDraft?: AssistantToolDraft;
  toolSearchResults?: AssistantToolSearchRow[];
  toolDeleteDraft?: AssistantToolDeleteDraft;
};

/** Acumula dados para cards no `global-assistant` (ultima chamada relevante sobrescreve busca). */
function mergeToolArtifactsFromResult(toolName: string, jsonStr: string, out: AssistantToolArtifacts) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return;
  }

  const o = parsed as Record<string, unknown>;

  if (toolName === "buscar_lancamentos") {
    const rows = o.lancamentos;
    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    out.toolSearchResults = rows.map((row): AssistantToolSearchRow => {
      const r = row as Record<string, unknown>;
      return {
        id: Number(r.id),
        descricao: String(r.descricao ?? ""),
        valor_total: r.valor_total as string | number,
        competencia_data: String(r.competencia_data ?? ""),
        categoria_nome: r.categoria_nome != null ? String(r.categoria_nome) : null,
        conta_nome: r.conta_nome != null ? String(r.conta_nome) : undefined,
        tipo: r.tipo != null ? String(r.tipo) : undefined,
      };
    });
  }

  if (toolName === "criar_lancamento") {
    if (o.status !== "rascunho") {
      return;
    }

    const raw = o.rascunho as Record<string, unknown> | undefined;
    if (!raw) {
      return;
    }

    const tipo = raw.tipo === "receita" || raw.tipo === "despesa" ? raw.tipo : null;
    if (!tipo) {
      return;
    }

    const contaId = Number(raw.contaId);
    const categoriaId = Number(raw.categoriaId);
    if (!Number.isFinite(contaId) || !Number.isFinite(categoriaId)) {
      return;
    }

    const valor = typeof raw.valor === "number" ? raw.valor : Number(raw.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      return;
    }

    out.toolDraft = {
      descricao: String(raw.descricao ?? ""),
      valor,
      tipo,
      contaId,
      categoriaId,
      data: String(raw.data ?? ""),
      hora: typeof raw.hora === "string" ? raw.hora : undefined,
      meio: typeof raw.meio === "string" ? raw.meio : "pix",
    };
  }

  if (toolName === "deletar_lancamentos") {
    if (o.status !== "aguardando_confirmacao") {
      return;
    }

    const ids = o.lancamentoIds;
    if (!Array.isArray(ids)) {
      return;
    }

    const lancamentoIds = ids.filter((x): x is number => typeof x === "number");
    if (lancamentoIds.length === 0) {
      return;
    }

    out.toolDeleteDraft = {
      lancamentoIds,
      quantidade: lancamentoIds.length,
    };
  }
}

function searchTipo(value: unknown): SearchLancamentosInput["tipo"] | undefined {
  if (value === "receita" || value === "despesa" || value === "transferencia" || value === "ajuste") {
    return value;
  }
  return undefined;
}

function clampLimite(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return 20;
  }
  return Math.min(50, Math.floor(n));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function extractTimeFromText(value: string) {
  const match = value.match(/\b(?:as|às)?\s*([01]?\d|2[0-3])[:h]([0-5]\d)\b/i);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

function wantsHistoricalPattern(value: string) {
  const normalized = normalizeText(value);

  return (
    /\b(igual|como)\s+(sempre|costume)\b/.test(normalized) ||
    /\bigual\s+(o|a)?\s*(ultimo|ultima|anterior)\b/.test(normalized) ||
    /\b(com|da|do)\s+descri[cç]ao\s+igual\b/.test(normalized) ||
    /\b(mesmo|mesma)\s+padrao\b/.test(normalized) ||
    /\bpix\s+recebido\s+-?\s*\d{2,3}(?:[.\s-]\d{3})+\b/.test(normalized)
  );
}

function extractHistoricalSearchText(value: string) {
  const normalized = normalizeText(value);
  const pixReceivedMatch = normalized.match(/\bpix\s+recebido\s+([0-9][0-9.\s-]{2,})/);

  if (pixReceivedMatch?.[1]) {
    return pixReceivedMatch[1].trim().replace(/\s+/g, " ");
  }

  const numericMatch = normalized.match(/\b\d{2,3}(?:[.\s-]\d{3})+\b/);

  if (numericMatch?.[0]) {
    return numericMatch[0].trim();
  }

  return null;
}

async function applyHistoricalCreatePattern(
  args: Record<string, unknown>,
  gestaoId: number,
  userPrompt?: string | null,
): Promise<Record<string, unknown>> {
  const descricao = typeof args.descricao === "string" ? args.descricao : "";
  const referenceText = `${userPrompt ?? ""} ${descricao}`.trim();

  if (!referenceText || !wantsHistoricalPattern(referenceText)) {
    return args;
  }

  const searchText = extractHistoricalSearchText(referenceText);

  if (!searchText) {
    return args;
  }

  const valor = typeof args.valor === "number" ? args.valor : Number(args.valor);
  const rows = await searchLancamentos({
    gestaoId,
    tipo: searchTipo(args.tipo),
    text: searchText,
    order: "desc",
  });
  const historical =
    rows.find((row) => Number.isFinite(valor) && Math.abs(Number(row.valor_total) - valor) < 0.005) ??
    rows[0];

  if (!historical) {
    return args;
  }

  const tipo =
    historical.tipo === "receita" || historical.tipo === "despesa"
      ? historical.tipo
      : args.tipo;
  const hora = typeof args.hora === "string" ? args.hora : extractTimeFromText(referenceText) ?? undefined;

  return {
    ...args,
    descricao: historical.descricao,
    tipo,
    contaId: historical.conta_id,
    categoriaId: historical.categoria_id ?? args.categoriaId,
    meio: historical.meio ?? args.meio,
    ...(hora ? { hora } : {}),
  };
}

async function normalizeCreateLancamentoArgs(
  args: Record<string, unknown>,
  gestaoId: number,
  userPrompt?: string | null,
): Promise<Record<string, unknown>> {
  const tipo = args.tipo === "receita" || args.tipo === "despesa" ? args.tipo : null;
  const meio = typeof args.meio === "string" ? args.meio : undefined;
  const contaId = typeof args.contaId === "number" ? args.contaId : Number(args.contaId);
  const categoriaId = typeof args.categoriaId === "number" ? args.categoriaId : Number(args.categoriaId);

  const [contas, categorias] = await Promise.all([listContas(gestaoId), listCategorias(gestaoId)]);
  const currentConta = contas.find((conta) => conta.id === contaId);
  const currentCategoria = categorias.find((categoria) => categoria.id === categoriaId);
  const referenceText = normalizeText(`${userPrompt ?? ""} ${String(args.descricao ?? "")}`);
  const next = { ...args };

  if (tipo === "despesa" && meio === "credito" && currentConta?.tipo !== "cartao_credito") {
    const wantsLucas = currentConta ? /\blucas\b/.test(normalizeText(currentConta.nome)) : false;
    const card =
      contas.find((conta) => conta.tipo === "cartao_credito" && (!wantsLucas || /\blucas\b/.test(normalizeText(conta.nome)))) ??
      contas.find((conta) => conta.tipo === "cartao_credito");

    if (card) {
      next.contaId = card.id;
    }
  }

  const categoryNatureInvalid =
    tipo === "receita"
      ? currentCategoria?.natureza === "despesa"
      : tipo === "despesa"
        ? currentCategoria?.natureza === "receita"
        : false;

  if (tipo && (!currentCategoria || categoryNatureInvalid)) {
    const desiredCategoryName =
      tipo === "receita"
        ? "Renda"
        : /\b(planta|moradia|casa|reforma|material de construcao|construcao)\b/.test(referenceText)
          ? "Moradia"
          : /\b(super\s*mercado|supermercado|mercado|feira|padaria|restaurante|ifood)\b/.test(referenceText)
            ? "Alimentacao"
            : "Outros";
    const desired = categorias.find(
      (categoria) =>
        normalizeText(categoria.nome) === normalizeText(desiredCategoryName) &&
        (categoria.natureza === tipo || categoria.natureza === "ambos"),
    );
    const fallback = categorias.find((categoria) => categoria.natureza === tipo || categoria.natureza === "ambos");

    if (desired ?? fallback) {
      next.categoriaId = (desired ?? fallback)?.id;
    }
  }

  return next;
}

/** Agrupamentos SQL não filtram por transferência — remove o campo nesse caso. */
function filtersForSummarizeQueries(
  base: SearchLancamentosInput,
): SearchLancamentosInput & { tipo?: "receita" | "despesa" | "ajuste" } {
  if (base.tipo === "transferencia") {
    const { tipo, ...rest } = base;
    void tipo;
    return rest;
  }
  return base as SearchLancamentosInput & { tipo?: "receita" | "despesa" | "ajuste" };
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  gestaoId: number,
  userId: number,
  userPrompt?: string | null,
): Promise<string> {
  try {
    switch (name) {
      case "buscar_lancamentos": {
        const rows = await searchLancamentos({
          gestaoId,
          tipo: searchTipo(args.tipo),
          categoriaId: typeof args.categoriaId === "number" ? args.categoriaId : undefined,
          contaId: typeof args.contaId === "number" ? args.contaId : undefined,
          dateFrom: typeof args.dataInicio === "string" ? args.dataInicio : undefined,
          dateTo: typeof args.dataFim === "string" ? args.dataFim : undefined,
          text: typeof args.descricao === "string" ? args.descricao : undefined,
          order: args.ordem === "asc" || args.ordem === "desc" ? args.ordem : undefined,
        });
        const limite = clampLimite(args.limite);
        const sliced = rows.slice(0, limite);
        return JSON.stringify({
          total_retornado_ao_modelo: sliced.length,
          total_disponivel_na_busca: rows.length,
          lancamentos: sliced,
        });
      }

      case "resumir_lancamentos": {
        const baseFilters: SearchLancamentosInput = {
          gestaoId,
          tipo: searchTipo(args.tipo),
          dateFrom: typeof args.dataInicio === "string" ? args.dataInicio : undefined,
          dateTo: typeof args.dataFim === "string" ? args.dataFim : undefined,
          contaId: typeof args.contaId === "number" ? args.contaId : undefined,
        };

        const modo = args.agrupar_por;
        const summarizeFilters = filtersForSummarizeQueries(baseFilters);

        if (modo === "categoria") {
          const data = await summarizeLancamentosByCategoria(summarizeFilters);
          return JSON.stringify(data);
        }

        if (modo === "conta") {
          const data = await summarizeLancamentosByConta(summarizeFilters);
          return JSON.stringify(data);
        }

        if (modo === "dia") {
          const data = await summarizeLancamentosByDia(summarizeFilters);
          return JSON.stringify(data);
        }

        const data = await summarizeLancamentos(summarizeFilters);
        return JSON.stringify(data);
      }

      case "saldo_disponivel": {
        const saldo = await getAvailableBalance(gestaoId);
        return JSON.stringify({ saldo_disponivel: saldo });
      }

      case "overview_caixa": {
        const overview = await getCashOverview(gestaoId);
        return JSON.stringify(overview);
      }

      case "listar_contas": {
        const contas = await listContas(gestaoId);
        return JSON.stringify(contas);
      }

      case "listar_categorias": {
        const categorias = await listCategorias(gestaoId);
        return JSON.stringify(categorias);
      }

      case "criar_lancamento": {
        args = await applyHistoricalCreatePattern(args, gestaoId, userPrompt);
        args = await normalizeCreateLancamentoArgs(args, gestaoId, userPrompt);

        const confirmar = Boolean(args.confirmar);
        const hoje = new Date().toISOString().slice(0, 10);

        const descricao = typeof args.descricao === "string" ? args.descricao : "";
        const valor = typeof args.valor === "number" ? args.valor : Number(args.valor);
        const tipo = args.tipo === "receita" || args.tipo === "despesa" ? args.tipo : null;
        const contaId = typeof args.contaId === "number" ? args.contaId : NaN;
        const categoriaId = typeof args.categoriaId === "number" ? args.categoriaId : NaN;
        const data = typeof args.data === "string" ? args.data : hoje;
        const hora = typeof args.hora === "string" ? args.hora : undefined;
        const meioRaw = typeof args.meio === "string" ? args.meio : "pix";
        const meio = meioRaw as LancamentoMeio;

        const rascunho = {
          descricao,
          valor,
          tipo,
          contaId,
          categoriaId,
          data,
          hora,
          meio,
        };

        if (!confirmar) {
          return JSON.stringify({
            status: "rascunho",
            mensagem: "Rascunho pronto. Peça confirmacao ao usuario antes de gravar.",
            rascunho,
          });
        }

        if (!tipo || !Number.isFinite(valor) || valor <= 0 || !Number.isFinite(contaId) || !Number.isFinite(categoriaId)) {
          return JSON.stringify({ erro: "Parametros invalidos para criar_lancamento." });
        }

        const pode = await userCanMutateGestao(userId, gestaoId);
        if (!pode) {
          return JSON.stringify({ erro: "Sem permissao para criar lancamentos nesta gestao." });
        }

        // Idempotência: se já existe um lançamento "gêmeo" criado nos últimos 2 minutos,
        // devolve o id existente em vez de inserir de novo. Cobre dois cenários do bug
        // de duplicidade: (a) o modelo chama `criar_lancamento` com confirmar:true no
        // mesmo turno do rascunho; (b) o usuário clica "Confirmar e salvar" depois.
        const existingId = await findRecentDuplicateLancamentoId({
          gestaoId,
          contaId,
          valorTotal: valor,
          descricao,
          competenciaData: data,
          segundos: 120,
        });

        if (existingId != null) {
          return JSON.stringify({ status: "ja_existente", lancamentoId: existingId });
        }

        const insertId = await createLancamento({
          gestaoId,
          userId,
          contaId,
          categoriaId,
          descricao,
          tipo,
          status: "liquidado",
          meio,
          valorTotal: valor,
          competenciaData: data,
          competenciaHora: hora,
        });

        return JSON.stringify({ status: "criado", lancamentoId: insertId });
      }

      case "deletar_lancamentos": {
        const ids = Array.isArray(args.lancamentoIds)
          ? args.lancamentoIds.filter((x): x is number => typeof x === "number")
          : [];
        const confirmar = Boolean(args.confirmar);

        if (!confirmar) {
          return JSON.stringify({
            status: "aguardando_confirmacao",
            mensagem: `Prestes a deletar ${ids.length} lancamento(s). Confirme para prosseguir.`,
            lancamentoIds: ids,
          });
        }

        const pode = await userCanMutateGestao(userId, gestaoId);
        if (!pode) {
          return JSON.stringify({ erro: "Sem permissao para deletar lancamentos nesta gestao." });
        }

        const affected = await deleteLancamentos({ gestaoId, lancamentoIds: ids });
        return JSON.stringify({ status: "deletado", registros_afetados: affected });
      }

      case "atualizar_meio_lancamentos": {
        const ids = Array.isArray(args.lancamentoIds)
          ? args.lancamentoIds.filter((x): x is number => typeof x === "number")
          : [];
        const meio = typeof args.meio === "string" ? (args.meio as LancamentoMeio) : null;

        if (!meio) {
          return JSON.stringify({ erro: "Meio invalido." });
        }

        const pode = await userCanMutateGestao(userId, gestaoId);
        if (!pode) {
          return JSON.stringify({ erro: "Sem permissao para atualizar lancamentos nesta gestao." });
        }

        const affected = await updateLancamentosMeio({
          gestaoId,
          lancamentoIds: ids,
          meio,
        });
        return JSON.stringify({ status: "atualizado", registros_afetados: affected });
      }

      case "atualizar_data_lancamentos": {
        const ids = Array.isArray(args.lancamentoIds)
          ? args.lancamentoIds.filter((x): x is number => typeof x === "number")
          : [];
        const competenciaData = typeof args.data === "string" ? args.data : "";

        const pode = await userCanMutateGestao(userId, gestaoId);
        if (!pode) {
          return JSON.stringify({ erro: "Sem permissao para atualizar lancamentos nesta gestao." });
        }

        const affected = await updateLancamentosCompetenciaData({
          gestaoId,
          lancamentoIds: ids,
          competenciaData,
        });
        return JSON.stringify({ status: "atualizado", registros_afetados: affected });
      }

      default:
        return JSON.stringify({ erro: `Ferramenta desconhecida: ${name}` });
    }
  } catch (error) {
    return JSON.stringify({ erro: error instanceof Error ? error.message : String(error) });
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Espera sugerida pelo Groq em TPM/RPM (ex.: "try again in 31.18s"). */
function parseGroqRetryAfterMs(body: string): number | null {
  const match = body.match(/try again in ([\d.]+)\s*s/i);

  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(Math.ceil(seconds * 1000) + 1200, 90_000);
    }
  }

  return null;
}

function isGroqRateLimited(status: number, body: string) {
  return (
    status === 429 ||
    body.includes("rate_limit_exceeded") ||
    body.includes("Rate limit reached")
  );
}

function friendlyGroqRateLimitReply(body: string) {
  const waitMs = parseGroqRetryAfterMs(body);

  if (waitMs) {
    const waitSeconds = Math.ceil(waitMs / 1000);
    return `O assistente ficou sobrecarregado agora. Tente novamente em cerca de ${waitSeconds}s.`;
  }

  return "O assistente ficou sobrecarregado agora. Tente novamente em alguns segundos.";
}

async function callGroqWithTools(
  messages: Message[],
  gestaoId: number,
  userId: number,
): Promise<{ reply: string; artifacts: AssistantToolArtifacts }> {
  const artifacts: AssistantToolArtifacts = {};
  const apiKey = process.env.GROQ_API_KEY;
  const baseUrl = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  if (!apiKey) {
    return {
      reply: "Configure GROQ_API_KEY para usar o assistente com ferramentas.",
      artifacts,
    };
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const systemPrompt = buildSystemPrompt(gestaoId, hoje);

  const history: Message[] = [...messages];
  const latestUserPrompt =
    [...messages].reverse().find((message) => message.role === "user")?.content ?? null;
  const MAX_ROUNDS = 8;
  const MAX_HTTP_ATTEMPTS = 4;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let response: Response | null = null;
    let lastErrBody = "";

    for (let httpTry = 0; httpTry < MAX_HTTP_ATTEMPTS; httpTry++) {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, ...history],
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.3,
          max_tokens: (() => {
            const n = Number(process.env.GROQ_MAX_TOKENS);
            return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 512) : 384;
          })(),
        }),
      });

      if (response.ok) {
        break;
      }

      lastErrBody = await response.text();

      if (!isGroqRateLimited(response.status, lastErrBody) || httpTry === MAX_HTTP_ATTEMPTS - 1) {
        if (isGroqRateLimited(response.status, lastErrBody)) {
          return { reply: friendlyGroqRateLimitReply(lastErrBody), artifacts };
        }

        console.error("[assistant/groq]", {
          status: response.status,
          body: lastErrBody.slice(0, 500),
        });
        return {
          reply: "Nao consegui consultar o assistente agora. Tente novamente em instantes.",
          artifacts,
        };
      }

      const waitMs = parseGroqRetryAfterMs(lastErrBody) ?? 10_000;
      await sleep(waitMs);
    }

    if (!response?.ok) {
      return {
        reply: isGroqRateLimited(response?.status ?? 0, lastErrBody)
          ? friendlyGroqRateLimitReply(lastErrBody)
          : "Nao consegui consultar o assistente agora. Tente novamente em instantes.",
        artifacts,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{
        finish_reason?: string;
        message?: {
          role?: string;
          content?: string | null;
          tool_calls?: ToolCall[];
        };
      }>;
    };

    const choice = data.choices?.[0];
    const msg = choice?.message;

    if (!msg) {
      return { reply: "Nao consegui processar a resposta do modelo.", artifacts };
    }

    const toolCalls = msg.tool_calls;

    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      history.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        const toolArgs = parseToolArguments(toolCall.function.arguments);
        const toolResult = await executeTool(
          toolCall.function.name,
          toolArgs,
          gestaoId,
          userId,
          latestUserPrompt,
        );
        mergeToolArtifactsFromResult(toolCall.function.name, toolResult, artifacts);

        history.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: toolResult,
        });
      }

      continue;
    }

    return {
      reply: msg.content?.trim() || "Sem resposta.",
      artifacts,
    };
  }

  return {
    reply: "Limite de interacoes com ferramentas atingido. Tente uma pergunta mais simples.",
    artifacts,
  };
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const body = (await req.json()) as {
      prompt?: string;
      gestaoId?: number;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      previousPrompt?: string;
      previousAnswer?: string;
    };

    const prompt = body.prompt?.trim();
    const gestaoId = Number(body.gestaoId);

    if (!prompt || !gestaoId) {
      return NextResponse.json({ error: "Prompt e gestao sao obrigatorios." }, { status: 400 });
    }

    if (!(await userHasGestaoAccess(userId, gestaoId))) {
      return NextResponse.json({ error: "Sem acesso a essa gestao." }, { status: 403 });
    }

    const messages: Message[] = [];

    if (Array.isArray(body.history) && body.history.length > 0) {
      for (const m of body.history) {
        if ((m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
          messages.push({ role: m.role, content: m.content });
        }
      }
    } else if (body.previousPrompt?.trim() && body.previousAnswer?.trim()) {
      messages.push({ role: "user", content: body.previousPrompt.trim() });
      messages.push({ role: "assistant", content: body.previousAnswer.trim() });
    }

    messages.push({ role: "user", content: prompt });

    const { reply, artifacts } = await callGroqWithTools(messages, gestaoId, userId);
    const provider = process.env.GROQ_API_KEY ? "groq" : "local";

    return NextResponse.json({
      answer: reply,
      provider,
      kind: "info",
      results: [],
      ...(artifacts.toolDraft ? { toolDraft: artifacts.toolDraft } : {}),
      ...(artifacts.toolSearchResults ? { toolSearchResults: artifacts.toolSearchResults } : {}),
      ...(artifacts.toolDeleteDraft ? { toolDeleteDraft: artifacts.toolDeleteDraft } : {}),
    });
  } catch (error) {
    console.error("[assistant/route]", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
