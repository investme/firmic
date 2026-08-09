import { AED_RATE } from "../data/pricing";
import {
  getPlanEntitlement,
  normalizePlanCode,
  type FirmicPlanCode,
} from "./planEntitlements";

export type FirmicOrderItem = {
  key: string;
  name: string;
  category:
    | "plan"
    | "office"
    | "addon"
    | "ai"
    | "fee";
  billing: "one-time" | "monthly";
  unitPriceUsd: number;
  quantity: number;
  included?: boolean;
  note?: string;
};

export type FirmicPaymentMethod = {
  type: "card";
  brand: string;
  last4: string;
  cardholderName: string;
};

export type FirmicOrder = {
  version: 1;
  companyId: string;
  headquarters: any;
  planCode?: FirmicPlanCode;
  items: FirmicOrderItem[];
  currency: "USD";
  vatRate: number;
  monthlySubtotalUsd: number;
  monthlyVatUsd: number;
  monthlyTotalUsd: number;
  oneTimeSubtotalUsd: number;
  oneTimeVatUsd: number;
  oneTimeTotalUsd: number;
  firstPaymentUsd: number;
  firstPaymentAed: number;
  monthlyTotalAed: number;
  orderType?: "initial" | "upgrade";
  previousMonthlyTotalUsd?: number;
  chargeItemKeys?: string[];
  amountDueSubtotalUsd?: number;
  amountDueVatUsd?: number;
  amountDueUsd?: number;
  amountDueAed?: number;
  paymentStatus: "unpaid" | "paid_demo";
  paymentMethod?: FirmicPaymentMethod;
  createdAt: string;
  confirmedAt?: string;
};

type PricedAddon = {
  name: string;
  usd: number;
};

type PricedAgent = {
  name: string;
  price: number;
};

const PENDING_PREFIX = "firmic_pending_order:";
const CONFIRMED_PREFIX = "firmic_confirmed_order:";

function safeParse(
  value: string | null,
): FirmicOrder | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as FirmicOrder;
  } catch {
    return null;
  }
}

function calculate(
  items: FirmicOrderItem[],
  vatRate: number,
) {
  const billableItems = items.filter(
    (item) => !item.included && item.unitPriceUsd > 0,
  );

  const monthlySubtotalUsd = billableItems
    .filter((item) => item.billing === "monthly")
    .reduce(
      (sum, item) =>
        sum + item.unitPriceUsd * item.quantity,
      0,
    );

  const oneTimeSubtotalUsd = billableItems
    .filter((item) => item.billing === "one-time")
    .reduce(
      (sum, item) =>
        sum + item.unitPriceUsd * item.quantity,
      0,
    );

  const monthlyVatUsd = Number(
    (monthlySubtotalUsd * vatRate).toFixed(2),
  );

  const oneTimeVatUsd = 0;

  return {
    monthlySubtotalUsd,
    oneTimeSubtotalUsd,
    monthlyVatUsd,
    oneTimeVatUsd,
    monthlyTotalUsd: Number(
      (monthlySubtotalUsd + monthlyVatUsd).toFixed(2),
    ),
    oneTimeTotalUsd: Number(
      (oneTimeSubtotalUsd + oneTimeVatUsd).toFixed(2),
    ),
  };
}

export function buildFirmicOrder(input: {
  companyId: string;
  headquarters: any;
  planCode?: string;
  selectedAddons: PricedAddon[];
  selectedAgents: PricedAgent[];
  includedAddons?: PricedAddon[];
  includedAgents?: PricedAgent[];
  includeHookupFee?: boolean;
  previousOrder?: FirmicOrder | null;
}): FirmicOrder {
  const planCode = normalizePlanCode(input.planCode);
  const plan = getPlanEntitlement(planCode);

  const items: FirmicOrderItem[] = [
    {
      key: `plan:${plan.code}`,
      name: `${plan.name} Firmic Plan`,
      category: "plan",
      billing: "monthly",
      unitPriceUsd: plan.monthlyPriceUsd,
      quantity: 1,
      note: `Includes headquarters and ${plan.includedAIWorkers} AI workers`,
    },
    {
      key: "headquarters-included",
      name: "Firmic Headquarters",
      category: "office",
      billing: "monthly",
      unitPriceUsd: 0,
      quantity: 1,
      included: true,
      note: `Included with ${plan.name}`,
    },
    ...(input.includedAddons || []).map(
      (addon): FirmicOrderItem => ({
        key: `included-addon:${addon.name}`,
        name: addon.name,
        category: "addon",
        billing: "monthly",
        unitPriceUsd: 0,
        quantity: 1,
        included: true,
        note: `Included with ${plan.name}`,
      }),
    ),
    ...(input.includedAgents || []).map(
      (agent): FirmicOrderItem => ({
        key: `included-ai:${agent.name}`,
        name: agent.name,
        category: "ai",
        billing: "monthly",
        unitPriceUsd: 0,
        quantity: 1,
        included: true,
        note: `Included in ${plan.name} AI workforce`,
      }),
    ),
    ...input.selectedAddons.map(
      (addon): FirmicOrderItem => ({
        key: `addon:${addon.name}`,
        name: addon.name,
        category: "addon",
        billing: "monthly",
        unitPriceUsd: addon.usd,
        quantity: 1,
      }),
    ),
    ...input.selectedAgents.map(
      (agent): FirmicOrderItem => ({
        key: `ai:${agent.name}`,
        name: agent.name,
        category: "ai",
        billing: "monthly",
        unitPriceUsd: agent.price,
        quantity: 1,
      }),
    ),
    ...(input.includeHookupFee === false
      ? []
      : [
          {
            key: "company-launch-fee",
            name: "Firmic Company Launch Fee",
            category: "fee" as const,
            billing: "one-time" as const,
            unitPriceUsd: plan.launchFeeUsd,
            quantity: 1,
            note: "One-time company launch fee",
          },
        ]),
  ];

  const vatRate = 0.05;
  const totals = calculate(items, vatRate);
  const previousKeys = new Set(
    input.previousOrder?.items.map((item) => item.key) ||
      [],
  );
  const isUpgrade =
    input.previousOrder?.paymentStatus === "paid_demo";

  const chargeItems = isUpgrade
    ? items.filter(
        (item) =>
          !item.included &&
          item.unitPriceUsd > 0 &&
          !previousKeys.has(item.key),
      )
    : items.filter(
        (item) => !item.included && item.unitPriceUsd > 0,
      );

  const chargeItemKeys = chargeItems.map(
    (item) => item.key,
  );

  const amountDueSubtotalUsd = chargeItems.reduce(
    (sum, item) =>
      sum + item.unitPriceUsd * item.quantity,
    0,
  );

  const amountDueVatUsd = Number(
    (
      chargeItems
        .filter((item) => item.billing === "monthly")
        .reduce(
          (sum, item) =>
            sum + item.unitPriceUsd * item.quantity,
          0,
        ) * vatRate
    ).toFixed(2),
  );

  const amountDueUsd = Number(
    (
      amountDueSubtotalUsd + amountDueVatUsd
    ).toFixed(2),
  );

  const initialPaymentUsd = Number(
    (
      totals.monthlyTotalUsd +
      totals.oneTimeTotalUsd
    ).toFixed(2),
  );

  return {
    version: 1,
    companyId: input.companyId,
    headquarters: input.headquarters,
    planCode,
    items,
    currency: "USD",
    vatRate,
    ...totals,
    firstPaymentUsd: isUpgrade
      ? amountDueUsd
      : initialPaymentUsd,
    firstPaymentAed: Math.round(
      (isUpgrade ? amountDueUsd : initialPaymentUsd) *
        AED_RATE,
    ),
    monthlyTotalAed: Math.round(
      totals.monthlyTotalUsd * AED_RATE,
    ),
    orderType: isUpgrade ? "upgrade" : "initial",
    previousMonthlyTotalUsd:
      input.previousOrder?.monthlyTotalUsd || 0,
    chargeItemKeys,
    amountDueSubtotalUsd,
    amountDueVatUsd,
    amountDueUsd,
    amountDueAed: Math.round(
      amountDueUsd * AED_RATE,
    ),
    paymentStatus: "unpaid",
    createdAt: new Date().toISOString(),
  };
}

export function reconcileOrderWithActiveHeadquarters(
  order: FirmicOrder,
  activeHeadquarters: any,
): FirmicOrder {
  if (!activeHeadquarters?.office_code) {
    return order;
  }

  /*
   * IMPORTANT:
   * Having an active/reserved headquarters does NOT mean
   * the one-time Company Launch Fee has already been paid.
   *
   * Initial launch:
   * - Keep the $79 Company Launch Fee.
   *
   * Upgrade:
   * - Remove the launch fee because the company already
   *   completed its original paid launch.
   */
  const items =
    order.orderType === "upgrade"
      ? order.items.filter(
          (item) =>
            item.key !== "company-launch-fee" &&
            item.key !== "hookup-fee",
        )
      : order.items;

  const totals = calculate(items, order.vatRate);

  const chargeKeys = new Set(
    order.chargeItemKeys || [],
  );

  const chargeItems =
    order.orderType === "upgrade"
      ? items.filter(
          (item) =>
            chargeKeys.has(item.key) &&
            !item.included &&
            item.unitPriceUsd > 0,
        )
      : items.filter(
          (item) =>
            !item.included &&
            item.unitPriceUsd > 0,
        );

  const amountDueSubtotalUsd =
    chargeItems.reduce(
      (sum, item) =>
        sum + item.unitPriceUsd * item.quantity,
      0,
    );

  const amountDueVatUsd = Number(
    (
      chargeItems
        .filter(
          (item) => item.billing === "monthly",
        )
        .reduce(
          (sum, item) =>
            sum + item.unitPriceUsd * item.quantity,
          0,
        ) * order.vatRate
    ).toFixed(2),
  );

  const amountDueUsd = Number(
    (
      amountDueSubtotalUsd + amountDueVatUsd
    ).toFixed(2),
  );

  const initialDue = Number(
    (
      totals.monthlyTotalUsd +
      totals.oneTimeTotalUsd
    ).toFixed(2),
  );

  return {
    ...order,
    headquarters: activeHeadquarters,
    items,
    ...totals,
    firstPaymentUsd:
      order.orderType === "upgrade"
        ? amountDueUsd
        : initialDue,
    firstPaymentAed: Math.round(
      (
        order.orderType === "upgrade"
          ? amountDueUsd
          : initialDue
      ) * AED_RATE,
    ),
    monthlyTotalAed: Math.round(
      totals.monthlyTotalUsd * AED_RATE,
    ),
    amountDueSubtotalUsd,
    amountDueVatUsd,
    amountDueUsd,
    amountDueAed: Math.round(
      amountDueUsd * AED_RATE,
    ),
  };
}

export function savePendingOrder(
  order: FirmicOrder,
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    `${PENDING_PREFIX}${order.companyId}`,
    JSON.stringify(order),
  );
}

export function getPendingOrder(
  companyId: string,
) {
  if (typeof window === "undefined") return null;

  return safeParse(
    localStorage.getItem(
      `${PENDING_PREFIX}${companyId}`,
    ),
  );
}

export function confirmOrder(
  order: FirmicOrder,
  paymentMethod: FirmicPaymentMethod,
) {
  if (typeof window === "undefined") {
    return order;
  }

  const confirmed = {
    ...order,
    paymentStatus: "paid_demo" as const,
    paymentMethod,
    confirmedAt: new Date().toISOString(),
  };

  localStorage.setItem(
    `${CONFIRMED_PREFIX}${order.companyId}`,
    JSON.stringify(confirmed),
  );

  localStorage.removeItem(
    `${PENDING_PREFIX}${order.companyId}`,
  );

  window.dispatchEvent(
    new CustomEvent("firmic-order-changed"),
  );

  return confirmed;
}

export function getConfirmedOrder(
  companyId: string,
) {
  if (typeof window === "undefined") return null;

  return safeParse(
    localStorage.getItem(
      `${CONFIRMED_PREFIX}${companyId}`,
    ),
  );
}
