const intervalSeconds = Number(process.env.POLL_INTERVAL_SECONDS || "10");
const baseUrl = (process.env.POLL_BASE_URL || process.env.APP_BASE_URL || "").replace(
  /\/$/,
  "",
);
const cronSecret = process.env.CRON_SECRET;

if (!baseUrl) {
  console.error("POLL_BASE_URL/APP_BASE_URL is required.");
  process.exit(1);
}

async function pollOnce() {
  try {
    const response = await fetch(`${baseUrl}/api/cron/poll-devin`, {
      method: "POST",
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : undefined,
    });
    const body = await response.text();
    console.log(
      `[${new Date().toISOString()}] poll-devin ${response.status}: ${body}`,
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] poll-devin failed`, error);
  }
}

await new Promise(resolve => setTimeout(resolve, 5000));
await pollOnce();
setInterval(pollOnce, intervalSeconds * 1000);
