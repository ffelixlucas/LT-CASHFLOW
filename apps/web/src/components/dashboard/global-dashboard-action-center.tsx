"use client";

import { usePathname, useSearchParams } from "next/navigation";

import type { GestaoOption } from "@/components/assistant/global-assistant";
import { DashboardActionCenter } from "@/components/dashboard/dashboard-action-center";

export function GlobalDashboardActionCenter({
  gestoes,
  hoje,
}: {
  gestoes: GestaoOption[];
  hoje: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!pathname?.startsWith("/dashboard") || gestoes.length === 0) {
    return null;
  }

  const requestedGestaoId = Number(searchParams.get("gestao") ?? 0);
  const gestaoAtiva =
    gestoes.find((gestao) => gestao.id === requestedGestaoId) ?? gestoes[0] ?? null;

  if (!gestaoAtiva) {
    return null;
  }

  return (
    <DashboardActionCenter
      categorias={gestaoAtiva.categorias}
      contas={gestaoAtiva.contas.map((conta) => ({
        id: conta.id,
        nome: conta.nome,
        tipo: conta.tipo ?? "outro",
      }))}
      gestaoId={gestaoAtiva.id}
      hoje={hoje}
    />
  );
}
