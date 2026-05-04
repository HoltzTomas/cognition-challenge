import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Task, TaskStatus, StructuredOutput } from "@/lib/types";

type TaskRow = {
  id: number;
  task_key: string;
  repo_full_name: string;
  repo_url: string;
  issue_number: number;
  issue_title: string;
  issue_body: string | null;
  issue_url: string;
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
  acus_consumed: number | null;
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
  rawEvent: unknown;
};

type TaskUpdate = Partial<
  Pick<
    Task,
    | "devinSessionId"
    | "devinSessionUrl"
    | "status"
    | "statusDetail"
    | "structuredOutput"
    | "prUrl"
    | "blocker"
    | "error"
    | "completedAt"
    | "durationSeconds"
    | "acusConsumed"
    | "acceptedCommentPostedAt"
    | "sessionCommentPostedAt"
    | "finalCommentPostedAt"
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
      acus_consumed REAL,
      accepted_comment_posted_at TEXT,
      session_comment_posted_at TEXT,
      final_comment_posted_at TEXT,
      raw_event TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_devin_session_id ON tasks(devin_session_id);
  `);
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
    return JSON.parse(value) as StructuredOutput;
  } catch {
    return null;
  }
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    taskKey: row.task_key,
    repoFullName: row.repo_full_name,
    repoUrl: row.repo_url,
    issueNumber: row.issue_number,
    issueTitle: row.issue_title,
    issueBody: row.issue_body || "",
    issueUrl: row.issue_url,
    devinSessionId: row.devin_session_id,
    devinSessionUrl: row.devin_session_url,
    status: row.status,
    statusDetail: row.status_detail,
    structuredOutput: parseStructuredOutput(row.structured_output),
    prUrl: row.pr_url,
    blocker: row.blocker,
    error: row.error,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    acusConsumed: row.acus_consumed,
    acceptedCommentPostedAt: row.accepted_comment_posted_at,
    sessionCommentPostedAt: row.session_comment_posted_at,
    finalCommentPostedAt: row.final_comment_posted_at,
  };
}

export function createTask(input: CreateTaskInput) {
  const key = taskKey(input.repoFullName, input.issueNumber);
  const existing = findTaskByIssue(input.repoFullName, input.issueNumber);
  if (existing) return { created: false, task: existing };

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
        status,
        started_at,
        updated_at,
        raw_event
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      "accepted",
      now,
      now,
      JSON.stringify(input.rawEvent),
    );

  return {
    created: true,
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
        AND status NOT IN ('finished', 'review_required', 'failed', 'blocked', 'error', 'suspended', 'exit')
      ORDER BY datetime(started_at) ASC
    `,
    )
    .all() as TaskRow[];
  return rows.map(toTask);
}

const updateColumns: Record<keyof TaskUpdate, string> = {
  devinSessionId: "devin_session_id",
  devinSessionUrl: "devin_session_url",
  status: "status",
  statusDetail: "status_detail",
  structuredOutput: "structured_output",
  prUrl: "pr_url",
  blocker: "blocker",
  error: "error",
  completedAt: "completed_at",
  durationSeconds: "duration_seconds",
  acusConsumed: "acus_consumed",
  acceptedCommentPostedAt: "accepted_comment_posted_at",
  sessionCommentPostedAt: "session_comment_posted_at",
  finalCommentPostedAt: "final_comment_posted_at",
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
  return [
    "finished",
    "review_required",
    "failed",
    "blocked",
    "error",
    "suspended",
    "exit",
  ].includes(status);
}

export function setTaskStatus(id: number, status: TaskStatus, detail?: string | null) {
  return updateTask(id, { status, statusDetail: detail ?? null });
}
