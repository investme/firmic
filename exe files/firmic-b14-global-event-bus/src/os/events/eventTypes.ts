export const FIRMIC_EVENTS = {
  ACTION_STARTED: "action.started",
  ACTION_COMPLETED: "action.completed",
  ACTION_FAILED: "action.failed",

  COMPANY_CREATED: "company.created",
  COMPANY_UPDATED: "company.updated",
  COMPANY_DELETED: "company.deleted",

  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_COMPLETED: "task.completed",

  DOCUMENT_UPLOADED: "document.uploaded",
  DOCUMENT_APPROVED: "document.approved",
  DOCUMENT_REJECTED: "document.rejected",

  INVOICE_CREATED: "invoice.created",
  INVOICE_PAID: "invoice.paid",
  INVOICE_OVERDUE: "invoice.overdue",

  MEETING_BOOKED: "meeting.booked",
  MEETING_CANCELLED: "meeting.cancelled",

  AI_JOB_STARTED: "ai.job.started",
  AI_JOB_PROGRESS: "ai.job.progress",
  AI_JOB_COMPLETED: "ai.job.completed",
  AI_JOB_FAILED: "ai.job.failed",

  NOTIFICATION_CREATED: "notification.created",
} as const;

export type FirmicEventType =
  (typeof FIRMIC_EVENTS)[keyof typeof FIRMIC_EVENTS];
