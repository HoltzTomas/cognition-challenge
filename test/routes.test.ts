import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

let tempDir = "";

beforeEach(() => {
  vi.resetModules();
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "devin-routes-"));
  process.env.SQLITE_PATH = path.join(tempDir, "tasks.db");
  process.env.DEVIN_DRY_RUN = "true";
  process.env.GITHUB_DRY_RUN = "true";
});

afterEach(async () => {
  const db = await import("@/lib/db");
  db.resetDbForTests();
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.SQLITE_PATH;
  delete process.env.DEVIN_DRY_RUN;
  delete process.env.GITHUB_DRY_RUN;
  delete process.env.CRON_SECRET;
  delete process.env.DASHBOARD_DEVIN_REFRESH;
  delete process.env.DASHBOARD_DEVIN_REFRESH_INTERVAL_MS;
  delete process.env.SIMULATION_ENABLED;
});

describe("API route guards", () => {
  test("rejects poller requests when CRON_SECRET is configured and missing", async () => {
    process.env.CRON_SECRET = "secret";
    const { POST } = await import("@/app/api/cron/poll-devin/route");

    const response = await POST(
      new Request("http://localhost/api/cron/poll-devin", { method: "POST" }),
    );

    expect(response.status).toBe(401);
  });

  test("accepts poller requests with the configured CRON_SECRET bearer token", async () => {
    process.env.CRON_SECRET = "secret";
    const { POST } = await import("@/app/api/cron/poll-devin/route");

    const response = await POST(
      new Request("http://localhost/api/cron/poll-devin", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ polled: 0 });
  });

  test("blocks the simulation helper when SIMULATION_ENABLED is false", async () => {
    process.env.SIMULATION_ENABLED = "false";
    const { POST } = await import("@/app/api/simulate/route");

    const response = await POST(
      new Request("http://localhost/api/simulate", { method: "POST" }),
    );

    expect(response.status).toBe(403);
  });

  test("refreshes active Devin sessions before returning dashboard tasks", async () => {
    process.env.DASHBOARD_DEVIN_REFRESH_INTERVAL_MS = "0";
    const { createTask, updateTask } = await import("@/lib/db");
    const { GET } = await import("@/app/api/tasks/route");
    const { task } = createTask({
      repoFullName: "example/superset",
      repoUrl: "https://github.com/example/superset",
      issueNumber: 10,
      issueTitle: "Issue",
      issueBody: "Body",
      issueUrl: "https://github.com/example/superset/issues/10",
      rawEvent: {},
    });

    updateTask(task.id, {
      devinSessionId: "devin-dry-run-example",
      devinSessionUrl: "https://app.devin.ai/sessions/devin-dry-run-example",
      status: "session_created",
    });

    const response = await GET();
    const payload = (await response.json()) as {
      tasks: Array<{ status: string; statusDetail: string | null; prUrl: string | null }>;
    };

    expect(payload.tasks[0]).toMatchObject({
      status: "completed",
      statusDetail: "pr_opened",
      prUrl: "https://github.com/example/superset/pull/1",
    });
  });

  test("refreshes active Devin sessions before returning dashboard metrics", async () => {
    process.env.DASHBOARD_DEVIN_REFRESH_INTERVAL_MS = "0";
    const { createTask, updateTask } = await import("@/lib/db");
    const { GET } = await import("@/app/api/metrics/route");
    const { task } = createTask({
      repoFullName: "example/superset",
      repoUrl: "https://github.com/example/superset",
      issueNumber: 11,
      issueTitle: "Issue",
      issueBody: "Body",
      issueUrl: "https://github.com/example/superset/issues/11",
      rawEvent: {},
    });

    updateTask(task.id, {
      devinSessionId: "devin-dry-run-example",
      devinSessionUrl: "https://app.devin.ai/sessions/devin-dry-run-example",
      status: "session_created",
    });

    const response = await GET();
    const payload = await response.json();

    expect(payload).toMatchObject({
      active: 0,
      completed: 1,
      total: 1,
    });
  });
});
