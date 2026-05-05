import { listTasks } from "@/lib/db";
import { getMetrics } from "@/lib/metrics";
import { TaskBoard } from "@/app/task-board";
import type { Metrics, Task } from "@/lib/types";

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

function needsAttention(task: Task) {
  return Boolean(
    task.prUrl || task.status === "blocked" || task.status === "failed" || task.error,
  );
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function ObservabilityRail({
  metrics,
  tasks,
}: {
  metrics: Metrics;
  tasks: Task[];
}) {
  const acceptedTasks = tasks.filter(task => task.intakeDecision === "accepted");
  const blockedOrFailed = metrics.blocked + metrics.failed;
  const attentionQueue = tasks.filter(needsAttention).slice(0, 4);
  const statusMix = [
    { label: "Active", value: metrics.active },
    { label: "Completed", value: metrics.completed },
    { label: "Blocked", value: metrics.blocked },
    { label: "Failed", value: metrics.failed },
  ];
  const maxStatus = Math.max(...statusMix.map(item => item.value), 1);

  return (
    <aside className="observabilityRail" aria-label="Observability and analytics">
      <div className="railHeader">
        <p className="sectionKicker">Observability</p>
        <h2>Lane Health</h2>
      </div>

      <section className="healthPanel" aria-label="Success rate">
        <span>Success rate</span>
        <strong>{formatSuccessRate(metrics.successRate)}</strong>
        <small>
          {metrics.completed} completed of {metrics.completed + blockedOrFailed} terminal
          sessions
        </small>
      </section>

      <section className="railMetricList" aria-label="Task metrics">
        <div>
          <span>Accepted</span>
          <strong>{metrics.total}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Blocked / Failed</span>
          <strong>{blockedOrFailed}</strong>
        </div>
        <div>
          <span>Avg duration</span>
          <strong>{formatDuration(metrics.averageDurationSeconds)}</strong>
        </div>
      </section>

      <section className="railSection" aria-label="Status mix">
        <div className="railSectionHeader">
          <h3>Status Mix</h3>
          <span>{acceptedTasks.length} accepted</span>
        </div>
        <div className="statusMix">
          {statusMix.map(item => (
            <div key={item.label} className="statusMixRow">
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <span className="statusBarTrack" aria-hidden="true">
                <span
                  className="statusBarFill"
                  style={{ width: `${(item.value / maxStatus) * 100}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="railSection" aria-label="Attention queue">
        <div className="railSectionHeader">
          <h3>Attention Queue</h3>
          <span>{attentionQueue.length}</span>
        </div>
        {attentionQueue.length > 0 ? (
          <ol className="attentionList">
            {attentionQueue.map(task => (
              <li key={task.id}>
                <span>{task.repoFullName}#{task.issueNumber}</span>
                <strong>{statusLabel(task.status)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="quietCopy">No sessions need maintainer attention.</p>
        )}
      </section>
    </aside>
  );
}

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

      <div className="dashboardLayout">
        <section className="taskSection" aria-label="Remediation sessions">
          <div className="sectionHeader">
            <div>
              <p className="sectionKicker">Sessions</p>
              <h2>Remediation Queue</h2>
            </div>
            <span className="sectionCount">{tasks.length} records</span>
          </div>

          <TaskBoard tasks={tasks} />
        </section>

        <ObservabilityRail metrics={metrics} tasks={tasks} />
      </div>
    </main>
  );
}
