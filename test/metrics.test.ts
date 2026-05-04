import { calculateMetrics } from "@/lib/metrics";
import type { Task } from "@/lib/types";

function task(status: string, durationSeconds?: number, acusConsumed?: number): Task {
  return {
    id: Math.random(),
    taskKey: "repo#1",
    repoFullName: "repo/name",
    repoUrl: "https://github.com/repo/name",
    issueNumber: 1,
    issueTitle: "Issue",
    issueBody: "",
    issueUrl: "https://github.com/repo/name/issues/1",
    devinSessionId: null,
    devinSessionUrl: null,
    status,
    statusDetail: null,
    structuredOutput: null,
    prUrl: null,
    blocker: null,
    error: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    durationSeconds: durationSeconds ?? null,
    acusConsumed: acusConsumed ?? null,
    acceptedCommentPostedAt: null,
    sessionCommentPostedAt: null,
    finalCommentPostedAt: null,
  };
}

describe("metrics", () => {
  test("calculates dashboard metrics", () => {
    const metrics = calculateMetrics([
      task("running"),
      task("finished", 10, 0.2),
      task("blocked", 30, 0.4),
      task("failed", 20, 0.1),
    ]);

    expect(metrics.total).toBe(4);
    expect(metrics.active).toBe(1);
    expect(metrics.completed).toBe(1);
    expect(metrics.blocked).toBe(1);
    expect(metrics.failed).toBe(1);
    expect(metrics.successRate).toBeCloseTo(1 / 3);
    expect(metrics.averageDurationSeconds).toBe(20);
    expect(metrics.totalAcusConsumed).toBe(0.7);
  });
});
