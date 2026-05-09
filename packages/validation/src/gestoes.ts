import { z } from "zod";

export const createGestaoSchema = z.object({
  nome: z.string().min(3, "A gestao precisa de um nome."),
  descricao: z.string().max(500).optional(),
  tipo: z.enum(["pessoal", "familiar", "profissional", "projeto"]),
});

export type CreateGestaoInput = z.infer<typeof createGestaoSchema>;

export const updateGestaoMemberRoleSchema = z.object({
  memberUserId: z.coerce.number().int().positive(),
  papel: z.enum(["proprietario", "administrador", "editor", "visualizador"]),
});

export type UpdateGestaoMemberRoleInput = z.infer<typeof updateGestaoMemberRoleSchema>;
