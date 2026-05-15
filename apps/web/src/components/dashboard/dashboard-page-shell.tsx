import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function DashboardPageShell({ children, className }: Props) {
  return <main className={["report-page dashboard-page-shell", className].filter(Boolean).join(" ")}>{children}</main>;
}
