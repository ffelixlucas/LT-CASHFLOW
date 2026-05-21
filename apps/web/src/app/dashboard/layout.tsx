import { Suspense } from "react";

import type { GestaoOption } from "@/components/assistant/global-assistant";
import { GlobalDashboardActionCenter } from "@/components/dashboard/global-dashboard-action-center";
import { auth } from "@/lib/server/auth";
import { listCategorias, listContas, listUserGestoes } from "@/lib/server/repository";

async function gestoesForActions(userId: number): Promise<GestaoOption[]> {
  const gestoes = await listUserGestoes(userId);

  return Promise.all(
    gestoes.map(async (gestao) => {
      const [contas, categorias] = await Promise.all([listContas(gestao.id), listCategorias(gestao.id)]);

      return {
        id: gestao.id,
        nome: gestao.nome,
        contas: contas.map((conta) => ({ id: conta.id, nome: conta.nome, tipo: conta.tipo })),
        categorias: categorias.map((categoria) => ({
          id: categoria.id,
          nome: categoria.nome,
          natureza: categoria.natureza,
        })),
      };
    }),
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const gestoes = session?.user?.id ? await gestoesForActions(Number(session.user.id)) : [];
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <>
      {children}
      {session?.user?.id ? (
        <Suspense fallback={null}>
          <GlobalDashboardActionCenter gestoes={gestoes} hoje={hoje} />
        </Suspense>
      ) : null}
    </>
  );
}
