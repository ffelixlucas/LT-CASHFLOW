import { z } from "zod";

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export const signUpSchema = z.object({
  nome: z.string().min(3, "Informe um nome valido."),
  email: z.email(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
