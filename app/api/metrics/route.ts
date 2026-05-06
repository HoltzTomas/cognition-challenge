import { getMetrics } from "@/lib/metrics";
import { refreshActiveDevinSessionsForDashboard } from "@/lib/dashboard-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await refreshActiveDevinSessionsForDashboard();

  return Response.json(getMetrics());
}
