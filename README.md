# Superset Remediation Lane

A full-stack Next.js App Router demo for Cognition's take-home challenge. It adds a safe Devin-powered remediation lane for selected Apache Superset issues while maintainers continue working in GitHub with issues, labels, comments, PRs, and review.

## What It Demonstrates

- GitHub `issues` webhook ingestion with HMAC verification.
- Idempotent task creation keyed by `repo + issue_number`, including rejected intake records.
- Trigger actor, authorization decision, and suggested test command capture.
- Devin API v3 session creation and polling.
- SQLite-backed task state.
- GitHub issue comments for accepted, session-created, and final PR/blocker updates.
- Dashboard metrics and task lifecycle visibility for maintainers and engineering leads.

## Project Diagram

See [docs/project-flow.md](docs/project-flow.md) for architecture, lifecycle, and status diagrams.

## Environment Variables

Copy `.env.example` to `.env` and fill in real values for a live run.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEVIN_API_KEY` | Live run | Devin service user API key. |
| `DEVIN_ORG_ID` | Live run | Devin organization ID, for `/v3/organizations/{org_id}/sessions`. |
| `DEVIN_DRY_RUN` | Optional | Set `true` to simulate Devin create/poll calls locally. |
| `GITHUB_TOKEN` | Live comments | Token with permission to comment on fork issues. |
| `GITHUB_WEBHOOK_SECRET` | Webhook | Secret configured in the GitHub webhook. |
| `GITHUB_OWNER` | Reference | Owner of the Superset fork. |
| `GITHUB_REPO` | Reference | Superset fork repo name. |
| `AUTHORIZED_GITHUB_LOGINS` | Optional | Comma-separated GitHub usernames allowed to trigger Devin. If unset, signed label events are trusted because labels require repo permissions. |
| `GITHUB_DRY_RUN` | Optional | Set `true` to log comments instead of writing to GitHub. |
| `APP_BASE_URL` | Yes | Public base URL used in GitHub comments. |
| `CRON_SECRET` | Optional | Bearer token used by external pollers if you add auth around polling. The demo polling endpoint is open. |
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
- Unauthorized remediation triggers are recorded as rejected intake records on the dashboard, but they do not count as failed Devin tasks.
- If a previously rejected issue is later labeled by an authorized maintainer, the existing record is promoted instead of creating a duplicate Devin session.

## Task Statuses

The dashboard uses maintainer-facing statuses:

- `accepted`: trigger authorized and task persisted.
- `session_created`: Devin session created.
- `working`: Devin is active.
- `completed`: PR or successful outcome available.
- `blocked`: Devin needs human input or could not safely continue.
- `failed`: automation or API error.
- `rejected`: trigger was not authorized; excluded from throughput metrics.

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
curl -X POST http://localhost:3000/api/cron/poll-devin
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

- GitHub issue, repository, and issue number.
- Trigger actor, trigger action, authorization reason, and accepted/rejected decision.
- Current remediation status, normalized status detail, and whether human review is required.
- GitHub issue, Devin session, and PR links when available.
- Suggested test command, tests run, structured summary, and blocker/error details.
- A compact lifecycle per task: issue trigger, accepted/rejected, session created, status updated, PR/blocker/failure, and final comment.
- Aggregate accepted-task metrics: active, completed, blocked, failed, success rate, and average duration.

This makes the remediation lane legible to maintainers and engineering leads: every task is tied to a GitHub issue, every Devin session is tracked, every PR still goes through normal human review, and the dashboard exposes throughput, blockers, and reliability.

## API Routes

- `POST /api/webhooks/github`: verified GitHub issue webhook receiver.
- `POST /api/simulate`: local/demo trigger using a sample event or request JSON.
- `GET /api/tasks`: task state.
- `GET /api/metrics`: aggregate reporting.
- `POST /api/cron/poll-devin`: protected poller for active Devin sessions.

## Loom Demo Flow

1. Explain the safe remediation lane for selected Superset issues.
2. Show a Superset fork issue labeled `devin-remediate`.
3. Trigger the webhook or call `/api/simulate`.
4. Show concise GitHub comments and the Devin session URL.
5. Poll Devin and show the dashboard updating with PR, blocker, tests, and lifecycle state.
6. Close with real-customer extensions: scanner ingestion, Jira/Linear intake, approval gates, and richer org-level metrics.
