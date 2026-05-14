"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createCategoriaSchema,
  createContaSchema,
  createGestaoSchema,
  createGastoFixoSchema,
  createLancamentoSchema,
  createParcelamentoCartaoSchema,
  createTransferenciaSchema,
  gerarPrevistosPlanoFixosMesSchema,
  savePlanoFixosTemplateSchema,
  updateGestaoMemberRoleSchema,
  updateLancamentoSchema,
} from "@ltcashflow/validation";

import { normalizeDateInput, normalizeTimeInput } from "@/lib/date";
import { requireUser } from "@/lib/server/auth";
import { userCanMutateGestao } from "@/lib/server/permissions";
import {
  getUserGestaoRole,
  createCategoria,
  createConta,
  createGestaoWithDefaults,
  createGastoFixo,
  createLancamento,
  createParcelamentoNoCartao,
  createTransferencia,
  syncLancamentosPrevistosFromPlanoFixosMes,
  getPlanoFixosTemplateItens,
  upsertPlanoFixosTemplate,
  deleteLancamentos,
  repairGestaoGastosFixoPrevistosDuplicados,
  updateCategoria,
  updateContaSaldoInicial,
  updateGestaoPercentualReserva,
  updateGestaoMembroPapel,
  updateLancamento,
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

function stateUrl(gestaoId?: number, status?: string) {
  const search = new URLSearchParams();

  if (gestaoId) {
    search.set("gestao", String(gestaoId));
  }

  if (status) {
    search.set("status", status);
  }

  const query = search.toString();
  return query ? `/dashboard/estado-inicial?${query}` : "/dashboard/estado-inicial";
}

function configUrl(gestaoId?: number, status?: string) {
  const search = new URLSearchParams();

  if (gestaoId) {
    search.set("gestao", String(gestaoId));
  }

  if (status) {
    search.set("status", status);
  }

  const query = search.toString();
  return query ? `/dashboard?${query}#config` : "/dashboard#config";
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
    inicioEm: new Date().toISOString().slice(0, 10),
  });

  revalidatePath("/dashboard");
  redirect(dashboardUrl(gestaoId, "gestao-criada"));
}

export async function createContaAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
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

export async function updateContaSaldoInicialAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const contaId = Number(formData.get("contaId"));
  const saldoInicial = Number(formData.get("saldoInicial"));
  const saldoInicialEm = normalizeDateInput(formData.get("saldoInicialEm"));

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  if (!Number.isFinite(contaId) || !Number.isFinite(saldoInicial)) {
    redirect(stateUrl(gestaoId, "saldo-inicial-invalido"));
  }

  const updated = await updateContaSaldoInicial({
    gestaoId,
    contaId,
    saldoInicial,
    saldoInicialEm,
  });

  if (!updated) {
    redirect(stateUrl(gestaoId, "saldo-inicial-invalido"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/estado-inicial");
  redirect(stateUrl(gestaoId, "saldo-inicial-salvo"));
}

export async function updateGestaoPercentualReservaAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const percentualReserva = Number(formData.get("percentualReserva"));

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  if (!Number.isFinite(percentualReserva) || percentualReserva < 0 || percentualReserva > 100) {
    redirect(configUrl(gestaoId, "percentual-invalido"));
  }

  const updated = await updateGestaoPercentualReserva({
    gestaoId,
    userId: user.id,
    percentualReserva,
  });

  if (!updated) {
    redirect(configUrl(gestaoId, "percentual-invalido"));
  }

  revalidatePath("/dashboard");
  redirect(configUrl(gestaoId, "percentual-salvo"));
}

export async function createCategoriaAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const categoriaIdRaw = formData.get("categoriaId");

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  const parsed = createCategoriaSchema.safeParse({
    nome: formData.get("nome"),
    natureza: formData.get("natureza"),
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "categoria-invalida"));
  }

  const categoriaId = categoriaIdRaw ? Number(categoriaIdRaw) : null;

  if (categoriaId) {
    const updated = await updateCategoria({
      gestaoId,
      userId: user.id,
      categoriaId,
      ...parsed.data,
    });

    if (!updated) {
      redirect(dashboardUrl(gestaoId, "categoria-invalida"));
    }
  } else {
    await createCategoria({
      gestaoId,
      userId: user.id,
      ...parsed.data,
    });
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl(gestaoId, categoriaId ? "categoria-atualizada" : "categoria-criada"));
}

export async function createGastoFixoAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const anoMes = String(formData.get("anoMes") ?? new Date().toISOString().slice(0, 7));

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  const parsed = createGastoFixoSchema.safeParse({
    contaId: formData.get("contaId"),
    categoriaId: formData.get("categoriaId"),
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || undefined,
    valorEstimado: formData.get("valorEstimado"),
    diaVencimento: formData.get("diaVencimento"),
    meio: formData.get("meio") || undefined,
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "gasto-fixo-invalido"));
  }

  await createGastoFixo({
    gestaoId,
    userId: user.id,
    ...parsed.data,
    anoMes,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meses");
  redirect(dashboardUrl(gestaoId, "gasto-fixo-criado"));
}

export async function savePlanoFixosMesAction(payload: unknown) {
  const user = await getAuthenticatedUser();
  const parsed = savePlanoFixosTemplateSchema.safeParse(payload);
  if (!parsed.success) {
    redirect("/dashboard?status=plano-fixos-invalido");
  }

  const { gestaoId, itens } = parsed.data;
  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  try {
    await upsertPlanoFixosTemplate({ gestaoId, userId: user.id, itens });
  } catch (error) {
    const code = typeof error === "object" && error !== null ? (error as { code?: string }).code : undefined;
    if (code === "PLANO_FIXOS_TEMPLATE_TABLE") {
      redirect(dashboardUrl(gestaoId, "plano-fixos-migration"));
    }
    throw error;
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meses");
  redirect(dashboardUrl(gestaoId, "plano-fixos-salvo"));
}

export async function gerarPrevistosPlanoFixosMesAction(payload: unknown) {
  const user = await getAuthenticatedUser();
  const parsed = gerarPrevistosPlanoFixosMesSchema.safeParse(payload);
  if (!parsed.success) {
    redirect("/dashboard?status=plano-fixos-invalido");
  }

  const { gestaoId, anoMesDestino, itens } = parsed.data;
  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  if (itens && itens.length > 0) {
    try {
      await upsertPlanoFixosTemplate({ gestaoId, userId: user.id, itens });
    } catch (error) {
      const code = typeof error === "object" && error !== null ? (error as { code?: string }).code : undefined;
      if (code === "PLANO_FIXOS_TEMPLATE_TABLE") {
        redirect(dashboardUrl(gestaoId, "plano-fixos-migration"));
      }
      throw error;
    }
  }

  const planoAtual = await getPlanoFixosTemplateItens(gestaoId);
  if (planoAtual.length === 0) {
    redirect(dashboardUrl(gestaoId, "plano-fixos-vazio"));
  }

  await syncLancamentosPrevistosFromPlanoFixosMes({ gestaoId, userId: user.id, anoMes: anoMesDestino });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meses");
  redirect(dashboardUrl(gestaoId, "plano-fixos-gerados"));
}

export async function createLancamentoAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const competenciaData = normalizeDateInput(formData.get("competenciaData"));
  const faturaCompetenciaData = normalizeDateInput(formData.get("faturaCompetenciaData"));
  const competenciaHora = normalizeTimeInput(formData.get("competenciaHora"));
  const vencimentoData = normalizeDateInput(formData.get("vencimentoData"));

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  if (formData.get("gerarParcelas") === "on") {
    const tipo = String(formData.get("tipo") ?? "");
    const meio = String(formData.get("meio") ?? "");
    if (tipo !== "despesa" || meio !== "credito" || !competenciaData) {
      redirect(dashboardUrl(gestaoId, "parcelamento-invalido"));
    }

    const parcelParsed = createParcelamentoCartaoSchema.safeParse({
      contaId: formData.get("contaId"),
      categoriaId: formData.get("categoriaId"),
      status: formData.get("status"),
      descricaoBase: formData.get("descricao"),
      valorParcela: formData.get("valorTotal"),
      totalParcelas: formData.get("totalParcelas"),
      primeiraCompetenciaData: competenciaData,
      competenciaHora,
    });

    if (!parcelParsed.success) {
      redirect(dashboardUrl(gestaoId, "parcelamento-invalido"));
    }

    try {
      await createParcelamentoNoCartao({
        gestaoId,
        userId: user.id,
        ...parcelParsed.data,
      });
    } catch {
      redirect(dashboardUrl(gestaoId, "parcelamento-invalido"));
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/meses");
    revalidatePath("/dashboard/cartao");
    redirect(dashboardUrl(gestaoId, "parcelamento-criado"));
  }

  const parsed = createLancamentoSchema.safeParse({
    contaId: formData.get("contaId"),
    contaDestinoId: formData.get("contaDestinoId") || undefined,
    categoriaId: formData.get("categoriaId"),
    tipo: formData.get("tipo"),
    status: formData.get("status"),
    meio: formData.get("meio") || undefined,
    descricao: formData.get("descricao"),
    valorTotal: formData.get("valorTotal"),
    competenciaData,
    faturaCompetenciaData,
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
  revalidatePath("/dashboard/meses");
  revalidatePath("/dashboard/cartao");
  redirect(dashboardUrl(gestaoId, "lancamento-criado"));
}

export async function createParcelamentoCartaoAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const primeiraCompetenciaData = normalizeDateInput(formData.get("primeiraCompetenciaData"));
  const competenciaHora = normalizeTimeInput(formData.get("competenciaHora"));

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  if (!primeiraCompetenciaData) {
    redirect(dashboardUrl(gestaoId, "parcelamento-invalido"));
  }

  const parsed = createParcelamentoCartaoSchema.safeParse({
    contaId: formData.get("contaId"),
    categoriaId: formData.get("categoriaId"),
    status: formData.get("status"),
    descricaoBase: formData.get("descricaoBase"),
    valorParcela: formData.get("valorParcela"),
    totalParcelas: formData.get("totalParcelas"),
    primeiraCompetenciaData,
    competenciaHora,
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "parcelamento-invalido"));
  }

  try {
    await createParcelamentoNoCartao({
      gestaoId,
      userId: user.id,
      ...parsed.data,
    });
  } catch {
    redirect(dashboardUrl(gestaoId, "parcelamento-invalido"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meses");
  revalidatePath("/dashboard/cartao");
  redirect(dashboardUrl(gestaoId, "parcelamento-criado"));
}

export async function createTransferenciaAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const competenciaData = normalizeDateInput(formData.get("competenciaData"));
  const faturaCompetenciaData = normalizeDateInput(formData.get("faturaCompetenciaData"));
  const competenciaHora = normalizeTimeInput(formData.get("competenciaHora"));
  const vencimentoData = normalizeDateInput(formData.get("vencimentoData"));

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  const parsed = createTransferenciaSchema.safeParse({
    contaOrigemId: formData.get("contaOrigemId"),
    contaDestinoId: formData.get("contaDestinoId"),
    status: formData.get("status"),
    descricao: formData.get("descricao"),
    valorTotal: formData.get("valorTotal"),
    competenciaData,
    faturaCompetenciaData,
    competenciaHora,
    vencimentoData,
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "transferencia-invalida"));
  }

  await createTransferencia({
    gestaoId,
    userId: user.id,
    contaOrigemId: parsed.data.contaOrigemId,
    contaDestinoId: parsed.data.contaDestinoId,
    status: parsed.data.status,
    descricao: parsed.data.descricao,
    valorTotal: parsed.data.valorTotal,
    competenciaData: parsed.data.competenciaData,
    faturaCompetenciaData: parsed.data.faturaCompetenciaData,
    competenciaHora: parsed.data.competenciaHora,
    vencimentoData: parsed.data.vencimentoData,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meses");
  revalidatePath("/dashboard/cartao");
  redirect(dashboardUrl(gestaoId, "transferencia-criada"));
}

export async function updateLancamentoAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const competenciaData = normalizeDateInput(formData.get("competenciaData"));
  const faturaCompetenciaData = normalizeDateInput(formData.get("faturaCompetenciaData"));
  const competenciaHora = normalizeTimeInput(formData.get("competenciaHora"));
  const vencimentoData = normalizeDateInput(formData.get("vencimentoData"));

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  const tipoRaw = formData.get("tipo");
  const tipo =
    tipoRaw === "transferencia"
      ? "transferencia"
      : tipoRaw === "receita"
        ? "receita"
        : tipoRaw === "ajuste"
          ? "ajuste"
          : "despesa";

  const parsed = updateLancamentoSchema.safeParse({
    lancamentoId: formData.get("lancamentoId"),
    contaId: formData.get("contaId"),
    contaDestinoId: formData.get("contaDestinoId") || undefined,
    categoriaId: formData.get("categoriaId") || undefined,
    tipo,
    status: formData.get("status"),
    meio: formData.get("meio") || undefined,
    descricao: formData.get("descricao"),
    valorTotal: formData.get("valorTotal"),
    competenciaData,
    faturaCompetenciaData,
    competenciaHora,
    vencimentoData,
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "lancamento-invalido"));
  }

  const updated = await updateLancamento({
    gestaoId,
    userId: user.id,
    lancamentoId: parsed.data.lancamentoId,
    contaId: parsed.data.contaId,
    contaDestinoId: parsed.data.tipo === "transferencia" ? parsed.data.contaDestinoId : null,
    categoriaId: parsed.data.tipo === "transferencia" ? null : parsed.data.categoriaId,
    tipo: parsed.data.tipo,
    status: parsed.data.status,
    meio: parsed.data.meio,
    descricao: parsed.data.descricao,
    valorTotal: parsed.data.valorTotal,
    competenciaData: parsed.data.competenciaData,
    faturaCompetenciaData: parsed.data.faturaCompetenciaData,
    competenciaHora: parsed.data.competenciaHora,
    vencimentoData: parsed.data.vencimentoData,
  });

  if (!updated) {
    redirect(dashboardUrl(gestaoId, "lancamento-invalido"));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meses");
  revalidatePath("/dashboard/cartao");
  redirect(dashboardUrl(gestaoId, "lancamento-atualizado"));
}

export async function deleteLancamentoAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));
  const lancamentoId = Number(formData.get("lancamentoId"));

  if (!gestaoId || !lancamentoId) {
    redirect("/dashboard?status=lancamento-invalido");
  }

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect("/dashboard?status=acesso-negado");
  }

  await deleteLancamentos({
    gestaoId,
    lancamentoIds: [lancamentoId],
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/meses");
  revalidatePath("/dashboard/cartao");
  redirect(dashboardUrl(gestaoId, "lancamento-excluido"));
}

export async function updateGestaoMemberRoleAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));

  if (!gestaoId) {
    redirect("/dashboard?status=gestao-invalida");
  }

  const role = await getUserGestaoRole(user.id, gestaoId);
  if (!(role === "proprietario" || role === "administrador")) {
    redirect(dashboardUrl(gestaoId, "acesso-negado"));
  }

  const parsed = updateGestaoMemberRoleSchema.safeParse({
    memberUserId: formData.get("memberUserId"),
    papel: formData.get("papel"),
  });

  if (!parsed.success) {
    redirect(dashboardUrl(gestaoId, "gestao-invalida"));
  }

  const ok = await updateGestaoMembroPapel({
    gestaoId,
    changedByUserId: user.id,
    memberUserId: parsed.data.memberUserId,
    papel: parsed.data.papel,
  });

  if (!ok) {
    redirect(dashboardUrl(gestaoId, "gestao-invalida"));
  }

  revalidatePath("/dashboard");
  redirect(dashboardUrl(gestaoId, "membro-atualizado"));
}

export async function repairGastosFixoDuplicadosAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  const gestaoId = Number(formData.get("gestaoId"));

  if (!gestaoId) {
    redirect("/dashboard?status=gestao-invalida");
  }

  if (!(await userCanMutateGestao(user.id, gestaoId))) {
    redirect(`/dashboard/config?gestao=${gestaoId}&status=acesso-negado`);
  }

  const result = await repairGestaoGastosFixoPrevistosDuplicados(gestaoId);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/config");
  revalidatePath("/dashboard/semana");
  revalidatePath("/dashboard/meses");

  const q = new URLSearchParams();
  q.set("gestao", String(gestaoId));
  q.set("status", "reparo-gastos-fixos");
  q.set("reparoL", String(result.linked));
  q.set("reparoR", String(result.removedSynthetic));
  q.set("reparoS", String(result.skipped));
  redirect(`/dashboard/config?${q.toString()}`);
}
