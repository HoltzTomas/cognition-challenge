export const REMEDIATION_LABEL = "devin-remediate";

export type TaskStatus =
  | "accepted"
  | "starting"
  | "new"
  | "claimed"
  | "running"
  | "resuming"
  | "finished"
  | "review_required"
  | "blocked"
  | "failed"
  | "error"
  | "suspended"
  | "exit";

export type StructuredOutput = {
  status?: string;
  summary?: string;
  tests_run?: string[];
  pr_url?: string;
  blocker?: string;
  acu_consumed?: number;
};

export type Task = {
  id: number;
  taskKey: string;
  repoFullName: string;
  repoUrl: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  issueUrl: string;
  devinSessionId: string | null;
  devinSessionUrl: string | null;
  status: TaskStatus | string;
  statusDetail: string | null;
  structuredOutput: StructuredOutput | null;
  prUrl: string | null;
  blocker: string | null;
  error: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  acusConsumed: number | null;
  acceptedCommentPostedAt: string | null;
  sessionCommentPostedAt: string | null;
  finalCommentPostedAt: string | null;
};

export type GitHubIssueEvent = {
  action: string;
  actorLogin: string | null;
  issueAuthorAssociation: string | null;
  labelName: string | null;
  labels: string[];
  repoFullName: string;
  repoUrl: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  issueUrl: string;
  raw: unknown;
};

export type DevinSession = {
  acus_consumed?: number;
  pull_requests?: Array<{
    pr_state?: string;
    pr_url?: string;
  }>;
  session_id: string;
  status: string;
  status_detail?: string | null;
  structured_output?: StructuredOutput | null;
  title?: string | null;
  url: string;
};

export type Metrics = {
  total: number;
  active: number;
  completed: number;
  blocked: number;
  failed: number;
  successRate: number;
  averageDurationSeconds: number | null;
  totalAcusConsumed: number | null;
};
