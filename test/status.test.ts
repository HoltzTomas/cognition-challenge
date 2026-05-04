import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";

describe("Devin polling status mapping", () => {
  test("treats structured succeeded output with a PR URL and waiting_for_user as review_required", async () => {
    process.env.DEVIN_DRY_RUN = "true";
    process.env.GITHUB_DRY_RUN = "true";
    process.env.DRY_RUN_STATUS_DETAIL = "waiting_for_user";
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "devin-status-"));
    process.env.SQLITE_PATH = path.join(tempDir, "tasks.db");
    vi.resetModules();

    const { createTask, resetDbForTests, updateTask } = await import("@/lib/db");
    const { pollActiveDevinSessions } = await import("@/lib/tasks");
    const { task } = createTask({
      repoFullName: "example/superset",
      repoUrl: "https://github.com/example/superset",
      issueNumber: 1,
      issueTitle: "Issue",
      issueBody: "Body",
      issueUrl: "https://github.com/example/superset/issues/1",
      rawEvent: {},
    });

    updateTask(task.id, {
      devinSessionId: "devin-dry-run-example",
      devinSessionUrl: "https://app.devin.ai/sessions/devin-dry-run-example",
      status: "running",
    });

    const result = await pollActiveDevinSessions();
    expect(result.polled).toBe(1);
    expect(result.tasks[0]?.status).toBe("review_required");
    expect(result.tasks[0]?.prUrl).toContain("github.com/example/superset/pull/1");

    resetDbForTests();
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DRY_RUN_STATUS_DETAIL;
  });
});
