import type { ReactNode } from "react";

/** Espaçamento vertical único entre blocos sob o header. */
export function DashboardStack({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={[className, "dashboard-stack"].filter(Boolean).join(" ").trim()}>{children}</div>
  );
}
