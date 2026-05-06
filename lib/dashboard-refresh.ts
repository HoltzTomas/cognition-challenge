import { listActiveTasks } from "@/lib/db";
import { pollActiveDevinSessions } from "@/lib/tasks";

let inFlightRefresh: Promise<void> | null = null;
let lastRefreshAt = 0;

function refreshEnabled() {
  return process.env.DASHBOARD_DEVIN_REFRESH !== "false";
}

function refreshIntervalMs() {
  const value = Number(process.env.DASHBOARD_DEVIN_REFRESH_INTERVAL_MS || "10000");
  return Number.isFinite(value) && value >= 0 ? value : 10000;
}

export async function refreshActiveDevinSessionsForDashboard() {
  if (!refreshEnabled()) return;
  if (listActiveTasks().length === 0) return;

  if (inFlightRefresh) {
    await inFlightRefresh;
    return;
  }

  const now = Date.now();
  if (now - lastRefreshAt < refreshIntervalMs()) return;

  inFlightRefresh = pollActiveDevinSessions()
    .then(() => {
      lastRefreshAt = Date.now();
    })
    .catch(error => {
      console.error("Dashboard Devin refresh failed", error);
    })
    .finally(() => {
      inFlightRefresh = null;
    });

  await inFlightRefresh;
}
