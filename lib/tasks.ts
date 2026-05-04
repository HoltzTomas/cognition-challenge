import fs from "node:fs";
import path from "node:path";
import { createDevinSession, getDevinSession } from "@/lib/devin/client";
import {
  createTask,
  getTaskById,
  listActiveTasks,
  updateTask,
} from "@/lib/db";
import { postIssueComment } from "@/lib/github/client";
import { buildDevinPrompt } from "@/lib/prompt";
import {
  authorizeGitHubIssueEvent,
  isRemediationTrigger,
  parseGitHubIssuePayload,
} from "@/lib/webhook";
import type { DevinSession, GitHubIssueEvent, StructuredOutput, Task } from "@/lib/types";

function nowIso() {
  return new Date().toISOString();
}

function durationSeconds(startedAt: string, endedAt: string) {
  return Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000),
  );
}

function dashboardUrl(taskId: number) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/#task-${taskId}`;
}

async function safeComment(task: Task, body: string) {
  try {
    return await postIssueComment(task.repoFullName, task.issueNumber, body);
  } catch (error) {
    console.error("Failed to post GitHub issue comment", error);
    return null;
  }
}

function acceptedComment(task: Task) {
  return [
    "Devin remediation automation accepted this issue.",
    "",
    `Task ID: ${task.id}`,
    `Dashboard: ${dashboardUrl(task.id)}`,
    "",
    "I will create a Devin session, track progress, and report back here with a PR or blocker.",
  ].join("\n");
}

function sessionCreatedComment(task: Task) {
  return [
    "Devin session created for this remediation task.",
    "",
    `Session: ${task.devinSessionUrl || "(pending)"}`,
    `Dashboard: ${dashboardUrl(task.id)}`,
  ].join("\n");
}

function finalComment(task: Task) {
  const headline =
    task.status === "review_required"
      ? "Devin remediation is ready for human review."
      : `Devin remediation finished with status: ${task.status}.`;
  const lines = [
    headline,
    "",
    `Status detail: ${task.statusDetail || "n/a"}`,
    `Duration: ${formatDuration(task.durationSeconds)}`,
  ];

  if (typeof task.acusConsumed === "number") {
    lines.push(`ACUs consumed: ${task.acusConsumed}`);
  }

  if (task.prUrl) {
    lines.push(`PR: ${task.prUrl}`);
  }

  if (task.blocker || task.error) {
    lines.push(`Blocker/error: ${task.blocker || task.error}`);
  }

  if (task.structuredOutput?.summary) {
    lines.push("", `Summary: ${task.structuredOutput.summary}`);
  }

  const tests = task.structuredOutput?.tests_run || [];
  if (tests.length > 0) {
    lines.push("", "Tests run:", ...tests.map(test => `- ${test}`));
  }

  lines.push("", `Dashboard: ${dashboardUrl(task.id)}`);
  return lines.join("\n");
}

function formatDuration(seconds: number | null) {
  if (typeof seconds !== "number") return "n/a";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function samplePayload() {
  const samplePath = path.join(process.cwd(), "sample-events", "parse-cookie-opened.json");
  return JSON.parse(fs.readFileSync(samplePath, "utf8"));
}

function firstPrUrl(session: DevinSession) {
  return (
    session.structured_output?.pr_url ||
    session.pull_requests?.find(pr => Boolean(pr.pr_url))?.pr_url ||
    null
  );
}

function structuredAcu(session: DevinSession) {
  const structured = session.structured_output as StructuredOutput | null | undefined;
  return structured?.acu_consumed ?? session.acus_consumed ?? null;
}

function deriveStatus(session: DevinSession) {
  const structuredStatus = session.structured_output?.status;

  if (session.status === "error") return "failed";
  if (session.status === "suspended") return "blocked";
  if (structuredStatus === "blocked") return "blocked";
  if (structuredStatus === "failed") return "failed";
  if (structuredStatus === "succeeded" && firstPrUrl(session)) {
    return session.status_detail === "waiting_for_user"
      ? "review_required"
      : "finished";
  }
  if (session.status_detail === "finished" || session.status === "exit") {
    return "finished";
  }
  return session.status;
}

function deriveBlocker(session: DevinSession, status: string) {
  if (session.structured_output?.blocker) return session.structured_output.blocker;
  if (status === "blocked" || status === "failed") {
    return session.status_detail || session.status;
  }
  return null;
}

function isTerminal(status: string) {
  return ["finished", "review_required", "failed", "blocked"].includes(status);
}

export async function handleGitHubIssueEvent(event: GitHubIssueEvent) {
  if (!isRemediationTrigger(event)) {
    return {
      accepted: false,
      reason: "Issue event did not match the devin-remediate trigger policy.",
    };
  }

  const authorization = authorizeGitHubIssueEvent(event);
  if (!authorization.authorized) {
    return {
      accepted: false,
      authorized: false,
      reason: authorization.reason,
    };
  }

  const { created, task } = createTask({
    repoFullName: event.repoFullName,
    repoUrl: event.repoUrl,
    issueNumber: event.issueNumber,
    issueTitle: event.issueTitle,
    issueBody: event.issueBody,
    issueUrl: event.issueUrl,
    rawEvent: event.raw,
  });

  if (!created) {
    return {
      accepted: false,
      duplicate: true,
      task,
      reason: "Task already exists for this repo and issue number.",
    };
  }

  await safeComment(task, acceptedComment(task));
  updateTask(task.id, { acceptedCommentPostedAt: nowIso(), status: "starting" });

  try {
    const prompt = buildDevinPrompt(event);
    const session = await createDevinSession({ event, prompt });
    const updatedTask = updateTask(task.id, {
      devinSessionId: session.session_id,
      devinSessionUrl: session.url,
      status: session.status,
      statusDetail: session.status_detail || null,
      structuredOutput: session.structured_output || null,
      acusConsumed: session.acus_consumed ?? null,
    })!;

    await safeComment(updatedTask, sessionCreatedComment(updatedTask));
    const finalTask = updateTask(updatedTask.id, {
      sessionCommentPostedAt: nowIso(),
    })!;

    return {
      accepted: true,
      duplicate: false,
      task: finalTask,
    };
  } catch (error) {
    const completedAt = nowIso();
    const failedTask = updateTask(task.id, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completedAt,
      durationSeconds: durationSeconds(task.startedAt, completedAt),
    })!;
    await safeComment(failedTask, finalComment(failedTask));
    updateTask(failedTask.id, { finalCommentPostedAt: nowIso() });

    return {
      accepted: true,
      duplicate: false,
      task: getTaskById(task.id),
      error: failedTask.error,
    };
  }
}

export async function simulateIssueEvent(payload?: unknown) {
  const event = parseGitHubIssuePayload(payload || samplePayload());
  return handleGitHubIssueEvent(event);
}

export async function pollActiveDevinSessions() {
  const activeTasks = listActiveTasks();
  const results = [];

  for (const task of activeTasks) {
    if (!task.devinSessionId) continue;

    try {
      const session = await getDevinSession(task.devinSessionId);
      const status = deriveStatus(session);
      const completedAt = isTerminal(status) ? nowIso() : task.completedAt;
      const updatedTask = updateTask(task.id, {
        status,
        statusDetail: session.status_detail || session.status,
        structuredOutput: session.structured_output || null,
        prUrl: firstPrUrl(session),
        blocker: deriveBlocker(session, status),
        completedAt,
        durationSeconds: completedAt
          ? durationSeconds(task.startedAt, completedAt)
          : task.durationSeconds,
        acusConsumed: structuredAcu(session),
      })!;

      if (isTerminal(status) && !updatedTask.finalCommentPostedAt) {
        await safeComment(updatedTask, finalComment(updatedTask));
        results.push(
          updateTask(updatedTask.id, { finalCommentPostedAt: nowIso() }),
        );
      } else {
        results.push(updatedTask);
      }
    } catch (error) {
      results.push(
        updateTask(task.id, {
          error: error instanceof Error ? error.message : String(error),
          statusDetail: "poll_failed",
        }),
      );
    }
  }

  return {
    polled: activeTasks.length,
    tasks: results.filter(Boolean),
  };
}
