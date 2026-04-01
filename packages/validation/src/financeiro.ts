import { z } from "zod";

export const lancamentoMeioSchema = z.enum([
  "pix",
  "debito",
  "credito",
  "dinheiro",
  "boleto",
  "ted_doc",
  "transferencia",
  "outro",
]);

export const lancamentoHoraSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe a hora no formato HH:mm.")
  .optional();

export const createContaSchema = z.object({
  nome: z.string().min(2, "A conta precisa de um nome."),
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
  saldoInicial: z.coerce.number().min(0),
});

export const createCategoriaSchema = z.object({
  nome: z.string().min(2, "A categoria precisa de um nome."),
  natureza: z.enum(["receita", "despesa", "ambos"]),
});

export const createLancamentoSchema = z.object({
  contaId: z.coerce.number().int().positive(),
  categoriaId: z.coerce.number().int().positive(),
  tipo: z.enum(["receita", "despesa", "ajuste"]),
  status: z.enum(["previsto", "pendente", "liquidado"]),
  meio: lancamentoMeioSchema.optional(),
  descricao: z.string().min(3, "Descreva o lancamento."),
  valorTotal: z.coerce.number().positive(),
  competenciaData: z.string().min(10),
  competenciaHora: lancamentoHoraSchema,
  vencimentoData: z.string().optional(),
});

export const updateLancamentoSchema = createLancamentoSchema.extend({
  lancamentoId: z.coerce.number().int().positive(),
});

export type CreateContaInput = z.infer<typeof createContaSchema>;
export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type CreateLancamentoInput = z.infer<typeof createLancamentoSchema>;
export type UpdateLancamentoInput = z.infer<typeof updateLancamentoSchema>;
export type LancamentoMeio = z.infer<typeof lancamentoMeioSchema>;
