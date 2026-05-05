# Hosted Demo Setup

Use this guide to publish a public demo URL connected to the author's Superset fork. This is not a multi-tenant reviewer sandbox; it is a live, observable demo of the automation running against one configured fork.

Railway is the default target for this take-home because it can deploy from the repo's Dockerfile, provides trial credits, and supports persistent volumes. Render's free web services are not a good fit for this exact version because the filesystem is ephemeral and services spin down. Fly.io is a good technical fit, but it is not the fastest free/trial path for this demo.

References:

- [Railway free trial](https://docs.railway.com/pricing/free-trial)
- [Railway volumes](https://docs.railway.com/volumes)
- [Render free limitations](https://render.com/docs/free)
- [Fly cost management](https://fly.io/docs/about/cost-management/)

## 1. Create The Railway Service

1. Create a new Railway project.
2. Deploy from the GitHub repository that contains this solution.
3. Let Railway build from the root `Dockerfile`.
4. Set the service start command to:

```bash
npm run start:hosted
```

`start:hosted` starts the Next app and the Devin poller in one container. This matters because both processes must share the same mounted SQLite file.

## 2. Add Persistent Storage

1. Add a Railway volume to the service.
2. Mount it at:

```bash
/data
```

3. Set:

```bash
SQLITE_PATH=/data/tasks.db
```

The dashboard state, intake history, Devin session IDs, PR links, and metrics are stored in that SQLite file.

## 3. Configure Environment Variables

Use real values for the hosted demo:

```bash
DEVIN_API_KEY=cog_real_key
DEVIN_ORG_ID=org-real-org-id
DEVIN_MAX_ACU_LIMIT=5
DEVIN_DRY_RUN=false

GITHUB_TOKEN=github_pat_or_fine_grained_token
GITHUB_WEBHOOK_SECRET=replace-with-a-random-hex-secret
GITHUB_OWNER=HoltzTomas
GITHUB_REPO=superset
AUTHORIZED_GITHUB_LOGINS=HoltzTomas
GITHUB_DRY_RUN=false

APP_BASE_URL=https://your-railway-url.up.railway.app
CRON_SECRET=replace-with-a-random-cron-secret
SIMULATION_ENABLED=false
SQLITE_PATH=/data/tasks.db
```

Generate secrets locally if needed:

```bash
openssl rand -hex 32
```

Keep `SIMULATION_ENABLED=false` for the public demo so random visitors cannot create fake tasks through `/api/simulate`. Real GitHub webhooks continue to work through `/api/webhooks/github`.

## 4. Configure The Superset Fork Webhook

In the author's Superset fork:

1. Go to **Settings -> Webhooks -> Add webhook**.
2. Payload URL:

```bash
${APP_BASE_URL}/api/webhooks/github
```

3. Content type: `application/json`.
4. Secret: the exact value of `GITHUB_WEBHOOK_SECRET`.
5. Events: choose **Issues**.
6. Save the webhook.

The initial GitHub `ping` delivery should return `200`.

## 5. Trigger A Live Demo Task

1. Confirm the fork has the `devin-remediate` label.
2. Create or open one of the selected issues from the README.
3. Add the `devin-remediate` label as `HoltzTomas`.
4. Open the Railway app URL and watch the dashboard.

Expected live result:

- GitHub delivers an `issues.labeled` webhook.
- The automation accepts the event because the actor is allowlisted.
- A Devin session is created against the configured Superset fork.
- The issue receives status comments.
- The hosted poller updates the dashboard until the task is completed, blocked, or failed.

## 6. Safety Checks

Before sharing the URL:

```bash
curl -i -X POST "$APP_BASE_URL/api/simulate"
```

Expected: `403`.

```bash
curl -i -X POST "$APP_BASE_URL/api/cron/poll-devin"
```

Expected: `401`.

```bash
curl -i -X POST "$APP_BASE_URL/api/cron/poll-devin" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected: `200`.

## 7. Operational Notes

- Do not put reviewer forks into this hosted instance. Reviewers who want to run their own fork should use the local live setup guide.
- If the dashboard is empty after redeploy, check that the volume is mounted at `/data` and `SQLITE_PATH=/data/tasks.db`.
- If GitHub comments are missing, check `GITHUB_DRY_RUN=false` and the GitHub token's issue permissions.
- If Devin sessions are not created, check `DEVIN_DRY_RUN=false`, Devin credentials, and Devin repository access.
