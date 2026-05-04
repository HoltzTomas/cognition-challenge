const intervalSeconds = Number(process.env.POLL_INTERVAL_SECONDS || "60");
const baseUrl = (process.env.POLL_BASE_URL || process.env.APP_BASE_URL || "").replace(
  /\/$/,
  "",
);
const cronSecret = process.env.CRON_SECRET;

if (!baseUrl || !cronSecret) {
  console.error("POLL_BASE_URL/APP_BASE_URL and CRON_SECRET are required.");
  process.exit(1);
}

async function pollOnce() {
  try {
    const response = await fetch(`${baseUrl}/api/cron/poll-devin`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
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
