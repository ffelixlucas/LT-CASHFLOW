"use client";

import { useEffect } from "react";

type DashboardPeriod = "week" | "month" | "year";

export function DashboardPeriodPersistence({ period }: { period: DashboardPeriod }) {
  useEffect(() => {
    const maxAge = 60 * 60 * 24 * 180;
    document.cookie = `ltcashflow_dashboard_period=${period}; path=/dashboard; max-age=${maxAge}; samesite=lax`;
    window.localStorage.setItem("ltcashflow.dashboard.period", period);
  }, [period]);

  return null;
}
