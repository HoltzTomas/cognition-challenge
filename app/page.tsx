import { listTasks } from "@/lib/db";
import { getMetrics } from "@/lib/metrics";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null) {
  if (typeof seconds !== "number") return "n/a";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatSuccessRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

function statusClass(status: string) {
  if (["finished", "exit"].includes(status)) return "status statusSuccess";
  if (status === "review_required") return "status statusReview";
  if (["blocked", "suspended"].includes(status)) return "status statusBlocked";
  if (["failed", "error"].includes(status)) return "status statusFailed";
  return "status statusActive";
}

function externalLink(url: string | null, label: string) {
  if (!url) return <span className="muted">n/a</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <tr id={`task-${task.id}`}>
      <td>
        <div className="issueTitle">
          {externalLink(task.issueUrl, task.issueTitle)}
        </div>
        <div className="meta">
          {task.repoFullName}#{task.issueNumber}
        </div>
      </td>
      <td>{externalLink(task.devinSessionUrl, task.devinSessionId || "Session")}</td>
      <td>
        <span className={statusClass(task.status)}>{task.status}</span>
        <div className="meta">{task.statusDetail || "No detail yet"}</div>
      </td>
      <td>{externalLink(task.prUrl, "Pull request")}</td>
      <td className="boundedText">{task.blocker || task.error || "None"}</td>
      <td>{formatDate(task.startedAt)}</td>
      <td>{formatDuration(task.durationSeconds)}</td>
      <td>{typeof task.acusConsumed === "number" ? task.acusConsumed : "n/a"}</td>
    </tr>
  );
}

export default function DashboardPage() {
  const tasks = listTasks();
  const metrics = getMetrics();

  return (
    <main>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Cognition Take Home</p>
          <h1>Devin Remediation Queue</h1>
        </div>
        <div className="headerActions">
          <a href="/api/tasks">Tasks JSON</a>
          <a href="/api/metrics">Metrics JSON</a>
        </div>
      </header>

      <section className="metricGrid" aria-label="Task metrics">
        <div>
          <span>Total</span>
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
        <div>
          <span>Total ACUs</span>
          <strong>{metrics.totalAcusConsumed ?? "n/a"}</strong>
        </div>
      </section>

      <section className="taskSection">
        <div className="sectionHeader">
          <h2>Tasks</h2>
        </div>

        {tasks.length === 0 ? (
          <div className="emptyState">
            No remediation tasks yet. Trigger a demo with{" "}
            <code>curl -X POST http://localhost:3000/api/simulate</code>.
          </div>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Devin Session</th>
                  <th>Status</th>
                  <th>PR</th>
                  <th>Blocker/Error</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>ACUs</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
