"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCategoriaSchema,
  createContaSchema,
  createGestaoSchema,
  createLancamentoSchema,
  updateLancamentoSchema,
} from "@ltcashflow/validation";

import { normalizeDateInput, normalizeTimeInput } from "@/lib/date";
import { requireUser } from "@/lib/server/auth";
import {
  createCategoria,
  createConta,
  createGestaoWithDefaults,
  createLancamento,
  updateLancamento,
  userHasGestaoAccess,
} from "@/lib/server/repository";

function dashboardUrl(gestaoId?: number, status?: string) {
  const search = new URLSearchParams();

  if (gestaoId) {
    search.set("gestao", String(gestaoId));
  }

  if (status) {
    search.set("status", status);
  }

  const query = search.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

async function getAuthenticatedUser() {
  const user = await requireUser();

  if (!user) {
    redirect("/entrar");
  }

  return user;
}

export async function createGestaoAction(formData: FormData) {
  const user = await getAuthenticatedUser();

  const parsed = createGestaoSchema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
    tipo: formData.get("tipo"),
  });

  if (!parsed.success) {
    redirect("/dashboard?status=gestao-invalida");
  }

  const gestaoId = await createGestaoWithDefaults({
    userId: user.id,
    ...parsed.data,
  });

  revalidatePath("/dashboard");
  redirect(dashboardUrl(gestaoId, "gestao-criada"));
}

export async function createContaAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));

  if (!(await userHasGestaoAccess(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  const parsed = createContaSchema.safeParse({
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    instituicao: formData.get("instituicao"),
    saldoInicial: formData.get("saldoInicial"),
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "conta-invalida"));
  }

  await createConta({
    gestaoId,
    userId: user.id,
    ...parsed.data,
  });

  revalidatePath("/dashboard");
  redirect(dashboardUrl(gestaoId, "conta-criada"));
}

export async function createCategoriaAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));

  if (!(await userHasGestaoAccess(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  const parsed = createCategoriaSchema.safeParse({
    nome: formData.get("nome"),
    natureza: formData.get("natureza"),
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "categoria-invalida"));
  }

  await createCategoria({
    gestaoId,
    userId: user.id,
    ...parsed.data,
  });

  revalidatePath("/dashboard");
  redirect(dashboardUrl(gestaoId, "categoria-criada"));
}

export async function createLancamentoAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const competenciaData = normalizeDateInput(formData.get("competenciaData"));
  const competenciaHora = normalizeTimeInput(formData.get("competenciaHora"));
  const vencimentoData = normalizeDateInput(formData.get("vencimentoData"));

  if (!(await userHasGestaoAccess(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  const parsed = createLancamentoSchema.safeParse({
    contaId: formData.get("contaId"),
    categoriaId: formData.get("categoriaId"),
    tipo: formData.get("tipo"),
    status: formData.get("status"),
    meio: formData.get("meio") || undefined,
    descricao: formData.get("descricao"),
    valorTotal: formData.get("valorTotal"),
    competenciaData,
    competenciaHora,
    vencimentoData,
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "lancamento-invalido"));
  }

  await createLancamento({
    gestaoId,
    userId: user.id,
    ...parsed.data,
  });

  revalidatePath("/dashboard");
  redirect(dashboardUrl(gestaoId, "lancamento-criado"));
}

export async function updateLancamentoAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const competenciaData = normalizeDateInput(formData.get("competenciaData"));
  const competenciaHora = normalizeTimeInput(formData.get("competenciaHora"));
  const vencimentoData = normalizeDateInput(formData.get("vencimentoData"));

  if (!(await userHasGestaoAccess(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  const parsed = updateLancamentoSchema.safeParse({
    lancamentoId: formData.get("lancamentoId"),
    contaId: formData.get("contaId"),
    categoriaId: formData.get("categoriaId"),
    tipo: formData.get("tipo"),
    status: formData.get("status"),
    meio: formData.get("meio") || undefined,
    descricao: formData.get("descricao"),
    valorTotal: formData.get("valorTotal"),
    competenciaData,
    competenciaHora,
    vencimentoData,
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "lancamento-invalido"));
  }

  const updated = await updateLancamento({
    gestaoId,
    ...parsed.data,
  });

  if (!updated) {
    redirect(dashboardUrl(gestaoId, "lancamento-invalido"));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl(gestaoId, "lancamento-atualizado"));
}
