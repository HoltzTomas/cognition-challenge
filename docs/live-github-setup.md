# Live GitHub Setup

Use this guide when you want to run the automation against your own Apache Superset fork with real GitHub webhooks and real Devin sessions.

The Docker-only simulation in the README is enough to reproduce the workflow locally. This live setup proves the same code path with external systems.

## 1. Prerequisites

- Docker and Docker Compose.
- A Devin API key and organization ID.
- A GitHub fork or copy of `https://github.com/apache/superset`.
- A GitHub token that can comment on issues in that fork.
- A public URL for the local Docker app, usually an ngrok tunnel for a take-home demo.

For the GitHub token, a fine-grained personal access token scoped to the Superset fork is enough. Grant:

- Metadata: read.
- Issues: read and write.

If your fork is private, also make sure Devin has access to the repository through your Devin/GitHub integration.

## 2. Prepare The Superset Fork

1. Fork or copy `https://github.com/apache/superset`.
2. Confirm issues are enabled in the fork.
3. Create the label `devin-remediate`.
4. Create one or both selected issues from the README.
5. Do not rely on issue authors triggering automation. Add the `devin-remediate` label as an authorized maintainer so GitHub emits a trusted `issues.labeled` event.

## 3. Configure The App

Copy `.env.example` to `.env`, then replace the demo values:

```bash
DEVIN_API_KEY=cog_real_key
DEVIN_ORG_ID=org-real-org-id
DEVIN_MAX_ACU_LIMIT=5
DEVIN_DRY_RUN=false

GITHUB_TOKEN=github_pat_or_fine_grained_token
GITHUB_WEBHOOK_SECRET=replace-with-a-random-hex-secret
GITHUB_OWNER=your-github-user-or-org
GITHUB_REPO=your-superset-fork-name
AUTHORIZED_GITHUB_LOGINS=your-github-login
GITHUB_DRY_RUN=false

APP_BASE_URL=https://your-public-url.example.com
ALLOWED_DEV_ORIGINS=
CRON_SECRET=replace-with-a-random-cron-secret
SIMULATION_ENABLED=true
SQLITE_PATH=./data/tasks.db
```

Generate secrets locally if needed:

```bash
openssl rand -hex 32
```

If you run `npm run dev` behind ngrok instead of Docker production mode, set:

```bash
ALLOWED_DEV_ORIGINS=your-ngrok-domain.ngrok-free.app
```

Docker Compose runs `next start`, so `ALLOWED_DEV_ORIGINS` is normally not needed.

## 4. Start Docker

```bash
rm -f data/tasks.db
docker compose up --build
```

The app listens on `http://localhost:3000`, and the poller container calls `/api/cron/poll-devin` every 10 seconds. If `CRON_SECRET` is set, the poller sends it as a bearer token automatically.

## 5. Expose The Local App

In another terminal:

```bash
ngrok http 3000
```

Set `APP_BASE_URL` in `.env` to the HTTPS forwarding URL, then restart Compose if the URL changed:

```bash
docker compose down
docker compose up --build
```

For a real deployment, keep the Docker shape but run it on a host with persistent storage, such as Fly.io, Render, Railway, ECS, or a VPS. Either mount a persistent volume for SQLite or replace SQLite with Postgres/Turso. Vercel is not a natural fit for this version because the app uses a local SQLite file and a long-running poller process.

For the recommended hosted demo setup, see [hosted-demo.md](hosted-demo.md).

## 6. Configure GitHub Webhook

In your Superset fork:

1. Go to **Settings -> Webhooks -> Add webhook**.
2. Payload URL: `${APP_BASE_URL}/api/webhooks/github`.
3. Content type: `application/json`.
4. Secret: the exact value of `GITHUB_WEBHOOK_SECRET`.
5. Events: choose **Issues**.
6. Save the webhook.

Use GitHub's **Recent Deliveries** tab to confirm that the initial `ping` delivery returns `200`.

## 7. Trigger The Workflow

1. Open or create one of the selected issues in the fork.
2. Add the `devin-remediate` label using the authorized GitHub account from `AUTHORIZED_GITHUB_LOGINS`.
3. Watch the Docker logs for accepted intake, GitHub dry/live comment status, Devin session creation, and poller updates.
4. Open `${APP_BASE_URL}` or `http://localhost:3000` to view the dashboard.

Expected live result:

- The issue event is accepted.
- A Devin session is created with the Superset fork URL.
- The issue receives status comments.
- The dashboard shows the task moving through `accepted`, `session_created`, `working`, and then `completed`, `blocked`, or `failed`.
- If Devin can complete the issue, the task records a PR URL for human review.

## 8. Troubleshooting

- `Invalid GitHub webhook signature`: the GitHub webhook secret and `.env` value do not match, or the app was not restarted after changing `.env`.
- `Repository ... is not configured`: `GITHUB_OWNER/GITHUB_REPO` do not match the fork that emitted the webhook.
- `Actor ... is not in AUTHORIZED_GITHUB_LOGINS`: add the GitHub user who applies the label, or clear the allowlist and rely on label permissions.
- No GitHub comments: confirm `GITHUB_DRY_RUN=false` and the token has Issues read/write permission.
- No Devin session: confirm `DEVIN_DRY_RUN=false`, `DEVIN_API_KEY`, `DEVIN_ORG_ID`, and that Devin can access the fork.
- Manual poll returns `401`: include `Authorization: Bearer <CRON_SECRET>` or clear `CRON_SECRET` in local-only experiments.
- Dashboard is empty after restart: confirm `./data` is mounted and `SQLITE_PATH=./data/tasks.db`.
