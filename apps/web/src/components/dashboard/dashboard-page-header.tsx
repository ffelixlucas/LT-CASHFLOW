import type { ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";

import {
  DashboardAppNav,
  type DashboardNavKey,
} from "@/components/dashboard/dashboard-app-nav";

export function DashboardPageHeader({
  brand,
  kicker,
  title,
  subtitle,
  gestaoId,
  active,
  actions,
  below,
}: {
  /** Bloco opcional à esquerda (ex.: logo na home). */
  brand?: ReactNode;
  kicker: string;
  title: ReactNode;
  subtitle?: ReactNode;
  gestaoId: number;
  active: DashboardNavKey | null;
  /** Substituído por nav + logout se omitido (ex.: outro uso futuro). */
  actions?: ReactNode;
  below?: ReactNode;
}) {
  return (
    <>
      <header className="compact-header">
        {brand ? (
          <div className="dashboard-brand-block">
            {brand}
            <div>
              <p className="dashboard-kicker">{kicker}</p>
              <h1>{title}</h1>
              {subtitle ? <p className="muted">{subtitle}</p> : null}
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="dashboard-kicker">{kicker}</p>
            <h1>{title}</h1>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
        )}
        <div className="print-actions">
          {actions ?? (
            <>
              <DashboardAppNav active={active} gestaoId={gestaoId} />
              <SignOutButton />
            </>
          )}
        </div>
      </header>
      {below != null ? <div className="dashboard-page-toolbar">{below}</div> : null}
    </>
  );
}
