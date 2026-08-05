export type FirmicPlanCode =
  "PLAN_STARTER" | "PLAN_BUSINESS" | "PLAN_ENTERPRISE";

export type PlanPresentation = {
  icon: string;
  badge?: string;
  highlights: string[];
};

export const PLAN_UI: Record<FirmicPlanCode, PlanPresentation> = {
  PLAN_STARTER: {
    icon: "🚀",
    highlights: [
      "Virtual Headquarters",
      "Sonny AI COO",
      "Hermes Compliance",
      "Firmic CRM",
      "Digital Mailroom",
      "Business VoIP",
    ],
  },

  PLAN_BUSINESS: {
    icon: "⭐",
    badge: "Recommended",
    highlights: [
      "Microsoft 365 integration",
      "Basic OpenAI included",
      "Zoom integration",
      "QuickBooks integration",
      "Executive Intelligence",
      "Workflow Automation",
    ],
  },

  PLAN_ENTERPRISE: {
    icon: "🏢",
    highlights: [
      "Unlimited AI workforce",
      "Enterprise SSO",
      "Advanced audit logs",
      "Firmic API access",
      "Custom integrations",
      "Dedicated onboarding",
    ],
  },
};
