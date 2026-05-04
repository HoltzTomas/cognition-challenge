import { listTasks } from "@/lib/db";
import type { Metrics, Task } from "@/lib/types";

function isActive(task: Task) {
  return ![
    "finished",
    "review_required",
    "blocked",
    "failed",
    "error",
    "suspended",
    "exit",
  ].includes(task.status);
}

function isCompleted(task: Task) {
  return (
    task.status === "finished" ||
    task.status === "review_required" ||
    task.status === "exit"
  );
}

function isBlocked(task: Task) {
  return task.status === "blocked" || task.status === "suspended";
}

function isFailed(task: Task) {
  return task.status === "failed" || task.status === "error";
}

export function calculateMetrics(tasks: Task[]): Metrics {
  const completed = tasks.filter(isCompleted);
  const blocked = tasks.filter(isBlocked);
  const failed = tasks.filter(isFailed);
  const terminalCount = completed.length + blocked.length + failed.length;
  const durations = tasks
    .map(task => task.durationSeconds)
    .filter((value): value is number => typeof value === "number");
  const acus = tasks
    .map(task => task.acusConsumed)
    .filter((value): value is number => typeof value === "number");

  return {
    total: tasks.length,
    active: tasks.filter(isActive).length,
    completed: completed.length,
    blocked: blocked.length,
    failed: failed.length,
    successRate: terminalCount === 0 ? 0 : completed.length / terminalCount,
    averageDurationSeconds:
      durations.length === 0
        ? null
        : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
    totalAcusConsumed:
      acus.length === 0
        ? null
        : Number(acus.reduce((sum, value) => sum + value, 0).toFixed(2)),
  };
}

export function getMetrics() {
  return calculateMetrics(listTasks());
}
