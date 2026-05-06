import { listTasks } from "@/lib/db";
import { refreshActiveDevinSessionsForDashboard } from "@/lib/dashboard-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await refreshActiveDevinSessionsForDashboard();

  return Response.json({
    tasks: listTasks(),
  });
}
