import { listTasks } from "@/lib/db";
import type { Metrics, Task } from "@/lib/types";

function isActive(task: Task) {
  return ["accepted", "session_created", "working"].includes(task.status);
}

function isCompleted(task: Task) {
  return task.status === "completed";
}

function isBlocked(task: Task) {
  return task.status === "blocked";
}

function isFailed(task: Task) {
  return task.status === "failed";
}

export function calculateMetrics(tasks: Task[]): Metrics {
  const acceptedTasks = tasks.filter(task => task.intakeDecision === "accepted");
  const completed = acceptedTasks.filter(isCompleted);
  const blocked = acceptedTasks.filter(isBlocked);
  const failed = acceptedTasks.filter(isFailed);
  const terminalCount = completed.length + blocked.length + failed.length;
  const durations = acceptedTasks
    .map(task => task.durationSeconds)
    .filter((value): value is number => typeof value === "number");

  return {
    total: acceptedTasks.length,
    active: acceptedTasks.filter(isActive).length,
    completed: completed.length,
    blocked: blocked.length,
    failed: failed.length,
    successRate: terminalCount === 0 ? 0 : completed.length / terminalCount,
    averageDurationSeconds:
      durations.length === 0
        ? null
        : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
  };
}

export function getMetrics() {
  return calculateMetrics(listTasks());
}
