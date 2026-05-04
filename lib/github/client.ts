type CommentResult =
  | { skipped: true; reason: string }
  | { skipped: false; htmlUrl: string | null };

function shouldSkipGitHubWrites() {
  return process.env.GITHUB_DRY_RUN === "true" || !process.env.GITHUB_TOKEN;
}

export async function postIssueComment(
  repoFullName: string,
  issueNumber: number,
  body: string,
): Promise<CommentResult> {
  if (shouldSkipGitHubWrites()) {
    console.log(`[github dry-run] ${repoFullName}#${issueNumber}\n${body}`);
    return {
      skipped: true,
      reason: "GITHUB_DRY_RUN=true or GITHUB_TOKEN is missing.",
    };
  }

  const response = await fetch(
    `https://api.github.com/repos/${repoFullName}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ body }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub comments API ${response.status}: ${text}`);
  }

  const json = (await response.json()) as { html_url?: string };
  return { skipped: false, htmlUrl: json.html_url || null };
}
