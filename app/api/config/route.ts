export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
    simulationEnabled: process.env.SIMULATION_ENABLED !== "false",
  });
}
