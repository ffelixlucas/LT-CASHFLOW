import type { ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<"section">;

export function DashboardSection({ className = "", children, ...rest }: Props) {
  return (
    <section className={`rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5 ${className}`} {...rest}>
      {children}
    </section>
  );
}
