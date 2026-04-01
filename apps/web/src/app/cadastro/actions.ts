"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";

import { signUpSchema } from "@ltcashflow/validation";

import { createUser, findUserByEmail } from "@/lib/server/repository";

export async function registerAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/cadastro?error=invalid");
  }

  const existing = await findUserByEmail(parsed.data.email);

  if (existing) {
    redirect("/cadastro?error=email");
  }

  const senhaHash = await hash(parsed.data.password, 12);

  await createUser({
    nome: parsed.data.nome,
    email: parsed.data.email,
    senhaHash,
  });

  redirect("/entrar?created=1");
}
