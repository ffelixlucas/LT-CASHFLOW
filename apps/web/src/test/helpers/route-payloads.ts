import {
  CATEGORIA_A,
  CATEGORIA_B,
  CONTA_A,
  CONTA_B,
  LANCAMENTO_A,
  LANCAMENTO_B,
} from "./tenant-fixtures";

export const validDeleteLancamentosSuggestion = {
  lancamentoIds: [LANCAMENTO_A],
  quantidade: 1,
  resumo: "Exclusao de teste automatizado",
  confianca: 0.9,
  motivo: "Cenario de teste HTTP multitenant.",
};

export const validUpdateLancamentosMeioSuggestion = {
  lancamentoIds: [LANCAMENTO_A],
  quantidade: 1,
  meio: "pix" as const,
  filtroResumo: "Atualizacao de teste",
  confianca: 0.9,
  motivo: "Cenario de teste HTTP multitenant.",
};

export const validQuickAddSuggestion = {
  descricao: "Compra teste HTTP",
  tipo: "despesa" as const,
  status: "liquidado" as const,
  valorTotal: 42.5,
  competenciaData: "2026-05-19",
  contaId: CONTA_A,
  categoriaId: CATEGORIA_A,
  confianca: 0.9,
  motivo: "Cenario de teste HTTP multitenant.",
};

export const validReconciliacaoImportItem = {
  ...validQuickAddSuggestion,
  descricao: "Importacao extrato teste",
};

export const extratoTextoMinimo = "19/05/2026 Pix enviado -10,00";

export function quickAddSuggestionWithForeignCategoria() {
  return {
    ...validQuickAddSuggestion,
    categoriaId: CATEGORIA_B,
  };
}

export function quickAddSuggestionWithForeignConta() {
  return {
    ...validQuickAddSuggestion,
    contaId: CONTA_B,
  };
}

export function deleteSuggestionWithForeignLancamento() {
  return {
    ...validDeleteLancamentosSuggestion,
    lancamentoIds: [LANCAMENTO_B],
  };
}
