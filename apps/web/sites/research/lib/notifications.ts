const notificationTypeLabels: Record<string, string> = {
  PROJECT_COMPLETED: "Project completed",
  PROJECT_CREATED: "Project created",
  PROJECT_RESEARCH_ASSOCIATED_UPDATED: "Project research updated",
  PROJECT_RESEARCH_SUBMISSION: "Research submission",
  PROPOSAL_ACCEPTED: "Proposal accepted",
  PROPOSAL_ACCEPTED_TASK_COMPLETED: "Proposal accepted and task completed",
  PROPOSAL_DECLINED: "Proposal declined",
  PROPOSAL_DECLINED_TASK_REDO: "Proposal declined and task needs revision",
  PROPOSAL_SUBMITTED: "Proposal submitted",
  RESEARCH_ACCEPTED: "Research accepted",
  RESEARCH_CREATED: "Research created",
  RESEARCH_FOLDER_ACCESS_REQUESTED: "Shared folder requested",
  RESEARCH_PRODUCTION_FINISHED: "Research production finished",
  RESEARCH_PUBLISHED: "Research published",
  RESEARCH_STATUS_UPDATED: "Research status updated",
  RESEARCH_UPDATED: "Research updated",
  SUBMISSION_CREATED: "Submission created",
  SUBMISSION_REVIEW: "Submission in review",
  TASK_ASSIGNED: "Task assigned",
  TASK_ASSIGNEE_CLARIFICATION_ANSWERED: "Assignee answered clarification",
  TASK_ASSIGNEE_CLARIFICATION_REQUESTED:
    "Clarification requested from assignee",
  TASK_ASSIGNEE_CLARIFICATION_REVIEWER_NOTICE:
    "Clarification request reviewer notice",
  TASK_CHECKER_ASSIGNED: "Task checker assigned",
  TASK_CHECKER_REMOVED: "Task checker removed",
  TASK_CLARIFICATION_ANSWERED: "Clarification answered",
  TASK_CLARIFICATION_ANSWERED_REVIEWER_NOTICE:
    "Clarification answer reviewer notice",
  TASK_CLARIFICATION_REQUESTED: "Clarification requested",
  TASK_COMPLETED: "Task completed",
  TASK_COMPLETED_REVIEWER_NOTICE: "Task completion reviewer notice",
  TASK_READY_FOR_CHECK: "Task ready for check",
  TASK_REDO_REQUIRED: "Task revision requested",
  TASK_REDO_REVIEWER_NOTICE: "Task revision reviewer notice",
  TASK_REPORT_UPLOADED: "Task report uploaded",
  TASK_REVOKED: "Task revoked",
  TASK_REVOKED_REVIEWER_NOTICE: "Task revoke reviewer notice",
  TASK_UPDATED_REVIEWER_NOTICE: "Task update reviewer notice",
  VENUE_SUGGESTION_APPROVAL_NEEDED: "Venue suggestion approval needed",
  VENUE_SUGGESTION_APPROVED: "Venue suggestion approved",
  VENUE_SUGGESTION_DECLINED: "Venue suggestion declined",
};

export function researchNotificationTypeLabel(type: string) {
  const label = notificationTypeLabels[type];
  if (label) return label;

  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const assigneeEmailNotificationTypes = new Set([
  "TASK_ASSIGNED",
  "TASK_ASSIGNEE_CLARIFICATION_REQUESTED",
  "TASK_CLARIFICATION_ANSWERED",
  "TASK_COMPLETED",
  "TASK_REDO_REQUIRED",
  "TASK_REVOKED",
]);

const creatorEmailNotificationTypes = new Set([
  "TASK_ASSIGNEE_CLARIFICATION_ANSWERED",
  "TASK_CLARIFICATION_REQUESTED",
  "TASK_READY_FOR_CHECK",
]);

const directProposalEmailNotificationTypes = new Set([
  "PROPOSAL_ACCEPTED",
  "PROPOSAL_DECLINED",
]);

const mergedProposalEmailNotificationTypes = new Set([
  "PROPOSAL_ACCEPTED_TASK_COMPLETED",
  "PROPOSAL_DECLINED_TASK_REDO",
]);

export function researchNotificationEmailSent({
  type,
  title,
  recipientId,
  task,
  proposal,
}: {
  type: string;
  title?: string | null;
  recipientId: string;
  task?: {
    createdById: string;
    assignmentUserIds: string[];
  } | null;
  proposal?: {
    submittedById: string | null;
  } | null;
}) {
  if (assigneeEmailNotificationTypes.has(type)) {
    return Boolean(task?.assignmentUserIds.includes(recipientId));
  }

  if (creatorEmailNotificationTypes.has(type)) {
    if (type === "TASK_CLARIFICATION_REQUESTED") {
      const normalizedTitle = title?.trim().toLowerCase() ?? "";
      if (normalizedTitle === "clarification message added") return false;
    }
    return task?.createdById === recipientId;
  }

  if (directProposalEmailNotificationTypes.has(type)) {
    return proposal?.submittedById === recipientId;
  }

  if (mergedProposalEmailNotificationTypes.has(type)) {
    return (
      proposal?.submittedById === recipientId ||
      Boolean(task?.assignmentUserIds.includes(recipientId))
    );
  }

  return false;
}
