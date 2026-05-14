import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Rota antiga: use `/dashboard/meses`. */
export default async function DashboardInsightsRedirect({ searchParams }: PageProps) {
  const params = await searchParams;
  const gestao = typeof params.gestao === "string" ? params.gestao : undefined;
  const mes = typeof params.mes === "string" ? params.mes : undefined;
  const q = new URLSearchParams();
  if (gestao) q.set("gestao", gestao);
  if (mes) q.set("mes", mes);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect(`/dashboard/meses${suffix}`);
}
