# Devin Remediation Queue

A full-stack Next.js App Router demo for Cognition's take-home challenge. It turns a GitHub issue labeled `devin-remediate` into a tracked Devin remediation session, comments progress back to GitHub, and shows operational status on a lightweight dashboard.

## What It Demonstrates

- GitHub `issues` webhook ingestion with HMAC verification.
- Idempotent task creation keyed by `repo + issue_number`.
- Devin API v3 session creation and polling.
- SQLite-backed task state.
- GitHub issue comments for accepted, session-created, and final PR/blocker updates.
- Dashboard metrics that answer: "How do I know this is working?"

## Environment Variables

Copy `.env.example` to `.env` and fill in real values for a live run.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEVIN_API_KEY` | Live run | Devin service user API key. |
| `DEVIN_ORG_ID` | Live run | Devin organization ID, for `/v3/organizations/{org_id}/sessions`. |
| `DEVIN_MAX_ACU_LIMIT` | Optional | ACU cap for each remediation session. Defaults to `5`. |
| `DEVIN_DRY_RUN` | Optional | Set `true` to simulate Devin create/poll calls locally. |
| `GITHUB_TOKEN` | Live comments | Token with permission to comment on fork issues. |
| `GITHUB_WEBHOOK_SECRET` | Webhook | Secret configured in the GitHub webhook. |
| `GITHUB_OWNER` | Reference | Owner of the Superset fork. |
| `GITHUB_REPO` | Reference | Superset fork repo name. |
| `AUTHORIZED_GITHUB_LOGINS` | Optional | Comma-separated GitHub usernames allowed to trigger Devin. If unset, signed label events are trusted because labels require repo permissions. |
| `GITHUB_DRY_RUN` | Optional | Set `true` to log comments instead of writing to GitHub. |
| `APP_BASE_URL` | Yes | Public base URL used in GitHub comments. |
| `CRON_SECRET` | Yes | Bearer token or query secret for polling. |
| `SQLITE_PATH` | Optional | Defaults to `./data/tasks.db`. |

For a local no-credential demo, keep `DEVIN_DRY_RUN=true` and `GITHUB_DRY_RUN=true`.

## Authorization Model

The automation does not let any public issue author spend Devin capacity.

- GitHub webhook requests must pass `X-Hub-Signature-256` verification.
- Events must come from the configured `GITHUB_OWNER/GITHUB_REPO` fork.
- The event must be an `issues` event that opens or labels an issue with `devin-remediate`.
- If `AUTHORIZED_GITHUB_LOGINS` is set, the GitHub event sender must be in that allowlist.
- If `AUTHORIZED_GITHUB_LOGINS` is unset, `labeled` events are accepted because GitHub only lets users with repository permissions apply labels.
- `opened` events with the label already present are accepted only from trusted GitHub author associations: `OWNER`, `MEMBER`, or `COLLABORATOR`.

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run With Docker

```bash
cp .env.example .env
docker compose up --build
```

The SQLite database is stored under `./data/tasks.db` via the compose volume.

## Simulate An Issue Event

The app ships with `sample-events/parse-cookie-opened.json`. Calling `/api/simulate` with no body uses that sample and reuses the same orchestration path as the real webhook.

```bash
curl -X POST http://localhost:3000/api/simulate
```

To simulate the second issue:

```bash
curl -X POST http://localhost:3000/api/simulate \
  -H "Content-Type: application/json" \
  --data @sample-events/get-owner-name-labeled.json
```

Then poll Devin:

```bash
curl -X POST http://localhost:3000/api/cron/poll-devin \
  -H "Authorization: Bearer replace-with-a-random-cron-secret"
```

In dry-run mode, polling immediately completes with a fake PR URL so the dashboard can show the full lifecycle.

## Configure The GitHub Webhook

1. Fork or copy `https://github.com/apache/superset` into your GitHub account or organization.
2. Create the label `devin-remediate`.
3. In the fork, go to **Settings → Webhooks → Add webhook**.
4. Payload URL: `${APP_BASE_URL}/api/webhooks/github`.
5. Content type: `application/json`.
6. Secret: the same value as `GITHUB_WEBHOOK_SECRET`.
7. Events: choose **Issues**.
8. Create or label an issue with `devin-remediate`.

For local webhook delivery, use a tunnel such as ngrok and set `APP_BASE_URL` to the public tunnel URL.

## Selected Superset Issues

These are intentionally deterministic and bounded for a 2-3 hour take-home:

### 1. `parseCookie` compact cookie parsing

Target: `superset-frontend/src/utils/parseCookie.ts`

Problem: compact cookies like `a=1;b=2` and values like `token=a=b=c` are mishandled because the utility splits on `"; "` and then splits every `"="`.

Suggested test:

```bash
cd superset-frontend && yarn test src/utils/parseCookie.test.ts
```

### 2. `getOwnerName` partial owner records

Target: `superset-frontend/src/utils/getOwnerName.ts`

Problem: optional owner fields can render strings like `Ada undefined` or `undefined Lovelace`.

Suggested test:

```bash
cd superset-frontend && yarn test src/utils/getOwnerName.test.ts
```

Each issue body should include the problem, target file, acceptance criteria, suggested test command, and an instruction to open a PR against the fork.

## Dashboard Proof

The dashboard at `/` shows:

- issue title and URL
- Devin session URL
- current status and status detail
- PR URL when available
- blocker/error when available
- start time and duration
- ACUs consumed when available
- aggregate active/completed/blocked/failed metrics

This makes the automation legible to a VP of Engineering: they can see throughput, completion, failure modes, cost signals, and the concrete PR outcome.

## API Routes

- `POST /api/webhooks/github`: verified GitHub issue webhook receiver.
- `POST /api/simulate`: local/demo trigger using a sample event or request JSON.
- `GET /api/tasks`: task state.
- `GET /api/metrics`: aggregate reporting.
- `POST /api/cron/poll-devin`: protected poller for active Devin sessions.

## Loom Demo Flow

1. Explain the maintenance-remediation queue problem.
2. Show a Superset fork issue labeled `devin-remediate`.
3. Trigger the webhook or call `/api/simulate`.
4. Show GitHub comments and the Devin session URL.
5. Poll Devin and show the dashboard updating with PR or blocker state.
6. Close with real-customer extensions: scanner ingestion, Jira/Linear intake, approval gates, and richer org-level metrics.
