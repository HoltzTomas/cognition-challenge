import { DashboardClient } from "@/app/dashboard-client";
import { listTasks } from "@/lib/db";
import { getMetrics } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const tasks = listTasks();
  const metrics = getMetrics();

  return (
    <main className="dashboardShell">
      <header className="pageHeader">
        <div className="titleCluster">
          <p className="eyebrow">Maintainer Operations</p>
          <div className="titleRow">
            <h1>Superset Remediation Lane</h1>
            <span className="livePill">Live lane</span>
          </div>
          <p className="pageDeck">
            Controlled Devin sessions for selected Superset issues, review gates,
            and maintainer handoffs.
          </p>
        </div>
      </header>

      <DashboardClient initialMetrics={metrics} initialTasks={tasks} />
    </main>
  );
}
