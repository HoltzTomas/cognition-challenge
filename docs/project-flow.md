# Project Flow

## Architecture

```mermaid
flowchart LR
  reviewer["Reviewer / maintainer"] --> trigger["GitHub issue event or /api/simulate"]
  trigger --> intake["Webhook parser and authorization"]
  intake --> db["SQLite task store"]
  intake --> devin["Devin session client"]
  devin --> db
  poller["Docker poller / hosted poller"] --> status["/api/cron/poll-devin"]
  status --> devin
  status --> db
  db --> dashboard["Dashboard, /api/tasks, /api/metrics"]
  db --> comments["GitHub comments client"]
```

## Runtime Modes

```mermaid
flowchart TB
  simulation["Docker-only simulation"] --> samples["Signed sample GitHub issue webhooks"]
  samples --> hmac
  live["Live GitHub webhook"] --> hmac["HMAC verification"]
  hmac --> samePath
  samePath --> dryRun{"Dry run?"}
  dryRun -- true --> fake["Local Devin and GitHub dry-run outputs"]
  dryRun -- false --> real["Real Devin sessions and GitHub comments"]
  fake --> dashboard["Dashboard proof"]
  real --> dashboard
```

## Reproduction Paths

```mermaid
flowchart TB
  pathA["Path A: Docker-only simulation"] --> localSigned["Signed local webhooks"]
  pathB["Path B: Reviewer fork live run"] --> reviewerFork["Reviewer Superset fork"]
  pathC["Path C: Hosted live demo"] --> authorFork["Author Superset fork"]
  localSigned --> shared["Shared webhook and orchestration code"]
  reviewerFork --> shared
  authorFork --> shared
  shared --> sqlite["SQLite task state"]
  sqlite --> dashboard["Dashboard"]
```

## Task Lifecycle

```mermaid
stateDiagram-v2
  [*] --> accepted: authorized trigger
  [*] --> rejected: unauthorized trigger
  accepted --> session_created: Devin session created
  session_created --> working: Devin active
  working --> completed: PR or successful output
  working --> blocked: human input needed
  working --> failed: automation/API error
  completed --> [*]
  blocked --> [*]
  failed --> [*]
  rejected --> [*]
```

## Reproducibility Boundary

The solution repo is enough to reproduce the automation behavior locally with Docker. The Superset fork is evidence for the live engagement: selected issues, labels, PR links, and review flow. A reviewer who does not have write access to the author's fork can still run the Docker simulation end to end, then optionally point the same app at their own Superset fork by changing the GitHub environment variables and webhook URL. The hosted demo is intentionally scoped to the author's fork and should be treated as an observable live demo, not a multi-tenant reviewer sandbox.
