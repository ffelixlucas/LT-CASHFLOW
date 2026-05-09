"use server";

import { redirect } from "next/navigation";

import { createOnboardingContaSchema, createOnboardingSchema } from "@ltcashflow/validation";

import { normalizeDateInput } from "@/lib/date";
import { requireUser } from "@/lib/server/auth";
import { userCanMutateGestao } from "@/lib/server/permissions";
import { createGestaoWithOpeningBalances } from "@/lib/server/repository";

async function getAuthenticatedUser() {
  const user = await requireUser();

  if (!user) {
    redirect("/entrar");
  }

  return user;
}

export async function createOnboardingAction(formData: FormData) {
  const user = await getAuthenticatedUser();

  const parsed = createOnboardingSchema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    tipo: formData.get("tipo"),
    inicioEm: normalizeDateInput(formData.get("inicioEm")),
  });

  if (!parsed.success) {
    redirect("/onboarding?error=invalid");
  }

  const contaNomes = formData.getAll("contaNome").map((value) => String(value).trim());
  const contaTipos = formData.getAll("contaTipo").map((value) => String(value).trim());
  const contaInstituicoes = formData.getAll("contaInstituicao").map((value) => String(value).trim());
  const contas = contaNomes
    .map((nome, index) =>
      createOnboardingContaSchema.safeParse({
        nome,
        tipo: contaTipos[index],
        instituicao: contaInstituicoes[index] || undefined,
        saldoInicial: 0,
      }),
    )
    .filter((item) => item.success);

  if (contas.length === 0) {
    redirect("/onboarding?error=invalid");
  }

  const contasValidas = contas.map((item) => item.data);

  const gestaoId = await createGestaoWithOpeningBalances({
    userId: user.id,
    nome: parsed.data.nome,
    descricao: parsed.data.descricao,
    tipo: parsed.data.tipo,
    inicioEm: parsed.data.inicioEm,
    contas: contasValidas,
  });

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/onboarding?error=invalid");
  }

  redirect(`/dashboard?gestao=${gestaoId}&status=gestao-criada`);
}
