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
    expect(db.listTasks()[0].status).toBe("session_created");
    expect(db.listTasks()[0].triggerActor).toBe("your-github-user");
    expect(db.listTasks()[0].triggerAction).toBe("opened");
    expect(db.listTasks()[0].intakeDecision).toBe("accepted");
    expect(db.listTasks()[0].suggestedTestCommand).toContain("parseCookie.test.ts");

    const duplicate = await tasks.simulateIssueEvent();
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(db.listTasks()).toHaveLength(1);

    const polled = await tasks.pollActiveDevinSessions();
    expect(polled.polled).toBe(1);

    const [task] = db.listTasks();
    expect(task.status).toBe("completed");
    expect(task.statusDetail).toBe("pr_opened");
    expect(task.prUrl).toContain("github.com/example/superset/pull/1");
    expect(task.durationSeconds).toEqual(expect.any(Number));
  });

  test("records rejected triggers and promotes them when an authorized maintainer retries", async () => {
    process.env.AUTHORIZED_GITHUB_LOGINS = "alice";
    const tasks = await import("@/lib/tasks");
    const db = await import("@/lib/db");

    const payload = {
      action: "labeled",
      repository: {
        full_name: "your-org/superset",
        html_url: "https://github.com/your-org/superset",
      },
      issue: {
        author_association: "NONE",
        number: 777,
        title: "Bounded issue",
        body: "## Suggested test command\n`yarn test focused.test.ts`",
        html_url: "https://github.com/your-org/superset/issues/777",
        labels: [{ name: "devin-remediate" }],
      },
      label: { name: "devin-remediate" },
      sender: { login: "mallory" },
    };

    const rejected = await tasks.simulateIssueEvent(payload);
    expect(rejected.accepted).toBe(false);
    expect(rejected.authorized).toBe(false);
    expect(db.listTasks()).toHaveLength(1);
    expect(db.listTasks()[0].status).toBe("rejected");
    expect(db.listTasks()[0].intakeDecision).toBe("rejected");
    expect(db.listTasks()[0].suggestedTestCommand).toContain("focused.test.ts");

    const promoted = await tasks.simulateIssueEvent({
      ...payload,
      sender: { login: "alice" },
    });

    expect(promoted.accepted).toBe(true);
    expect(promoted.promoted).toBe(true);
    expect(db.listTasks()).toHaveLength(1);
    expect(db.listTasks()[0].status).toBe("session_created");
    expect(db.listTasks()[0].intakeDecision).toBe("accepted");
    expect(db.listTasks()[0].triggerActor).toBe("alice");
  });
});
