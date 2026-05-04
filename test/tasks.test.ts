import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

let tempDir = "";

beforeEach(() => {
  vi.resetModules();
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "devin-queue-"));
  process.env.SQLITE_PATH = path.join(tempDir, "tasks.db");
  process.env.DEVIN_DRY_RUN = "true";
  process.env.GITHUB_DRY_RUN = "true";
  process.env.GITHUB_OWNER = "your-org";
  process.env.GITHUB_REPO = "superset";
  process.env.AUTHORIZED_GITHUB_LOGINS = "your-github-user";
  process.env.APP_BASE_URL = "http://localhost:3000";
});

afterEach(async () => {
  const db = await import("@/lib/db");
  db.resetDbForTests();
  fs.rmSync(tempDir, { recursive: true, force: true });
  delete process.env.SQLITE_PATH;
  delete process.env.GITHUB_OWNER;
  delete process.env.GITHUB_REPO;
  delete process.env.AUTHORIZED_GITHUB_LOGINS;
});

describe("tasks orchestration", () => {
  test("simulates, enforces idempotency, and polls dry-run Devin", async () => {
    const tasks = await import("@/lib/tasks");
    const db = await import("@/lib/db");

    const first = await tasks.simulateIssueEvent();
    expect(first.accepted).toBe(true);
    expect(db.listTasks()).toHaveLength(1);
    expect(db.listTasks()[0].devinSessionUrl).toContain("app.devin.ai");

    const duplicate = await tasks.simulateIssueEvent();
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(db.listTasks()).toHaveLength(1);

    const polled = await tasks.pollActiveDevinSessions();
    expect(polled.polled).toBe(1);

    const [task] = db.listTasks();
    expect(task.status).toBe("finished");
    expect(task.prUrl).toContain("github.com/example/superset/pull/1");
    expect(task.durationSeconds).toEqual(expect.any(Number));
  });
});
