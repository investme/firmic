import { AED_RATE, pricing } from "../data/pricing";

export type FirmicOrderItem = {
  key: string;
  name: string;
  category: "office" | "addon" | "ai" | "fee";
  billing: "one-time" | "monthly";
  unitPriceUsd: number;
  quantity: number;
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

const PENDING_PREFIX = "firmic_pending_order:";
const CONFIRMED_PREFIX = "firmic_confirmed_order:";

function safeParse(value: string | null): FirmicOrder | null {
  if (!value) return null;
  try { return JSON.parse(value) as FirmicOrder; } catch { return null; }
}

function calculate(items: FirmicOrderItem[], vatRate: number) {
  const monthlySubtotalUsd = items.filter(i => i.billing === "monthly").reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);
  const oneTimeSubtotalUsd = items.filter(i => i.billing === "one-time").reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);
  const monthlyVatUsd = Number((monthlySubtotalUsd * vatRate).toFixed(2));
  const oneTimeVatUsd = 0;
  const monthlyTotalUsd = Number((monthlySubtotalUsd + monthlyVatUsd).toFixed(2));
  const oneTimeTotalUsd = Number((oneTimeSubtotalUsd + oneTimeVatUsd).toFixed(2));
  return { monthlySubtotalUsd, oneTimeSubtotalUsd, monthlyVatUsd, oneTimeVatUsd, monthlyTotalUsd, oneTimeTotalUsd };
}

export function buildFirmicOrder(input: {
  companyId: string;
  headquarters: any;
  selectedAddons: Array<{ name: string; usd: number }>;
  selectedAgents: Array<{ name: string; price: number }>;
  includeHookupFee?: boolean;
  officePriceUsd?: number;
  previousOrder?: FirmicOrder | null;
}): FirmicOrder {
  const items: FirmicOrderItem[] = [
    { key: "office-rental", name: pricing.officeRental.name, category: "office", billing: "monthly", unitPriceUsd: Number(input.officePriceUsd || pricing.officeRental.usd), quantity: 1 },
    ...input.selectedAddons.map(addon => ({ key: `addon:${addon.name}`, name: addon.name, category: "addon" as const, billing: "monthly" as const, unitPriceUsd: addon.usd, quantity: 1 })),
    ...input.selectedAgents.map(agent => ({ key: `ai:${agent.name}`, name: agent.name, category: "ai" as const, billing: "monthly" as const, unitPriceUsd: agent.price, quantity: 1 })),
    ...(input.includeHookupFee === false ? [] : [{ key: "hookup-fee", name: pricing.hookupFee.name, category: "fee" as const, billing: "one-time" as const, unitPriceUsd: pricing.hookupFee.usd, quantity: 1 }]),
  ];

  const vatRate = 0.05;
  const totals = calculate(items, vatRate);
  const previousKeys = new Set(input.previousOrder?.items.map(item => item.key) || []);
  const isUpgrade = Boolean(input.previousOrder?.paymentStatus === "paid_demo");
  const chargeItems = isUpgrade
    ? items.filter(item => item.billing === "monthly" && !previousKeys.has(item.key))
    : items;
  const chargeItemKeys = chargeItems.map(item => item.key);
  const amountDueSubtotalUsd = chargeItems.reduce((sum, item) => sum + item.unitPriceUsd * item.quantity, 0);
  const amountDueVatUsd = Number((chargeItems.filter(i => i.billing === "monthly").reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0) * vatRate).toFixed(2));
  const amountDueUsd = Number((amountDueSubtotalUsd + amountDueVatUsd).toFixed(2));

  return {
    version: 1,
    companyId: input.companyId,
    headquarters: input.headquarters,
    items,
    currency: "USD",
    vatRate,
    ...totals,
    firstPaymentUsd: isUpgrade ? amountDueUsd : Number((totals.monthlyTotalUsd + totals.oneTimeTotalUsd).toFixed(2)),
    firstPaymentAed: Math.round((isUpgrade ? amountDueUsd : totals.monthlyTotalUsd + totals.oneTimeTotalUsd) * AED_RATE),
    monthlyTotalAed: Math.round(totals.monthlyTotalUsd * AED_RATE),
    orderType: isUpgrade ? "upgrade" : "initial",
    previousMonthlyTotalUsd: input.previousOrder?.monthlyTotalUsd || 0,
    chargeItemKeys,
    amountDueSubtotalUsd,
    amountDueVatUsd,
    amountDueUsd,
    amountDueAed: Math.round(amountDueUsd * AED_RATE),
    paymentStatus: "unpaid",
    createdAt: new Date().toISOString(),
  };
}

export function reconcileOrderWithActiveHeadquarters(order: FirmicOrder, activeHeadquarters: any): FirmicOrder {
  if (!activeHeadquarters?.office_code) return order;
  const items = order.items.filter(item => item.key !== "hookup-fee").map(item => item.key === "office-rental" ? { ...item, unitPriceUsd: Number(activeHeadquarters.monthly_price_usd || item.unitPriceUsd) } : item);
  const totals = calculate(items, order.vatRate);
  const chargeKeys = new Set(order.chargeItemKeys || []);
  const chargeItems = order.orderType === "upgrade" ? items.filter(item => chargeKeys.has(item.key)) : items;
  const amountDueSubtotalUsd = chargeItems.reduce((sum, item) => sum + item.unitPriceUsd * item.quantity, 0);
  const amountDueVatUsd = Number((chargeItems.filter(i => i.billing === "monthly").reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0) * order.vatRate).toFixed(2));
  const amountDueUsd = Number((amountDueSubtotalUsd + amountDueVatUsd).toFixed(2));
  const initialDue = Number((totals.monthlyTotalUsd + totals.oneTimeTotalUsd).toFixed(2));
  return {
    ...order, headquarters: activeHeadquarters, items, ...totals,
    firstPaymentUsd: order.orderType === "upgrade" ? amountDueUsd : initialDue,
    firstPaymentAed: Math.round((order.orderType === "upgrade" ? amountDueUsd : initialDue) * AED_RATE),
    monthlyTotalAed: Math.round(totals.monthlyTotalUsd * AED_RATE),
    amountDueSubtotalUsd, amountDueVatUsd, amountDueUsd, amountDueAed: Math.round(amountDueUsd * AED_RATE),
  };
}

export function savePendingOrder(order: FirmicOrder) { if (typeof window !== "undefined") localStorage.setItem(`${PENDING_PREFIX}${order.companyId}`, JSON.stringify(order)); }
export function getPendingOrder(companyId: string) { return typeof window === "undefined" ? null : safeParse(localStorage.getItem(`${PENDING_PREFIX}${companyId}`)); }
export function confirmOrder(order: FirmicOrder, paymentMethod: FirmicPaymentMethod) {
  if (typeof window === "undefined") return order;
  const confirmed = { ...order, paymentStatus: "paid_demo" as const, paymentMethod, confirmedAt: new Date().toISOString() };
  localStorage.setItem(`${CONFIRMED_PREFIX}${order.companyId}`, JSON.stringify(confirmed));
  localStorage.removeItem(`${PENDING_PREFIX}${order.companyId}`);
  window.dispatchEvent(new CustomEvent("firmic-order-changed"));
  return confirmed;
}
export function getConfirmedOrder(companyId: string) { return typeof window === "undefined" ? null : safeParse(localStorage.getItem(`${CONFIRMED_PREFIX}${companyId}`)); }
