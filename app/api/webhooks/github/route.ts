import { handleGitHubIssueEvent } from "@/lib/tasks";
import { parseGitHubWebhook, verifyGitHubWebhook } from "@/lib/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyGitHubWebhook(req.headers, rawBody);

    const event = parseGitHubWebhook(req.headers, rawBody);
    const result = await handleGitHubIssueEvent(event);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
