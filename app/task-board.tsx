"use client";

import { useEffect, useRef, useState } from "react";
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

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
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

function QuickLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a className="quickLink" href={url} target="_blank" rel="noreferrer">
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
    <div className="detailField">
      <div className="fieldLabel">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function TaskTile({
  task,
  selected,
  onSelect,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
}) {
  const drawerId = `session-drawer-${task.id}`;

  return (
    <article
      id={`task-${task.id}`}
      className={selected ? "sessionCard sessionCardSelected" : "sessionCard"}
    >
      <div className="sessionCardTop">
        <div className="taskTitleBlock">
          <div className="issueTitle">{externalLink(task.issueUrl, task.issueTitle)}</div>
          <div className="meta">
            {task.repoFullName}#{task.issueNumber}
          </div>
        </div>
        <button
          type="button"
          className="inspectButton"
          aria-expanded={selected}
          aria-controls={drawerId}
          onClick={onSelect}
        >
          {selected ? "Viewing" : "Show details"}
        </button>
      </div>

      <div className="tileStatusLine">
        <span className={decisionClass(task.intakeDecision)}>{task.intakeDecision}</span>
        <span className={statusClass(task.status)}>{statusLabel(task.status)}</span>
        <span className="reviewBadge">Review: {reviewState(task)}</span>
        <span className="durationPill">Duration {formatDuration(task.durationSeconds)}</span>
      </div>

      <div className="sessionSummary">
        <Field
          label="Status detail"
          value={<span>{formatStatusDetail(task.statusDetail)}</span>}
        />
        <Field
          label="Control"
          value={
            <>
              <div>
                {task.triggerActor ? `@${task.triggerActor}` : "Unknown actor"} via{" "}
                {task.triggerAction || "GitHub"}
              </div>
              <div className="muted">{task.authorizationReason || "No decision detail"}</div>
            </>
          }
        />
        <div className="quickLinks" aria-label="Workflow links">
          <QuickLink label="Issue" url={task.issueUrl} />
          <QuickLink label="Devin" url={task.devinSessionUrl} />
          <QuickLink label="PR" url={task.prUrl} />
        </div>
      </div>
    </article>
  );
}

function TaskDetailsDrawer({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const tests = testsRun(task);
  const titleId = `session-drawer-title-${task.id}`;

  useEffect(() => {
    drawerRef.current?.focus();
  }, [task.id]);

  return (
    <>
      <button
        type="button"
        className="drawerBackdrop"
        aria-label="Close session details"
        onClick={onClose}
      />
      <aside
        id={`session-drawer-${task.id}`}
        ref={drawerRef}
        className="detailDrawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="drawerHeader">
          <div>
            <p className="drawerKicker">Session Details</p>
            <h2 id={titleId}>{task.issueTitle}</h2>
            <div className="drawerMeta">
              {task.repoFullName}#{task.issueNumber}
            </div>
          </div>
          <button type="button" className="closeButton" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="drawerBody">
          <section className="drawerSection" aria-label="Session state">
            <div className="drawerStatusRow">
              <span className={decisionClass(task.intakeDecision)}>{task.intakeDecision}</span>
              <span className={statusClass(task.status)}>{statusLabel(task.status)}</span>
              <span className="reviewBadge">Review: {reviewState(task)}</span>
            </div>
            <Field
              label="Status detail"
              value={formatStatusDetail(task.statusDetail)}
            />
            <Field label="Duration" value={formatDuration(task.durationSeconds)} />
          </section>

          <section className="drawerSection" aria-label="Workflow links">
            <h3>Workflow Links</h3>
            <div className="drawerLinkGrid">
              <Field label="GitHub issue" value={externalLink(task.issueUrl, "Open issue")} />
              <Field
                label="Devin session"
                value={externalLink(task.devinSessionUrl, "Open session")}
              />
              <Field label="Pull request" value={externalLink(task.prUrl, "Open PR")} />
            </div>
          </section>

          <section className="drawerSection" aria-label="Quality signals">
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

          <section className="drawerSection" aria-label="Lifecycle">
            <h3>Lifecycle</h3>
            <Timeline task={task} />
          </section>

          <section className="drawerSection" aria-label="Automation provenance">
            <h3>Automation Provenance</h3>
            <div className="provenanceGrid">
              <Field
                label="Trigger"
                value={`${task.triggerAction || "GitHub"} by ${
                  task.triggerActor ? `@${task.triggerActor}` : "unknown actor"
                }`}
              />
              <Field
                label="Authorization"
                value={task.authorizationReason || "No decision detail"}
              />
              <Field label="Session id" value={task.devinSessionId || "n/a"} />
              <Field label="Started" value={formatDate(task.startedAt)} />
              <Field label="Updated" value={formatDate(task.updatedAt)} />
              <Field label="Completed" value={formatDate(task.completedAt)} />
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

export function TaskBoard({
  appBaseUrl,
  simulationEnabled,
  tasks,
}: {
  appBaseUrl: string;
  simulationEnabled: boolean;
  tasks: Task[];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedTask = tasks.find(task => task.id === selectedId) || null;

  useEffect(() => {
    if (selectedId !== null && !tasks.some(task => task.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, tasks]);

  useEffect(() => {
    if (!selectedTask) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTask]);

  if (tasks.length === 0) {
    const simulateCommand = `curl -X POST ${appBaseUrl.replace(/\/$/, "")}/api/simulate`;

    return (
      <div className="emptyState">
        {simulationEnabled ? (
          <>
            No remediation sessions yet. Trigger a demo with{" "}
            <code>{simulateCommand}</code>.
          </>
        ) : (
          <>
            No remediation sessions yet. This hosted demo accepts signed GitHub issue
            webhooks at <code>{appBaseUrl.replace(/\/$/, "")}/api/webhooks/github</code>.
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="sessionList">
        {tasks.map(task => (
          <TaskTile
            key={task.id}
            task={task}
            selected={task.id === selectedId}
            onSelect={() => setSelectedId(task.id)}
          />
        ))}
      </div>

      {selectedTask ? (
        <TaskDetailsDrawer task={selectedTask} onClose={() => setSelectedId(null)} />
      ) : null}
    </>
  );
}
