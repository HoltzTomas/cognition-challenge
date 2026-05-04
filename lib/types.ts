export const REMEDIATION_LABEL = "devin-remediate";

export type TaskStatus =
  | "accepted"
  | "session_created"
  | "working"
  | "completed"
  | "blocked"
  | "failed"
  | "rejected";

export type IntakeDecision = "accepted" | "rejected";

export type StructuredOutput = {
  status?: string;
  summary?: string;
  tests_run?: string[];
  pr_url?: string;
  blocker?: string;
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
  triggerActor: string | null;
  triggerAction: string | null;
  authorizationReason: string | null;
  intakeDecision: IntakeDecision;
  suggestedTestCommand: string | null;
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
};
