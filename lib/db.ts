import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { normalizeTaskStatusDetail } from "@/lib/status-detail";
import type { IntakeDecision, Task, TaskStatus, StructuredOutput } from "@/lib/types";

type TaskRow = {
  id: number;
  task_key: string;
  repo_full_name: string;
  repo_url: string;
  issue_number: number;
  issue_title: string;
  issue_body: string | null;
  issue_url: string;
  trigger_actor: string | null;
  trigger_action: string | null;
  authorization_reason: string | null;
  intake_decision: string | null;
  suggested_test_command: string | null;
  devin_session_id: string | null;
  devin_session_url: string | null;
  status: string;
  status_detail: string | null;
  structured_output: string | null;
  pr_url: string | null;
  blocker: string | null;
  error: string | null;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  accepted_comment_posted_at: string | null;
  session_comment_posted_at: string | null;
  final_comment_posted_at: string | null;
};

type CreateTaskInput = {
  repoFullName: string;
  repoUrl: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  issueUrl: string;
  triggerActor?: string | null;
  triggerAction?: string | null;
  authorizationReason?: string | null;
  intakeDecision?: IntakeDecision;
  suggestedTestCommand?: string | null;
  rawEvent: unknown;
};

type TaskUpdate = Partial<
  Pick<
    Task,
    | "devinSessionId"
    | "devinSessionUrl"
    | "triggerActor"
    | "triggerAction"
    | "authorizationReason"
    | "intakeDecision"
    | "suggestedTestCommand"
    | "status"
    | "statusDetail"
    | "structuredOutput"
    | "prUrl"
    | "blocker"
    | "error"
    | "completedAt"
    | "durationSeconds"
    | "acceptedCommentPostedAt"
    | "sessionCommentPostedAt"
    | "finalCommentPostedAt"
    | "startedAt"
  >
>;

let db: Database.Database | null = null;

function getDbPath() {
  const configuredPath = process.env.SQLITE_PATH || "./data/tasks.db";
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(/* turbopackIgnore: true */ process.cwd(), configuredPath);
}

function initDb(database: Database.Database) {
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_key TEXT NOT NULL UNIQUE,
      repo_full_name TEXT NOT NULL,
      repo_url TEXT NOT NULL,
      issue_number INTEGER NOT NULL,
      issue_title TEXT NOT NULL,
      issue_body TEXT,
      issue_url TEXT NOT NULL,
      trigger_actor TEXT,
      trigger_action TEXT,
      authorization_reason TEXT,
      intake_decision TEXT NOT NULL DEFAULT 'accepted',
      suggested_test_command TEXT,
      devin_session_id TEXT,
      devin_session_url TEXT,
      status TEXT NOT NULL,
      status_detail TEXT,
      structured_output TEXT,
      pr_url TEXT,
      blocker TEXT,
      error TEXT,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      duration_seconds INTEGER,
      accepted_comment_posted_at TEXT,
      session_comment_posted_at TEXT,
      final_comment_posted_at TEXT,
      raw_event TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_devin_session_id ON tasks(devin_session_id);
  `);
  migrateDb(database);
}

function migrateDb(database: Database.Database) {
  const columns = new Set(
    (
      database.prepare("PRAGMA table_info(tasks)").all() as Array<{
        name: string;
      }>
    ).map(column => column.name),
  );

  const additions: Array<[string, string]> = [
    ["trigger_actor", "TEXT"],
    ["trigger_action", "TEXT"],
    ["authorization_reason", "TEXT"],
    ["intake_decision", "TEXT NOT NULL DEFAULT 'accepted'"],
    ["suggested_test_command", "TEXT"],
  ];

  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      database.exec(`ALTER TABLE tasks ADD COLUMN ${name} ${definition}`);
    }
  }
}

export function getDb() {
  if (db) return db;

  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  initDb(db);
  return db;
}

export function resetDbForTests() {
  db?.close();
  db = null;
}

function taskKey(repoFullName: string, issueNumber: number) {
  return `${repoFullName}#${issueNumber}`;
}

function parseStructuredOutput(value: string | null): StructuredOutput | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as StructuredOutput & { acu_consumed?: unknown };
    delete parsed.acu_consumed;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeStoredStatus(status: string): string {
  if (["new", "claimed", "running", "resuming"].includes(status)) {
    return "working";
  }
  if (status === "starting") return "accepted";
  if (["finished", "review_required", "exit"].includes(status)) return "completed";
  if (status === "suspended") return "blocked";
  if (status === "error") return "failed";
  return status;
}

function normalizeIntakeDecision(value: string | null): IntakeDecision {
  return value === "rejected" ? "rejected" : "accepted";
}

function toTask(row: TaskRow): Task {
  const status = normalizeStoredStatus(row.status);
  const structuredOutput = parseStructuredOutput(row.structured_output);

  return {
    id: row.id,
    taskKey: row.task_key,
    repoFullName: row.repo_full_name,
    repoUrl: row.repo_url,
    issueNumber: row.issue_number,
    issueTitle: row.issue_title,
    issueBody: row.issue_body || "",
    issueUrl: row.issue_url,
    triggerActor: row.trigger_actor,
    triggerAction: row.trigger_action,
    authorizationReason: row.authorization_reason,
    intakeDecision: normalizeIntakeDecision(row.intake_decision),
    suggestedTestCommand: row.suggested_test_command,
    devinSessionId: row.devin_session_id,
    devinSessionUrl: row.devin_session_url,
    status,
    statusDetail: normalizeTaskStatusDetail({
      status,
      statusDetail: row.status_detail,
      prUrl: row.pr_url,
      structuredOutput,
    }),
    structuredOutput,
    prUrl: row.pr_url,
    blocker: row.blocker,
    error: row.error,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    acceptedCommentPostedAt: row.accepted_comment_posted_at,
    sessionCommentPostedAt: row.session_comment_posted_at,
    finalCommentPostedAt: row.final_comment_posted_at,
  };
}

export function createTask(input: CreateTaskInput) {
  const key = taskKey(input.repoFullName, input.issueNumber);
  const intakeDecision = input.intakeDecision || "accepted";
  const status = intakeDecision === "rejected" ? "rejected" : "accepted";
  const existing = findTaskByIssue(input.repoFullName, input.issueNumber);
  if (existing) {
    if (existing.intakeDecision === "rejected" && intakeDecision === "accepted") {
      const promotedTask = updateTask(existing.id, {
        authorizationReason: input.authorizationReason ?? null,
        intakeDecision: "accepted",
        startedAt: new Date().toISOString(),
        status: "accepted",
        suggestedTestCommand: input.suggestedTestCommand ?? null,
        triggerAction: input.triggerAction ?? null,
        triggerActor: input.triggerActor ?? null,
      })!;

      return { created: false, promoted: true, task: promotedTask };
    }

    return { created: false, promoted: false, task: existing };
  }

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `
      INSERT INTO tasks (
        task_key,
        repo_full_name,
        repo_url,
        issue_number,
        issue_title,
        issue_body,
        issue_url,
        trigger_actor,
        trigger_action,
        authorization_reason,
        intake_decision,
        suggested_test_command,
        status,
        started_at,
        updated_at,
        raw_event
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      key,
      input.repoFullName,
      input.repoUrl,
      input.issueNumber,
      input.issueTitle,
      input.issueBody,
      input.issueUrl,
      input.triggerActor ?? null,
      input.triggerAction ?? null,
      input.authorizationReason ?? null,
      intakeDecision,
      input.suggestedTestCommand ?? null,
      status,
      now,
      now,
      JSON.stringify(input.rawEvent),
    );

  return {
    created: true,
    promoted: false,
    task: findTaskByIssue(input.repoFullName, input.issueNumber)!,
  };
}

export function findTaskByIssue(repoFullName: string, issueNumber: number) {
  const row = getDb()
    .prepare(
      "SELECT * FROM tasks WHERE repo_full_name = ? AND issue_number = ? LIMIT 1",
    )
    .get(repoFullName, issueNumber) as TaskRow | undefined;
  return row ? toTask(row) : null;
}

export function getTaskById(id: number) {
  const row = getDb()
    .prepare("SELECT * FROM tasks WHERE id = ? LIMIT 1")
    .get(id) as TaskRow | undefined;
  return row ? toTask(row) : null;
}

export function listTasks() {
  const rows = getDb()
    .prepare("SELECT * FROM tasks ORDER BY datetime(started_at) DESC")
    .all() as TaskRow[];
  return rows.map(toTask);
}

export function listActiveTasks() {
  const rows = getDb()
    .prepare(
      `
      SELECT * FROM tasks
      WHERE devin_session_id IS NOT NULL
        AND final_comment_posted_at IS NULL
        AND status NOT IN ('completed', 'finished', 'review_required', 'failed', 'blocked', 'error', 'suspended', 'exit', 'rejected')
      ORDER BY datetime(started_at) ASC
    `,
    )
    .all() as TaskRow[];
  return rows.map(toTask);
}

const updateColumns: Record<keyof TaskUpdate, string> = {
  devinSessionId: "devin_session_id",
  devinSessionUrl: "devin_session_url",
  triggerActor: "trigger_actor",
  triggerAction: "trigger_action",
  authorizationReason: "authorization_reason",
  intakeDecision: "intake_decision",
  suggestedTestCommand: "suggested_test_command",
  status: "status",
  statusDetail: "status_detail",
  structuredOutput: "structured_output",
  prUrl: "pr_url",
  blocker: "blocker",
  error: "error",
  completedAt: "completed_at",
  durationSeconds: "duration_seconds",
  acceptedCommentPostedAt: "accepted_comment_posted_at",
  sessionCommentPostedAt: "session_comment_posted_at",
  finalCommentPostedAt: "final_comment_posted_at",
  startedAt: "started_at",
};

function serializeUpdateValue(key: keyof TaskUpdate, value: unknown) {
  if (key === "structuredOutput" && value !== undefined) {
    return value ? JSON.stringify(value) : null;
  }
  return value ?? null;
}

export function updateTask(id: number, patch: TaskUpdate) {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined) as [
    keyof TaskUpdate,
    unknown,
  ][];
  if (entries.length === 0) return getTaskById(id);

  const assignments = entries.map(([key]) => `${updateColumns[key]} = ?`);
  const values = entries.map(([key, value]) => serializeUpdateValue(key, value));
  getDb()
    .prepare(
      `
      UPDATE tasks
      SET ${assignments.join(", ")}, updated_at = ?
      WHERE id = ?
    `,
    )
    .run(...values, new Date().toISOString(), id);

  return getTaskById(id);
}

export function isTerminalStatus(status: string) {
  return ["completed", "failed", "blocked", "rejected"].includes(
    normalizeStoredStatus(status),
  );
}

export function setTaskStatus(id: number, status: TaskStatus, detail?: string | null) {
  return updateTask(id, { status, statusDetail: detail ?? null });
}
