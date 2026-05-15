import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";

export default function DashboardLoading() {
  return (
    <DashboardPageShell>
      <div className="dashboard-loading" aria-label="Carregando dashboard">
        <div className="dashboard-loading-header" />
        <div className="dashboard-loading-hero" />
        <div className="dashboard-loading-grid">
          <div className="dashboard-loading-card" />
          <div className="dashboard-loading-card" />
          <div className="dashboard-loading-card" />
          <div className="dashboard-loading-card" />
        </div>
      </div>
    </DashboardPageShell>
  );
}
