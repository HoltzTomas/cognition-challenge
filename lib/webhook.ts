import crypto from "node:crypto";
import { GitHubIssueEvent, REMEDIATION_LABEL } from "@/lib/types";

type GitHubLabel = string | { name?: string | null };

function getHeader(headers: Headers, name: string) {
  return headers.get(name) || headers.get(name.toLowerCase());
}

function signatureFor(rawBody: string, secret: string) {
  return `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")}`;
}

export async function verifyGitHubWebhook(headers: Headers, rawBody: string) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("GITHUB_WEBHOOK_SECRET is required for webhook verification.");
  }

  const provided = getHeader(headers, "x-hub-signature-256");
  if (!provided) {
    throw new Error("Missing X-Hub-Signature-256 header.");
  }

  const expected = signatureFor(rawBody, secret);
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid GitHub webhook signature.");
  }
}

function labelName(label: GitHubLabel) {
  return typeof label === "string" ? label : label.name || "";
}

function normalizeLabels(labels: GitHubLabel[] | undefined) {
  return (labels || []).map(labelName).filter(Boolean);
}

export function parseGitHubWebhook(headers: Headers, rawBody: string) {
  const githubEvent = getHeader(headers, "x-github-event");
  if (githubEvent !== "issues") {
    throw new Error(`Unsupported GitHub event: ${githubEvent || "missing"}.`);
  }

  return parseGitHubIssuePayload(JSON.parse(rawBody));
}

export function parseGitHubIssuePayload(payload: unknown): GitHubIssueEvent {
  const event = payload as {
    action?: string;
    label?: { name?: string | null };
    issue?: {
      author_association?: string | null;
      body?: string | null;
      html_url?: string;
      labels?: GitHubLabel[];
      number?: number;
      title?: string;
    };
    repository?: {
      full_name?: string;
      html_url?: string;
    };
    sender?: {
      login?: string | null;
    };
  };

  if (!event.issue || !event.repository) {
    throw new Error("Payload is missing issue or repository data.");
  }

  if (!event.action) {
    throw new Error("Payload is missing an issue action.");
  }

  const repoFullName = event.repository.full_name;
  const repoUrl = event.repository.html_url;
  const issueNumber = event.issue.number;
  const issueTitle = event.issue.title;
  const issueUrl = event.issue.html_url;

  if (!repoFullName || !repoUrl || !issueNumber || !issueTitle || !issueUrl) {
    throw new Error("Payload is missing required repository or issue fields.");
  }

  return {
    action: event.action,
    actorLogin: event.sender?.login || null,
    issueAuthorAssociation: event.issue.author_association || null,
    labelName: event.label?.name || null,
    labels: normalizeLabels(event.issue.labels),
    repoFullName,
    repoUrl,
    issueNumber,
    issueTitle,
    issueBody: event.issue.body || "",
    issueUrl,
    raw: payload,
  };
}

export function isRemediationTrigger(event: GitHubIssueEvent) {
  if (event.action === "opened") {
    return event.labels.includes(REMEDIATION_LABEL);
  }

  if (event.action === "labeled") {
    return event.labelName === REMEDIATION_LABEL;
  }

  return false;
}

function normalizeLogin(login: string) {
  return login.trim().toLowerCase();
}

function allowedLogins() {
  return new Set(
    (process.env.AUTHORIZED_GITHUB_LOGINS || "")
      .split(",")
      .map(normalizeLogin)
      .filter(Boolean),
  );
}

function configuredRepoFullName() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) return null;
  return `${owner}/${repo}`.toLowerCase();
}

function isTrustedAssociation(association: string | null) {
  return ["OWNER", "MEMBER", "COLLABORATOR"].includes(association || "");
}

export function authorizeGitHubIssueEvent(event: GitHubIssueEvent) {
  const expectedRepo = configuredRepoFullName();
  if (expectedRepo && event.repoFullName.toLowerCase() !== expectedRepo) {
    return {
      authorized: false,
      reason: `Repository ${event.repoFullName} is not configured for this automation.`,
    };
  }

  const actor = event.actorLogin ? normalizeLogin(event.actorLogin) : null;
  const explicitAllowlist = allowedLogins();
  if (actor && explicitAllowlist.has(actor)) {
    return {
      authorized: true,
      reason: `Actor ${event.actorLogin} is explicitly authorized.`,
    };
  }

  if (explicitAllowlist.size > 0) {
    return {
      authorized: false,
      reason: `Actor ${event.actorLogin || "unknown"} is not in AUTHORIZED_GITHUB_LOGINS.`,
    };
  }

  if (event.action === "labeled") {
    return {
      authorized: true,
      reason:
        "GitHub label events are accepted because applying labels requires repository permissions.",
    };
  }

  if (isTrustedAssociation(event.issueAuthorAssociation)) {
    return {
      authorized: true,
      reason: `Issue author association ${event.issueAuthorAssociation} is trusted.`,
    };
  }

  return {
    authorized: false,
    reason:
      "Issue author is not OWNER, MEMBER, or COLLABORATOR, and no authorized login matched.",
  };
}
