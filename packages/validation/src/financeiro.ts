import { z } from "zod";

export const lancamentoMeioSchema = z.enum([
  "pix",
  "debito",
  "credito",
  "dinheiro",
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

export const createOnboardingSchema = z.object({
  nome: z.string().min(3, "A gestao precisa de um nome."),
  descricao: z.string().max(500).optional(),
  tipo: z.enum(["pessoal", "familiar", "profissional", "projeto"]),
  inicioEm: z.string().min(10, "Informe a data de inicio."),
});

export const createOnboardingContaSchema = z.object({
  nome: z.string().min(2, "Informe o nome da conta."),
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
  cartaoLimiteCredito: z.coerce.number().optional(),
  cartaoFechamentoDia: z.coerce.number().int().min(1).max(31).optional(),
  cartaoVencimentoDia: z.coerce.number().int().min(1).max(31).optional(),
});

export const createLancamentoSchema = z.object({
  contaId: z.coerce.number().int().positive(),
  contaDestinoId: z.coerce.number().int().positive().optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(["receita", "despesa", "ajuste", "transferencia"]),
  status: z.enum(["previsto", "pendente", "liquidado"]),
  meio: lancamentoMeioSchema.optional(),
  descricao: z.string().min(3, "Descreva o lancamento."),
  valorTotal: z.coerce.number().positive(),
  competenciaData: z.string().min(10),
  faturaCompetenciaData: z.string().optional(),
  competenciaHora: lancamentoHoraSchema,
  vencimentoData: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.tipo === "transferencia") {
    if (!data.contaDestinoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a conta destino.",
        path: ["contaDestinoId"],
      });
    } else if (data.contaDestinoId === data.contaId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Origem e destino precisam diferir.",
        path: ["contaDestinoId"],
      });
    }
  } else if (!data.categoriaId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe a categoria.",
      path: ["categoriaId"],
    });
  }
});

export const createTransferenciaSchema = z
  .object({
    contaOrigemId: z.coerce.number().int().positive(),
    contaDestinoId: z.coerce.number().int().positive(),
    status: z.enum(["previsto", "pendente", "liquidado"]),
    descricao: z.string().min(3, "Descreva a transferencia."),
    valorTotal: z.coerce.number().positive(),
    competenciaData: z.string().min(10),
    faturaCompetenciaData: z.string().optional(),
    competenciaHora: lancamentoHoraSchema,
    vencimentoData: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.contaOrigemId === data.contaDestinoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Origem e destino precisam ser contas diferentes.",
        path: ["contaDestinoId"],
      });
    }
  });

export const updateLancamentoSchema = z
  .object({
    lancamentoId: z.coerce.number().int().positive(),
    contaId: z.coerce.number().int().positive(),
    contaDestinoId: z.coerce.number().int().positive().optional(),
    categoriaId: z.coerce.number().int().positive().optional(),
    tipo: z.enum(["receita", "despesa", "ajuste", "transferencia"]),
    status: z.enum(["previsto", "pendente", "liquidado"]),
    meio: lancamentoMeioSchema.optional(),
    descricao: z.string().min(3, "Descreva o lancamento."),
    valorTotal: z.coerce.number().positive(),
    competenciaData: z.string().min(10),
    faturaCompetenciaData: z.string().optional(),
    competenciaHora: lancamentoHoraSchema,
    vencimentoData: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "transferencia") {
      if (!data.contaDestinoId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe a conta destino.",
          path: ["contaDestinoId"],
        });
      } else if (data.contaDestinoId === data.contaId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Origem e destino precisam diferir.",
          path: ["contaDestinoId"],
        });
      }
    } else if (!data.categoriaId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a categoria.",
        path: ["categoriaId"],
      });
    }
  });

export type CreateContaInput = z.infer<typeof createContaSchema>;
export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type CreateOnboardingInput = z.infer<typeof createOnboardingSchema>;
export type CreateOnboardingContaInput = z.infer<typeof createOnboardingContaSchema>;
export type CreateLancamentoInput = z.infer<typeof createLancamentoSchema>;
export type CreateTransferenciaInput = z.infer<typeof createTransferenciaSchema>;
export type UpdateLancamentoInput = z.infer<typeof updateLancamentoSchema>;
export type LancamentoMeio = z.infer<typeof lancamentoMeioSchema>;
