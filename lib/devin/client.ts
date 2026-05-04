import type { DevinSession, GitHubIssueEvent } from "@/lib/types";

const DEVIN_API_BASE_URL = "https://api.devin.ai";

export type CreateDevinSessionInput = {
  event: GitHubIssueEvent;
  prompt: string;
};

function isDryRun() {
  return (
    process.env.DEVIN_DRY_RUN === "true" ||
    !process.env.DEVIN_API_KEY ||
    !process.env.DEVIN_ORG_ID
  );
}

function structuredOutputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      status: {
        type: "string",
        enum: ["succeeded", "blocked", "failed"],
      },
      summary: { type: "string" },
      tests_run: {
        type: "array",
        items: { type: "string" },
      },
      pr_url: {
        type: "string",
      },
      blocker: {
        type: "string",
      },
    },
    required: ["status", "summary", "tests_run"],
  };
}

async function devinFetch(path: string, init?: RequestInit) {
  const apiKey = process.env.DEVIN_API_KEY;
  const orgId = process.env.DEVIN_ORG_ID;
  if (!apiKey || !orgId) {
    throw new Error("DEVIN_API_KEY and DEVIN_ORG_ID are required.");
  }

  const response = await fetch(`${DEVIN_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Devin API ${response.status}: ${body}`);
  }

  return response.json() as Promise<DevinSession>;
}

export async function createDevinSession({
  event,
  prompt,
}: CreateDevinSessionInput): Promise<DevinSession> {
  if (isDryRun()) {
    const id = `devin-dry-run-${event.repoFullName.replace(/\W+/g, "-")}-${
      event.issueNumber
    }`;
    return {
      pull_requests: [],
      session_id: id,
      status: "running",
      status_detail: "working",
      structured_output: null,
      title: `Remediate ${event.repoFullName}#${event.issueNumber}`,
      url: `https://app.devin.ai/sessions/${id}`,
    };
  }

  const orgId = process.env.DEVIN_ORG_ID!;
  return devinFetch(`/v3/organizations/${orgId}/sessions`, {
    method: "POST",
    body: JSON.stringify({
      prompt,
      repos: [event.repoUrl],
      session_links: [event.issueUrl],
      structured_output_required: true,
      structured_output_schema: structuredOutputSchema(),
      tags: ["devin-remediate", "cognition-challenge", "superset"],
      title: `Remediate ${event.repoFullName}#${event.issueNumber}`,
    }),
  });
}

export async function getDevinSession(devinSessionId: string) {
  if (isDryRun()) {
    return {
      pull_requests: [
        {
          pr_state: "open",
          pr_url: process.env.DRY_RUN_PR_URL || "https://github.com/example/superset/pull/1",
        },
      ],
      session_id: devinSessionId,
      status: "running",
      status_detail: process.env.DRY_RUN_STATUS_DETAIL || "finished",
      structured_output: {
        status: "succeeded",
        summary:
          "Dry-run session completed. Real Devin polling will replace this with session output.",
        tests_run: ["dry-run: no external Devin call made"],
        pr_url: process.env.DRY_RUN_PR_URL || "https://github.com/example/superset/pull/1",
      },
      url: `https://app.devin.ai/sessions/${devinSessionId}`,
    } satisfies DevinSession;
  }

  const orgId = process.env.DEVIN_ORG_ID!;
  return devinFetch(`/v3/organizations/${orgId}/sessions/${devinSessionId}`, {
    method: "GET",
  });
}
