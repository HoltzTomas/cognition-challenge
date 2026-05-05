import crypto from "node:crypto";
import {
  authorizeGitHubIssueEvent,
  isRemediationTrigger,
  parseGitHubIssuePayload,
  parseGitHubWebhook,
  verifyGitHubWebhook,
} from "@/lib/webhook";
import { POST as postGitHubWebhook } from "@/app/api/webhooks/github/route";

const payload = {
  action: "labeled",
  repository: {
    full_name: "acme/superset",
    html_url: "https://github.com/acme/superset",
  },
  issue: {
    author_association: "OWNER",
    number: 7,
    title: "Fix a bounded issue",
    body: "Issue body",
    html_url: "https://github.com/acme/superset/issues/7",
    labels: [{ name: "devin-remediate" }],
  },
  label: { name: "devin-remediate" },
  sender: { login: "alice" },
};

function signedHeaders(rawBody: string, secret: string, event = "issues") {
  const signature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  return new Headers({
    "x-github-event": event,
    "x-hub-signature-256": signature,
  });
}

describe("webhook", () => {
  test("verifies a GitHub HMAC signature", async () => {
    process.env.GITHUB_WEBHOOK_SECRET = "secret";
    const rawBody = JSON.stringify(payload);

    await expect(
      verifyGitHubWebhook(signedHeaders(rawBody, "secret"), rawBody),
    ).resolves.toBeUndefined();

    await expect(
      verifyGitHubWebhook(signedHeaders(rawBody, "wrong"), rawBody),
    ).rejects.toThrow("Invalid GitHub webhook signature");
  });

  test("parses supported issue webhooks", () => {
    const rawBody = JSON.stringify(payload);
    const event = parseGitHubWebhook(signedHeaders(rawBody, "secret"), rawBody);

    expect(event.repoFullName).toBe("acme/superset");
    expect(event.issueNumber).toBe(7);
    expect(isRemediationTrigger(event)).toBe(true);
  });

  test("accepts signed GitHub ping deliveries", async () => {
    process.env.GITHUB_WEBHOOK_SECRET = "secret";
    const rawBody = JSON.stringify({ zen: "Keep it logically awesome." });
    const response = await postGitHubWebhook(
      new Request("http://localhost/api/webhooks/github", {
        method: "POST",
        headers: signedHeaders(rawBody, "secret", "ping"),
        body: rawBody,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, event: "ping" });
  });

  test("accepts opened issues only when the label is already present", () => {
    expect(
      isRemediationTrigger(
        parseGitHubIssuePayload({
          ...payload,
          action: "opened",
          label: undefined,
        }),
      ),
    ).toBe(true);

    expect(
      isRemediationTrigger(
        parseGitHubIssuePayload({
          ...payload,
          action: "opened",
          issue: { ...payload.issue, labels: [] },
          label: undefined,
        }),
      ),
    ).toBe(false);
  });

  test("authorizes configured repos and trusted labelers", () => {
    process.env.GITHUB_OWNER = "acme";
    process.env.GITHUB_REPO = "superset";
    delete process.env.AUTHORIZED_GITHUB_LOGINS;

    expect(authorizeGitHubIssueEvent(parseGitHubIssuePayload(payload))).toEqual({
      authorized: true,
      reason:
        "GitHub label events are accepted because applying labels requires repository permissions.",
    });

    expect(
      authorizeGitHubIssueEvent(
        parseGitHubIssuePayload({
          ...payload,
          repository: {
            full_name: "other/superset",
            html_url: "https://github.com/other/superset",
          },
        }),
      ).authorized,
    ).toBe(false);
  });

  test("respects an explicit authorized login allowlist", () => {
    process.env.GITHUB_OWNER = "acme";
    process.env.GITHUB_REPO = "superset";
    process.env.AUTHORIZED_GITHUB_LOGINS = "alice,bob";

    expect(authorizeGitHubIssueEvent(parseGitHubIssuePayload(payload)).authorized).toBe(
      true,
    );

    expect(
      authorizeGitHubIssueEvent(
        parseGitHubIssuePayload({
          ...payload,
          sender: { login: "mallory" },
        }),
      ).authorized,
    ).toBe(false);

    delete process.env.AUTHORIZED_GITHUB_LOGINS;
  });
});
