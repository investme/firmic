export type SonnyAction = {
  id: string

  type:
    | "TASK_CREATE"
    | "DOCUMENT_REQUEST"
    | "SERVICE_BOOKING"
    | "COMPLIANCE_ALERT"
    | "PAYMENT_DUE"
    | "PROVIDER_MATCH"
    | "OPTIMIZATION_SUGGESTION"

  title: string
  description: string

  priority: "low" | "medium" | "high"

  status: "pending" | "approved" | "executed" | "failed"

  metadata?: Record<string, any>

  createdAt: Date
}