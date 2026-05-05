import { simulateIssueEvent } from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.SIMULATION_ENABLED === "false") {
    return Response.json(
      { error: "Simulation endpoint is disabled for this deployment." },
      { status: 403 },
    );
  }

  try {
    const rawBody = await req.text();
    const payload = rawBody.trim() ? JSON.parse(rawBody) : undefined;
    const result = await simulateIssueEvent(payload);

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
