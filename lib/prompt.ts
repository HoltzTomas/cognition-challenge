import type { GitHubIssueEvent } from "@/lib/types";

type ExtractedIssueSections = {
  acceptanceCriteria: string;
  suggestedTestCommand: string;
};

function extractSection(body: string, heading: RegExp) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex(line => heading.test(line.trim()));
  if (start === -1) return "";

  const section: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s+\S/.test(line) || /^[A-Z][A-Za-z ]+:\s*$/.test(line.trim())) {
      break;
    }
    section.push(line);
  }
  return section.join("\n").trim();
}

export function extractIssueSections(body: string): ExtractedIssueSections {
  const acceptanceCriteria =
    extractSection(body, /^(#+\s*)?acceptance criteria:?$/i) ||
    extractSection(body, /^(#+\s*)?acceptance:?$/i);

  const suggestedTestCommand =
    extractSection(body, /^(#+\s*)?suggested test command:?$/i) ||
    extractSection(body, /^(#+\s*)?test command:?$/i) ||
    extractSection(body, /^(#+\s*)?suggested test:?$/i);

  return {
    acceptanceCriteria: acceptanceCriteria || "Use the acceptance criteria in the issue body.",
    suggestedTestCommand:
      suggestedTestCommand || "Run the most focused test command for the touched code.",
  };
}

export function buildDevinPrompt(event: GitHubIssueEvent) {
  const { acceptanceCriteria, suggestedTestCommand } = extractIssueSections(
    event.issueBody,
  );

  return [
    "You are remediating a tightly scoped Apache Superset maintenance issue from a customer-facing automation demo.",
    "",
    "Goal:",
    "Fix exactly the GitHub issue linked below, keep the change minimal, update or add focused tests, and open a pull request against the fork repository.",
    "",
    `Repository URL: ${event.repoUrl}`,
    `Issue title: ${event.issueTitle}`,
    `Issue URL: ${event.issueUrl}`,
    "",
    "Issue body:",
    event.issueBody || "(No issue body provided.)",
    "",
    "Acceptance criteria:",
    acceptanceCriteria,
    "",
    "Suggested test command:",
    suggestedTestCommand,
    "",
    "Guardrails:",
    "- Work only on the linked issue; do not perform broad refactors or dependency upgrades.",
    "- Prefer the smallest production change that satisfies the tests.",
    "- Update the focused test file named in the issue when appropriate.",
    "- Run the suggested test command and mention the result in the PR.",
    "- Open a PR against the fork repository, not upstream Apache Superset.",
    "- If blocked by permissions, environment setup, or an ambiguous requirement, stop and report the blocker clearly.",
    "",
    "Before ending, provide structured output with:",
    "- status: succeeded, blocked, or failed",
    "- summary: concise explanation of the change or blocker",
    "- tests_run: list of commands run",
    "- pr_url: PR URL if opened",
    "- blocker: blocker text if not completed",
  ].join("\n");
}
