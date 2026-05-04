import { buildDevinPrompt, extractIssueSections } from "@/lib/prompt";
import type { GitHubIssueEvent } from "@/lib/types";

const event: GitHubIssueEvent = {
  action: "opened",
  actorLogin: "alice",
  issueAuthorAssociation: "OWNER",
  labelName: null,
  labels: ["devin-remediate"],
  repoFullName: "acme/superset",
  repoUrl: "https://github.com/acme/superset",
  issueNumber: 5,
  issueTitle: "Fix parseCookie",
  issueUrl: "https://github.com/acme/superset/issues/5",
  issueBody:
    "## Problem\nBad parsing.\n\n## Acceptance criteria\n- Preserve equals signs.\n\n## Suggested test command\n`yarn test parseCookie.test.ts`",
  raw: {},
};

describe("prompt", () => {
  test("extracts acceptance criteria and test command", () => {
    expect(extractIssueSections(event.issueBody)).toEqual({
      acceptanceCriteria: "- Preserve equals signs.",
      suggestedTestCommand: "`yarn test parseCookie.test.ts`",
    });
  });

  test("builds a bounded Devin prompt", () => {
    const prompt = buildDevinPrompt(event);

    expect(prompt).toContain("Repository URL: https://github.com/acme/superset");
    expect(prompt).toContain("Issue title: Fix parseCookie");
    expect(prompt).toContain("- Preserve equals signs.");
    expect(prompt).toContain("open a pull request against the fork repository");
    expect(prompt).toContain("provide structured output");
  });
});
