import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const pollBaseUrl = process.env.POLL_BASE_URL || `http://127.0.0.1:${port}`;

const children = new Set();
let shuttingDown = false;

function start(name, command, args, env = {}) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;

    shuttingDown = true;
    console.error(`${name} exited with ${signal || code}; stopping hosted runtime.`);
    for (const running of children) {
      running.kill("SIGTERM");
    }
    process.exit(typeof code === "number" ? code : 1);
  });

  return child;
}

function shutdown(signal) {
  if (shuttingDown) return;

  shuttingDown = true;
  for (const child of children) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start("next", "npm", ["start"]);
start("poller", "node", ["scripts/poll-devin.mjs"], {
  POLL_BASE_URL: pollBaseUrl,
});
