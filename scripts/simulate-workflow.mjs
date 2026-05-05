import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#") && line.includes("="))
      .map(line => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

async function localEnv() {
  try {
    return parseEnv(await readFile(new URL("../.env", import.meta.url), "utf8"));
  } catch {
    return {};
  }
}

const envFile = await localEnv();

const baseUrl = (
  process.env.SIMULATION_BASE_URL ||
  process.env.APP_BASE_URL ||
  envFile.APP_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const webhookSecret =
  process.env.GITHUB_WEBHOOK_SECRET ||
  envFile.GITHUB_WEBHOOK_SECRET ||
  "replace-with-a-random-secret";
const cronSecret = process.env.CRON_SECRET || envFile.CRON_SECRET || "";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${text}`);
  }

  return body;
}

function signatureFor(rawBody) {
  return `sha256=${crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody, "utf8")
    .digest("hex")}`;
}

async function deliverSignedIssueWebhook(payloadPath) {
  const rawBody = await readFile(new URL(payloadPath, import.meta.url), "utf8");

  return request("/api/webhooks/github", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Delivery": crypto.randomUUID(),
      "X-GitHub-Event": "issues",
      "X-Hub-Signature-256": signatureFor(rawBody),
    },
    body: rawBody,
  });
}

function printTask(label, result) {
  const task = result.task;
  if (!task) {
    console.log(`${label}: no task returned`);
    return;
  }

  const duplicate = result.duplicate ? "duplicate" : "created";
  console.log(
    `${label}: ${duplicate}, ${task.intakeDecision}, ${task.status} (${task.repoFullName}#${task.issueNumber})`,
  );

  if (task.devinSessionUrl) {
    console.log(`  Devin session: ${task.devinSessionUrl}`);
  }
  if (task.prUrl) {
    console.log(`  PR: ${task.prUrl}`);
  }
}

async function main() {
  console.log(`Simulating signed GitHub issue webhooks against ${baseUrl}`);

  const first = await deliverSignedIssueWebhook(
    "../sample-events/parse-cookie-opened.json",
  );
  printTask("Issue 101", first);

  const second = await deliverSignedIssueWebhook(
    "../sample-events/get-owner-name-labeled.json",
  );
  printTask("Issue 102", second);

  const poll = await request("/api/cron/poll-devin", {
    method: "POST",
    headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : undefined,
  });
  console.log(`Poller: checked ${poll.polled} active task(s)`);

  const { tasks } = await request("/api/tasks");
  const metrics = await request("/api/metrics");

  console.log(
    `Metrics: total=${metrics.total}, completed=${metrics.completed}, blocked=${metrics.blocked}, failed=${metrics.failed}, successRate=${Math.round(
      metrics.successRate * 100,
    )}%`,
  );
  console.log("Tasks:");
  for (const task of tasks) {
    console.log(
      `  - ${task.repoFullName}#${task.issueNumber}: ${task.intakeDecision}/${task.status}`,
    );
  }
  console.log(`Dashboard: ${baseUrl}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
