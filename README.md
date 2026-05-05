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

## Choose Your Path

| Path | Best For | What You Need | What It Proves |
| --- | --- | --- | --- |
| **A. Run the simulation locally** | Fast reviewer reproduction | Docker only | Signed GitHub webhook intake, HMAC verification, task state, dry-run Devin sessions, polling, metrics, and dashboard. |
| **B. Run live against your own Superset fork** | Full external-system reproduction | Docker, Devin credentials, GitHub token, Superset fork, and ngrok/public URL | Real GitHub webhooks, real Devin sessions, issue comments, and PR/blocker status on the reviewer's fork. |
| **C. View the hosted live demo** | Quick inspection without setup | A provided public demo URL | The same automation running against the author's Superset fork with live credentials and persistent hosted state. |

This repo is the solution repository. The Apache Superset fork is the evidence repository for selected issues, labels, comments, Devin sessions, and PRs. Reviewers do not need write access to the author's fork to run Path A or Path B.

## Docs

- [Project flow](docs/project-flow.md): architecture, runtime modes, lifecycle, and reproducibility boundary.
- [Live GitHub setup](docs/live-github-setup.md): configure your own Superset fork, GitHub webhook, ngrok/public URL, Devin credentials, and Docker runtime.
- [Hosted demo setup](docs/hosted-demo.md): deploy the demo to Railway with Docker, persistent SQLite, and a single-container hosted runtime.

## Path A: Docker-Only Simulation

```bash
cp .env.example .env
rm -f data/tasks.db data/tasks.db-shm data/tasks.db-wal
docker compose up --build
```

In a second terminal:

```bash
docker compose exec app npm run simulate:workflow
```

Open [http://localhost:3000](http://localhost:3000).

Expected result:

- Two signed Superset issue webhooks are accepted from `your-org/superset`.
- Two dry-run Devin sessions are created.
- Polling completes them with fake PR URLs.
- The dashboard shows completed tasks, lifecycle events, authorization reasons, suggested tests, and success metrics.

The main simulation command sends signed `issues` webhook payloads to `/api/webhooks/github`. This validates the same HMAC-protected endpoint that GitHub uses in live mode.

## Path B: Live Local Run Against Your Own Fork

Use this path when you want to prove the same system against a real GitHub fork and live Devin sessions.

1. Fork or copy `https://github.com/apache/superset`.
2. Copy `.env.example` to `.env`.
3. Set `GITHUB_OWNER`, `GITHUB_REPO`, `AUTHORIZED_GITHUB_LOGINS`, `DEVIN_API_KEY`, `DEVIN_ORG_ID`, `GITHUB_TOKEN`, `DEVIN_DRY_RUN=false`, and `GITHUB_DRY_RUN=false`.
4. Start Docker:

```bash
docker compose up --build
```

5. Expose the local app:

```bash
ngrok http 3000
```

6. Set `APP_BASE_URL` to the HTTPS ngrok URL and restart Compose.
7. In your Superset fork, create the `devin-remediate` label.
8. Configure a GitHub webhook:
   - Payload URL: `${APP_BASE_URL}/api/webhooks/github`
   - Content type: `application/json`
   - Secret: same value as `GITHUB_WEBHOOK_SECRET`
   - Events: **Issues**
9. Add `devin-remediate` to one of the selected issues.

See [docs/live-github-setup.md](docs/live-github-setup.md) for the full checklist and troubleshooting.

## Path C: Hosted Live Demo

The hosted demo is intentionally not multi-tenant. It is a public, observable instance connected to the author's Superset fork and credentials so reviewers can inspect the live system without configuring their own fork.

If a hosted URL is provided with the submission, open it directly and inspect:

- Current task queue and status history.
- Devin session and PR/blocker links.
- Authorization decisions and trigger actors.
- Aggregate success/blocked/failed metrics.

For deployment instructions, see [docs/hosted-demo.md](docs/hosted-demo.md). The hosted mode uses `npm run start:hosted`, runs the Next app and poller in one container, stores SQLite on a persistent volume, protects the poller endpoint with `CRON_SECRET`, and disables `/api/simulate` with `SIMULATION_ENABLED=false`.

## Environment Variables

Copy `.env.example` to `.env`. The checked-in defaults are safe for Path A and match the sample events.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEVIN_API_KEY` | Live/hosted run | Devin service user API key. |
| `DEVIN_ORG_ID` | Live/hosted run | Devin organization ID for `/v3/organizations/{org_id}/sessions`. |
| `DEVIN_MAX_ACU_LIMIT` | Optional | Max ACU limit sent to Devin. |
| `DEVIN_DRY_RUN` | Optional | Set `true` to simulate Devin create/poll calls locally. |
| `GITHUB_TOKEN` | Live/hosted comments | Token with permission to comment on fork issues. |
| `GITHUB_WEBHOOK_SECRET` | Webhook | Secret configured in the GitHub webhook and used by signed local simulation. |
| `GITHUB_OWNER` | Auth | Owner of the Superset fork. Defaults to `your-org` for sample events. |
| `GITHUB_REPO` | Auth | Superset fork repo name. Defaults to `superset` for sample events. |
| `AUTHORIZED_GITHUB_LOGINS` | Optional | Comma-separated GitHub usernames allowed to trigger Devin. |
| `GITHUB_DRY_RUN` | Optional | Set `true` to log comments instead of writing to GitHub. |
| `APP_BASE_URL` | Comments/demo | Base URL used in GitHub comments and simulation output. |
| `ALLOWED_DEV_ORIGINS` | Optional | Comma-separated ngrok/public dev origins for `npm run dev`; not needed for Docker production mode. |
| `CRON_SECRET` | Optional | If set, `/api/cron/poll-devin` requires `Authorization: Bearer <CRON_SECRET>`. |
| `SIMULATION_ENABLED` | Optional | Defaults to enabled. Set `false` in hosted deployments to block `/api/simulate`. |
| `SQLITE_PATH` | Optional | Defaults to `./data/tasks.db`; use `/data/tasks.db` for Railway volume hosting. |

## Runtime Commands

```bash
npm install
npm run dev
```

Runs the app locally without Docker.

```bash
docker compose up --build
```

Runs the local Docker setup with two containers:

- `app`: Next app and API at `http://localhost:3000`.
- `poller`: calls `POST /api/cron/poll-devin` every 10 seconds.

```bash
npm run start:hosted
```

Runs the hosted single-container mode: Next app plus poller in the same container so both share the same persistent SQLite volume.

## Direct Development Helper

`/api/simulate` is kept as a lightweight local helper. It skips GitHub HMAC verification, but uses the same parsed issue orchestration path after that point.

```bash
curl -X POST http://localhost:3000/api/simulate
```

If `CRON_SECRET` is set and you want to poll manually:

```bash
curl -X POST http://localhost:3000/api/cron/poll-devin \
  -H "Authorization: Bearer $CRON_SECRET"
```

Use `npm run simulate:workflow` for the stronger simulation path because it signs payloads and includes the poller bearer token automatically.

## Authorization Model

The automation does not let any public issue author spend Devin capacity.

- GitHub webhook requests must pass `X-Hub-Signature-256` verification.
- Events must come from the configured `GITHUB_OWNER/GITHUB_REPO` fork.
- The event must be an `issues` event that opens or labels an issue with `devin-remediate`.
- If `AUTHORIZED_GITHUB_LOGINS` is set, the GitHub event sender must be in that allowlist.
- If `AUTHORIZED_GITHUB_LOGINS` is unset, `labeled` events are accepted because labels require repository permissions.
- `opened` events with the label already present are accepted only from trusted GitHub author associations: `OWNER`, `MEMBER`, or `COLLABORATOR`.
- Unauthorized remediation triggers are recorded as rejected intake records on the dashboard, but they do not count as failed Devin tasks.
- If a previously rejected issue is later labeled by an authorized maintainer, the existing record is promoted instead of creating a duplicate Devin session.

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

## API Routes

- `POST /api/webhooks/github`: verified GitHub issue webhook receiver. Also accepts signed GitHub `ping` events.
- `POST /api/simulate`: local demo helper; disabled when `SIMULATION_ENABLED=false`.
- `GET /api/tasks`: task state.
- `GET /api/metrics`: aggregate reporting.
- `POST /api/cron/poll-devin`: poller endpoint for active Devin sessions; protected when `CRON_SECRET` is set.

## Loom Demo Flow

1. Explain the three reproduction paths.
2. Show the Docker-only simulation for reviewer reproducibility.
3. Show a Superset fork issue labeled `devin-remediate`.
4. Show concise GitHub comments, Devin session URL, and PR/blocker result.
5. Show the dashboard updating with metrics, lifecycle state, and review handoff.
6. Close with real-customer extensions: scanner ingestion, Jira/Linear intake, approval gates, and richer org-level metrics.
