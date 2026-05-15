import Link from "next/link";

export type DashboardNavKey = "inicio" | "executivo" | "semana" | "meses" | "cartao" | "reservas";

export function DashboardAppNav({
  gestaoId,
  active,
}: {
  gestaoId: number;
  active: DashboardNavKey | null;
}) {
  const q = `?gestao=${gestaoId}`;
  const cls = (key: DashboardNavKey) =>
    `tab${active === key ? " active" : ""}`;
  return (
    <div className="dashboard-app-nav flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <nav aria-label="Área logada" className="flex flex-wrap items-center gap-2">
        <Link className={cls("inicio")} href={`/dashboard${q}`}>
          Início
        </Link>
        <Link className={cls("executivo")} href={`/dashboard/executivo${q}`}>
          Executivo
        </Link>
        <Link className={cls("semana")} href={`/dashboard/semana${q}`}>
          Semana
        </Link>
        <Link className={cls("meses")} href={`/dashboard/meses${q}`}>
          Meses
        </Link>
        <Link className={cls("cartao")} href={`/dashboard/cartao${q}`}>
          Cartão
        </Link>
        <Link className={cls("reservas")} href={`/dashboard/reservas${q}`}>
          Reservas
        </Link>
        <Link className="tab" href="/">
          Site
        </Link>
      </nav>
    </div>
  );
}
