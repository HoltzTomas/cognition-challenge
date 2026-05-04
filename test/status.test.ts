import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";

describe("Devin polling status mapping", () => {
  test("keeps structured blocked output active while Devin is still working", async () => {
    const { deriveStatus } = await import("@/lib/tasks");

    expect(
      deriveStatus({
        session_id: "devin-working",
        status: "running",
        status_detail: "working",
        structured_output: {
          status: "blocked",
          summary: "Still investigating.",
          tests_run: [],
        },
        url: "https://app.devin.ai/sessions/devin-working",
      }),
    ).toBe("working");
  });

  test("treats a PR URL as completed even when Devin detail still says working", async () => {
    process.env.DEVIN_DRY_RUN = "true";
    process.env.GITHUB_DRY_RUN = "true";
    process.env.DRY_RUN_STATUS_DETAIL = "working";
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
    expect(result.tasks[0]?.status).toBe("completed");
    expect(result.tasks[0]?.statusDetail).toBe("pr_opened");
    expect(result.tasks[0]?.prUrl).toContain("github.com/example/superset/pull/1");

    resetDbForTests();
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DRY_RUN_STATUS_DETAIL;
  });
});
