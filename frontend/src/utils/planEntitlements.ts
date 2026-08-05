export type FirmicPlanCode =
  | "PLAN_STARTER"
  | "PLAN_BUSINESS"
  | "PLAN_ENTERPRISE";

export type FirmicPlanName =
  | "Starter"
  | "Business"
  | "Enterprise";

export type FirmicPlanEntitlement = {
  code: FirmicPlanCode;
  name: FirmicPlanName;
  monthlyPriceUsd: number;
  includedAIWorkers: number | "unlimited";
  includedAddons: string[];
  headquartersIncluded: true;
};

export const FIRMIC_PLAN_ENTITLEMENTS: Record<
  FirmicPlanCode,
  FirmicPlanEntitlement
> = {
  PLAN_STARTER: {
    code: "PLAN_STARTER",
    name: "Starter",
    monthlyPriceUsd: 149,
    includedAIWorkers: 5,
    includedAddons: [
      "Mailbox",
      "VoIP Number",
    ],
    headquartersIncluded: true,
  },
  PLAN_BUSINESS: {
    code: "PLAN_BUSINESS",
    name: "Business",
    monthlyPriceUsd: 399,
    includedAIWorkers: 25,
    includedAddons: [
      "Mailbox",
      "VoIP Number",
      "Meeting Rooms",
      "Zoom Pro",
      "CRM Software",
      "Microsoft 365",
    ],
    headquartersIncluded: true,
  },
  PLAN_ENTERPRISE: {
    code: "PLAN_ENTERPRISE",
    name: "Enterprise",
    monthlyPriceUsd: 999,
    includedAIWorkers: "unlimited",
    includedAddons: [
      "Mailbox",
      "VoIP Number",
      "Meeting Rooms",
      "Zoom Pro",
      "CRM Software",
      "Microsoft 365",
    ],
    headquartersIncluded: true,
  },
};

export function normalizePlanCode(
  value?: string | null,
): FirmicPlanCode {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (
    normalized === "PLAN_STARTER" ||
    normalized === "STARTER"
  ) {
    return "PLAN_STARTER";
  }

  if (
    normalized === "PLAN_ENTERPRISE" ||
    normalized === "ENTERPRISE"
  ) {
    return "PLAN_ENTERPRISE";
  }

  return "PLAN_BUSINESS";
}

export function getPlanEntitlement(
  value?: string | null,
): FirmicPlanEntitlement {
  return FIRMIC_PLAN_ENTITLEMENTS[
    normalizePlanCode(value)
  ];
}

export function isAddonIncluded(
  planValue: string | null | undefined,
  addonName: string,
): boolean {
  return getPlanEntitlement(
    planValue,
  ).includedAddons.includes(addonName);
}

export function getIncludedAICount(
  planValue?: string | null,
): number | "unlimited" {
  return getPlanEntitlement(
    planValue,
  ).includedAIWorkers;
}

export function getExtraAIAgents<T>(
  planValue: string | null | undefined,
  selectedAgents: T[],
): T[] {
  const allowance = getIncludedAICount(planValue);

  if (allowance === "unlimited") {
    return [];
  }

  return selectedAgents.slice(allowance);
}
