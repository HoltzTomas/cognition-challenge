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
});
