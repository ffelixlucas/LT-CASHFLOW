import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Extrato e movimentações passaram para `/dashboard/meses`. */
export default async function MovimentacoesRedirect({ searchParams }: PageProps) {
  const params = await searchParams;
  const gestao = typeof params.gestao === "string" ? params.gestao : undefined;
  const q = gestao ? `?gestao=${encodeURIComponent(gestao)}` : "";
  redirect(`/dashboard/meses${q}`);
}
