"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/server/auth";
import {
  assertCanMutateGestao,
  assertContaIdsInGestao,
  GestaoAccessDeniedError,
} from "@/lib/server/permissions";
import { logGestaoAccessDeniedFromError } from "@/lib/server/security-log";
import {
  createFechamentoSemanal,
  getSemanaMetricas,
} from "@/lib/server/repository";

function semanaUrl(params: {
  gestaoId: number;
  inicio: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  search.set("gestao", String(params.gestaoId));
  search.set("inicio", params.inicio);
  if (params.status) search.set("status", params.status);
  return `/dashboard/semana?${search.toString()}`;
}

type TransferenciaReservaInput = {
  valor: number;
  contaOrigemId: number;
  contaDestinoId: number;
};

function parseTransferencias(raw: unknown): TransferenciaReservaInput[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return null;
        const obj = item as Record<string, unknown>;
        const valor = Math.max(0, Number(obj.valor ?? 0));
        const contaOrigemId = Number(obj.contaOrigemId ?? 0);
        const contaDestinoId = Number(obj.contaDestinoId ?? 0);
        if (valor <= 0 || contaOrigemId <= 0 || contaDestinoId <= 0) return null;
        return { valor, contaOrigemId, contaDestinoId };
      })
      .filter((x): x is TransferenciaReservaInput => x !== null);
  } catch {
    return [];
  }
}

function parseReservasPorConta(raw: unknown): Array<{ contaId: number; nome: string; valor: number }> {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return null;
        const obj = item as Record<string, unknown>;
        const contaId = Number(obj.contaId ?? 0);
        const nome = String(obj.nome ?? "").trim();
        const valor = Math.max(0, Number(obj.valor ?? 0));
        if (valor <= 0 || !nome) return null;
        return { contaId, nome, valor };
      })
      .filter((x): x is { contaId: number; nome: string; valor: number } => x !== null);
  } catch {
    return [];
  }
}

export async function fecharSemanaAction(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/entrar");

  const gestaoId = Number(formData.get("gestaoId"));
  const inicio = String(formData.get("inicio") ?? "");
  const fim = String(formData.get("fim") ?? "");
  const observacoesBase = String(formData.get("observacoes") ?? "").trim();
  const detalhesReserva = String(formData.get("detalhesReserva") ?? "").trim();
  const observacoes =
    [observacoesBase, detalhesReserva ? `Reservas: ${detalhesReserva}` : ""]
      .filter(Boolean)
      .join(" — ") || null;
  const apenasSnapshot = formData.get("apenasSnapshot") === "on";
  const transferencias = parseTransferencias(formData.get("transferenciasReserva"));
  const reservasPorConta = parseReservasPorConta(formData.get("reservasPorConta"));
  const reservarValorTotal = Math.max(0, Number(formData.get("reservarValorTotal") ?? 0));
  const comprasCartaoRegistro = Math.max(0, Number(formData.get("comprasCartaoRegistro") ?? 0));
  const pagamentoFatura = Math.max(0, Number(formData.get("pagamentoFatura") ?? 0));
  const contaCorrenteId = Number(formData.get("contaCorrenteId") ?? 0);

  if (!gestaoId || !inicio || !fim) {
    redirect("/dashboard?status=fechamento-invalido");
  }

  try {
    await assertCanMutateGestao(user.id, gestaoId);

    const contaIds = new Set<number>();
    if (contaCorrenteId > 0) {
      contaIds.add(contaCorrenteId);
    }
    for (const tr of transferencias) {
      contaIds.add(tr.contaOrigemId);
      contaIds.add(tr.contaDestinoId);
    }
    for (const reserva of reservasPorConta) {
      contaIds.add(reserva.contaId);
    }

    await assertContaIdsInGestao([...contaIds], gestaoId);
  } catch (error) {
    if (error instanceof GestaoAccessDeniedError) {
      logGestaoAccessDeniedFromError(error, {
        userId: user.id,
        gestaoId,
        action: "dashboard.fecharSemana",
      });
      redirect("/dashboard?status=acesso-negado");
    }
    throw error;
  }

  const metricas = await getSemanaMetricas({ gestaoId, inicio, fim });
  const comprasCartao =
    comprasCartaoRegistro > 0.004 ? comprasCartaoRegistro : metricas.comprasCartao;

  const somaTransferencias = transferencias.reduce((acc, tr) => acc + tr.valor, 0);
  const reservarValor =
    reservarValorTotal > 0
      ? reservarValorTotal
      : somaTransferencias > 0
        ? somaTransferencias
        : reservasPorConta.reduce((acc, r) => acc + r.valor, 0);

  const restoFim =
    metricas.entradas - metricas.saidasCorrente - comprasCartao - reservarValor;
  const ajusteDiaADiaTipo =
    Math.abs(restoFim) < 0.005 ? "nenhum" : restoFim > 0 ? "aporte" : "resgate";
  const ajusteDiaADiaValor = Math.round(Math.abs(restoFim) * 100) / 100;

  await createFechamentoSemanal({
    gestaoId,
    userId: user.id,
    inicio,
    fim,
    entradas: metricas.entradas,
    saidasCorrente: metricas.saidasCorrente,
    comprasCartao,
    reservadoNoFechamento: reservarValor,
    pagamentoFatura,
    contaCorrenteId,
    ajusteDiaADiaTipo,
    ajusteDiaADiaValor,
    apenasSnapshot,
    transferenciasReserva: transferencias,
    reservasPorConta: reservasPorConta.length > 0 ? reservasPorConta : null,
    observacoes,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/semana");
  revalidatePath("/dashboard/reservas");
  revalidatePath("/dashboard/movimentacoes");

  redirect(semanaUrl({ gestaoId, inicio, status: "semana-fechada" }));
}
