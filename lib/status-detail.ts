import type { StructuredOutput } from "@/lib/types";

const STATUS_DETAIL_LABELS: Record<string, string> = {
  pr_opened: "PR opened",
  succeeded: "Succeeded",
  completed: "Completed",
  waiting_for_user: "Waiting for user",
  poll_failed: "Polling failed",
  session_created: "Session created",
  working: "Working",
  finished: "Finished",
};

export function normalizeTaskStatusDetail({
  status,
  statusDetail,
  prUrl,
  structuredOutput,
}: {
  status: string;
  statusDetail: string | null;
  prUrl: string | null;
  structuredOutput: StructuredOutput | null;
}) {
  if (status === "completed") {
    if (prUrl) return "pr_opened";
    if (structuredOutput?.status === "succeeded") return "succeeded";
    if (statusDetail === "working" || statusDetail === "waiting_for_user") {
      return "completed";
    }
  }

  return statusDetail;
}

export function formatStatusDetail(detail: string | null) {
  if (!detail) return "No detail yet";
  return STATUS_DETAIL_LABELS[detail] || detail.replaceAll("_", " ");
}
