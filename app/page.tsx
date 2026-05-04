import { listTasks } from "@/lib/db";
import { getMetrics } from "@/lib/metrics";
import { DashboardRefresh } from "@/app/dashboard-refresh";
import { TaskBoard } from "@/app/task-board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null) {
  if (typeof seconds !== "number") return "n/a";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatSuccessRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function DashboardPage() {
  const tasks = listTasks();
  const metrics = getMetrics();

  return (
    <main>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Maintainer Operations</p>
          <h1>Superset Remediation Lane</h1>
        </div>
        <div className="headerActions">
          <DashboardRefresh />
          <a href="/api/tasks">Tasks JSON</a>
          <a href="/api/metrics">Metrics JSON</a>
        </div>
      </header>

      <section className="metricGrid" aria-label="Task metrics">
        <div>
          <span>Accepted Tasks</span>
          <strong>{metrics.total}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{metrics.completed}</strong>
        </div>
        <div>
          <span>Blocked</span>
          <strong>{metrics.blocked}</strong>
        </div>
        <div>
          <span>Failed</span>
          <strong>{metrics.failed}</strong>
        </div>
        <div>
          <span>Success Rate</span>
          <strong>{formatSuccessRate(metrics.successRate)}</strong>
        </div>
        <div>
          <span>Avg Duration</span>
          <strong>{formatDuration(metrics.averageDurationSeconds)}</strong>
        </div>
      </section>

      <section className="taskSection">
        <div className="sectionHeader">
          <h2>Tasks</h2>
        </div>

        <TaskBoard tasks={tasks} />
      </section>
    </main>
  );
}
