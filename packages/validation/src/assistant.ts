import { z } from "zod";

import { lancamentoMeioSchema } from "./financeiro";

export const quickAddSuggestionSchema = z.object({
  descricao: z.string().min(2),
  tipo: z.enum(["receita", "despesa", "ajuste"]),
  status: z.enum(["previsto", "pendente", "liquidado"]).default("liquidado"),
  meio: lancamentoMeioSchema.optional(),
  valorTotal: z.number().positive(),
  competenciaData: z.string().min(10),
  competenciaHora: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  vencimentoData: z.string().optional(),
  contaId: z.number().int().positive(),
  categoriaId: z.number().int().positive(),
  confianca: z.number().min(0).max(1),
  motivo: z.string().min(2),
});

export const quickAddBatchSuggestionSchema = z.object({
  items: z.array(quickAddSuggestionSchema).min(2),
  quantidade: z.number().int().positive(),
  valorTotalLote: z.number().positive(),
  confianca: z.number().min(0).max(1),
  motivo: z.string().min(2),
});

export const createAccountSuggestionSchema = z.object({
  nome: z.string().min(2),
  tipo: z.enum([
    "carteira",
    "corrente",
    "poupanca",
    "cartao_credito",
    "investimento",
    "caixa",
    "outro",
  ]),
  instituicao: z.string().max(120).optional(),
  saldoInicial: z.number().min(0),
  confianca: z.number().min(0).max(1),
  motivo: z.string().min(2),
});

export const renameAccountSuggestionSchema = z.object({
  contaId: z.number().int().positive(),
  nomeAtual: z.string().min(2),
  novoNome: z.string().min(2),
  confianca: z.number().min(0).max(1),
  motivo: z.string().min(2),
});

export const keepAccountsSuggestionSchema = z.object({
  manterContaIds: z.array(z.number().int().positive()).min(1),
  manterNomes: z.array(z.string().min(2)).min(1),
  desativarContaIds: z.array(z.number().int().positive()),
  desativarNomes: z.array(z.string().min(2)),
  confianca: z.number().min(0).max(1),
  motivo: z.string().min(2),
});

export const updateLancamentosSuggestionSchema = z.object({
  lancamentoIds: z.array(z.number().int().positive()).min(1),
  quantidade: z.number().int().positive(),
  meio: lancamentoMeioSchema,
  filtroResumo: z.string().min(2),
  confianca: z.number().min(0).max(1),
  motivo: z.string().min(2),
});

export const updateLancamentosDataSuggestionSchema = z.object({
  lancamentoIds: z.array(z.number().int().positive()).min(1),
  quantidade: z.number().int().positive(),
  competenciaData: z.string().min(10),
  resumo: z.string().min(2),
  confianca: z.number().min(0).max(1),
  motivo: z.string().min(2),
});

export const deleteLancamentosSuggestionSchema = z.object({
  lancamentoIds: z.array(z.number().int().positive()).min(1),
  quantidade: z.number().int().positive(),
  resumo: z.string().min(2),
  confianca: z.number().min(0).max(1),
  motivo: z.string().min(2),
});

export const aiSearchFilterSchema = z.object({
  text: z.string().optional(),
  tipo: z.enum(["receita", "despesa", "ajuste"]).optional(),
  contaId: z.number().int().positive().optional(),
  categoriaId: z.number().int().positive().optional(),
  minValor: z.number().positive().optional(),
  maxValor: z.number().positive().optional(),
  dateFrom: z.string().min(10).optional(),
  dateTo: z.string().min(10).optional(),
  motivo: z.string().min(2),
});

export const assistantSearchPlanSchema = z.object({
  intent: z.enum([
    "search",
    "latest_transaction",
    "largest_expense",
    "largest_income",
    "summary",
  ]),
  filters: aiSearchFilterSchema,
  answerHint: z.string().min(2),
});

export const assistantInsightPlanSchema = z.object({
  action: z.enum([
    "chat",
    "inventory",
    "latest_transaction",
    "largest_expense",
    "largest_income",
    "summary",
    "top_spend",
    "income_by_origin",
    "top_income_entries",
    "top_spend_day",
    "risk_review",
    "income_percentage",
    "balance_check",
    "search",
  ]),
  timeframe: z.enum([
    "all_time",
    "today",
    "yesterday",
    "this_week",
    "last_week",
    "last_7_days",
    "this_month",
    "last_month",
  ]),
  tipo: z.enum(["receita", "despesa", "ajuste"]).optional(),
  text: z.string().optional(),
  contaId: z.number().int().positive().optional(),
  categoriaId: z.number().int().positive().optional(),
  minValor: z.number().positive().optional(),
  maxValor: z.number().positive().optional(),
  percentage: z.number().positive().max(100).optional(),
  answerHint: z.string().min(2),
  motivo: z.string().min(2),
});

export type QuickAddSuggestion = z.infer<typeof quickAddSuggestionSchema>;
export type QuickAddBatchSuggestion = z.infer<typeof quickAddBatchSuggestionSchema>;
export type CreateAccountSuggestion = z.infer<typeof createAccountSuggestionSchema>;
export type RenameAccountSuggestion = z.infer<typeof renameAccountSuggestionSchema>;
export type KeepAccountsSuggestion = z.infer<typeof keepAccountsSuggestionSchema>;
export type UpdateLancamentosSuggestion = z.infer<typeof updateLancamentosSuggestionSchema>;
export type UpdateLancamentosDataSuggestion = z.infer<typeof updateLancamentosDataSuggestionSchema>;
export type DeleteLancamentosSuggestion = z.infer<typeof deleteLancamentosSuggestionSchema>;
export type AiSearchFilter = z.infer<typeof aiSearchFilterSchema>;
export type AssistantSearchPlan = z.infer<typeof assistantSearchPlanSchema>;
export type AssistantInsightPlan = z.infer<typeof assistantInsightPlanSchema>;
