"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { formatStatusDetail } from "@/lib/status-detail";
import type { Task } from "@/lib/types";

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

function statusClass(status: string) {
  if (status === "completed") return "status statusSuccess";
  if (status === "blocked") return "status statusBlocked";
  if (status === "failed") return "status statusFailed";
  if (status === "rejected") return "status statusRejected";
  return "status statusActive";
}

function decisionClass(decision: string) {
  return decision === "accepted" ? "status statusSuccess" : "status statusRejected";
}

function externalLink(url: string | null, label: string) {
  if (!url) return <span className="muted">n/a</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function reviewState(task: Task) {
  if (task.prUrl) return "Required";
  if (task.status === "blocked" || task.status === "failed") return "Required";
  if (task.status === "completed") return "Check outcome";
  if (task.status === "rejected") return "n/a";
  return "Pending";
}

function testsRun(task: Task) {
  return task.structuredOutput?.tests_run || [];
}

function lifecycleItems(task: Task) {
  const triggerLabel =
    task.triggerAction === "labeled"
      ? "Issue labeled"
      : task.triggerAction === "opened"
        ? "Issue opened"
        : "Issue triggered";

  const items: Array<{ done: boolean; label: string; time: string | null }> = [
    {
      done: true,
      label: triggerLabel,
      time: task.startedAt,
    },
    {
      done: true,
      label: task.intakeDecision === "rejected" ? "Rejected" : "Task accepted",
      time:
        task.intakeDecision === "rejected"
          ? task.updatedAt
          : task.acceptedCommentPostedAt || task.startedAt,
    },
  ];

  if (task.intakeDecision === "rejected") return items;

  items.push({
    done: Boolean(task.devinSessionId),
    label: "Session created",
    time: task.sessionCommentPostedAt,
  });
  items.push({
    done: true,
    label: "Status updated",
    time: task.updatedAt,
  });
  items.push({
    done: Boolean(task.prUrl || task.blocker || task.error),
    label: task.prUrl
      ? "PR opened"
      : task.blocker
        ? "Blocker recorded"
        : task.status === "failed" || task.error
          ? "Failure recorded"
          : "PR/blocker",
    time: task.completedAt,
  });
  items.push({
    done: Boolean(task.finalCommentPostedAt),
    label: "Final comment",
    time: task.finalCommentPostedAt,
  });

  return items;
}

function Timeline({ task }: { task: Task }) {
  return (
    <ol className="timeline">
      {lifecycleItems(task).map(item => (
        <li key={item.label} className={item.done ? "done" : ""}>
          <span>{item.label}</span>
          <small>{item.time ? formatDate(item.time) : "pending"}</small>
        </li>
      ))}
    </ol>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="fieldLabel">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function TaskTile({
  task,
  expanded,
  onToggle,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tests = testsRun(task);
  const detailsId = `task-details-${task.id}`;

  return (
    <article
      id={`task-${task.id}`}
      className={expanded ? "taskTile taskTileExpanded" : "taskTile"}
    >
      <div className="taskTileTop">
        <div className="taskTitleBlock">
          <div className="issueTitle">{externalLink(task.issueUrl, task.issueTitle)}</div>
          <div className="meta">
            {task.repoFullName}#{task.issueNumber}
          </div>
        </div>
        <div className="tileActions">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={onToggle}
          >
            {expanded ? "Hide details" : "Show details"}
          </button>
        </div>
      </div>

      <div className="tileStatusLine">
        <span className={decisionClass(task.intakeDecision)}>{task.intakeDecision}</span>
        <span className={statusClass(task.status)}>{task.status}</span>
        <span className="reviewBadge">Review: {reviewState(task)}</span>
      </div>

      <div className="tileSummaryGrid">
        <Field
          label="Control"
          value={
            <>
              <div>
                Trigger: {task.triggerActor ? `@${task.triggerActor}` : "unknown"} via{" "}
                {task.triggerAction || "GitHub"}
              </div>
              <div className="muted">{task.authorizationReason || "No decision detail"}</div>
            </>
          }
        />
        <Field
          label="Status detail"
          value={
            <>
              <div>{formatStatusDetail(task.statusDetail)}</div>
              <div className="muted">Duration: {formatDuration(task.durationSeconds)}</div>
            </>
          }
        />
        <Field
          label="Workflow links"
          value={
            <div className="linkStack">
              {externalLink(task.issueUrl, "GitHub issue")}
              {externalLink(task.devinSessionUrl, "Devin session")}
              {externalLink(task.prUrl, "Pull request")}
            </div>
          }
        />
      </div>

      {expanded ? (
        <div id={detailsId} className="tileDetails">
          <section className="detailColumn">
            <h3>Quality Signals</h3>
            <Field
              label="Suggested test"
              value={<code>{task.suggestedTestCommand || "n/a"}</code>}
            />
            <Field
              label="Tests run"
              value={
                tests.length > 0 ? (
                  <ul className="compactList">
                    {tests.map(test => (
                      <li key={test}>{test}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="muted">n/a</span>
                )
              }
            />
            {task.structuredOutput?.summary ? (
              <Field label="Summary" value={task.structuredOutput.summary} />
            ) : null}
            {task.blocker || task.error ? (
              <Field label="Blocker/Error" value={task.blocker || task.error} />
            ) : null}
          </section>

          <section className="detailColumn">
            <h3>Lifecycle</h3>
            <Timeline task={task} />
          </section>
        </div>
      ) : null}
    </article>
  );
}

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  if (tasks.length === 0) {
    return (
      <div className="emptyState">
        No remediation tasks yet. Trigger a demo with{" "}
        <code>curl -X POST http://localhost:3000/api/simulate</code>.
      </div>
    );
  }

  function toggleTask(id: number) {
    setExpandedIds(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="taskGrid">
      {tasks.map(task => (
        <TaskTile
          key={task.id}
          task={task}
          expanded={expandedIds.has(task.id)}
          onToggle={() => toggleTask(task.id)}
        />
      ))}
    </div>
  );
}
