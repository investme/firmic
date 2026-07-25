import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toAED } from "../data/pricing";
import { rentOffice } from "../../services/officeApi";
import { useWorkspace } from "../context/WorkspaceProvider";
import { getActiveWorkspace, setActiveHeadquarters } from "../utils/workspaceContext";
import {
  confirmOrder,
  FirmicOrder,
  getPendingOrder,
  reconcileOrderWithActiveHeadquarters,
  savePendingOrder,
} from "../utils/orderStorage";

function detectBrand(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, "");
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";
  return "Card";
}

export default function Checkout() {
  const router = useRouter();
  const { refreshWorkspace } = useWorkspace();
  const [order, setOrder] = useState<FirmicOrder | null>(null);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  useEffect(() => {
    const workspace = getActiveWorkspace();
    if (!workspace?.id) return;

    const pendingOrder = getPendingOrder(String(workspace.id));
    if (!pendingOrder) {
      setOrder(null);
      return;
    }

    const reconciledOrder = workspace.headquarters?.office_code
      ? reconcileOrderWithActiveHeadquarters(pendingOrder, workspace.headquarters)
      : pendingOrder;

    savePendingOrder(reconciledOrder);
    localStorage.removeItem("firmic_selected_headquarters");
    setOrder(reconciledOrder);
  }, []);

  const monthlyItems = useMemo(
    () => order?.items.filter((item) => item.billing === "monthly") || [],
    [order]
  );
  const oneTimeItems = useMemo(
    () => order?.items.filter((item) => item.billing === "one-time") || [],
    [order]
  );
  const chargeItems = useMemo(() => {
    if (!order) return [];
    const keys = new Set(order.chargeItemKeys || []);
    return order.orderType === "upgrade"
      ? order.items.filter((item) => keys.has(item.key))
      : order.items;
  }, [order]);
  const amountDueSubtotal = order?.amountDueSubtotalUsd ?? order?.firstPaymentUsd ?? 0;
  const amountDueVat = order?.amountDueVatUsd ?? 0;
  const amountDue = order?.amountDueUsd ?? order?.firstPaymentUsd ?? 0;
  const amountDueAed = order?.amountDueAed ?? order?.firstPaymentAed ?? 0;

  function validatePayment() {
    const digits = cardNumber.replace(/\D/g, "");
    if (!cardholderName.trim()) throw new Error("Enter the cardholder name.");
    if (digits.length < 12 || digits.length > 19) throw new Error("Enter a valid card number.");
    if (!/^\d{2}\/\d{2}$/.test(expiry)) throw new Error("Enter expiry as MM/YY.");
    if (!/^\d{3,4}$/.test(cvv)) throw new Error("Enter a valid security code.");
  }

  async function activateOffice() {
    if (activating) return;

    try {
      setActivating(true);
      setError("");
      validatePayment();

      const workspace = getActiveWorkspace();
      if (!workspace?.id) throw new Error("No active company workspace was found.");
      if (!order) throw new Error("Your configured order was not found. Return to Configure Office.");
      if (!order.headquarters?.office_code) throw new Error("Choose a headquarters before checkout.");

      const selectedOfficeCode = String(order.headquarters.office_code).trim();
      const activeOfficeCode = String(workspace.headquarters?.office_code || "").trim();

      // Headquarters rental and order payment are separate operations.
      // Rent only when the company does not already have a headquarters.
      if (!activeOfficeCode) {
        await rentOffice({
          office_code: selectedOfficeCode,
          company_id: String(workspace.id),
        });
      }

      // For an existing company, checkout is a service/payment operation.
      // The active headquarters is authoritative even if an older pending
      // order carried a stale office selection.
      const finalOrder = workspace.headquarters?.office_code
        ? reconcileOrderWithActiveHeadquarters(order, workspace.headquarters)
        : order;

      confirmOrder(finalOrder, {
        type: "card",
        brand: detectBrand(cardNumber),
        last4: cardNumber.replace(/\D/g, "").slice(-4),
        cardholderName: cardholderName.trim(),
      });

      setActiveHeadquarters(workspace.headquarters || order.headquarters);
      localStorage.removeItem("firmic_selected_headquarters");
      await refreshWorkspace();
      await router.replace("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout failed.");
    } finally {
      setActivating(false);
    }
  }

  if (!order) {
    return (
      <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
        <div className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-slate-500 mt-3">No configured order was found.</p>
          <button
            type="button"
            onClick={() => void router.push("/configure-office")}
            className="mt-6 bg-violet-600 text-white rounded-xl px-6 py-3 font-semibold"
          >
            Return to Configure Office
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="text-slate-500 mt-1">{order?.orderType === "upgrade" ? "Confirm the additional services and updated monthly subscription." : "Confirm your Firmic headquarters package and payment method."}</p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold">Order Summary</h2>
            <div className="mt-5 space-y-3">
              {order.orderType === "upgrade" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Your current office, services, and active AI employees have already been paid. Only the additions below are charged today.
                </div>
              )}
              {chargeItems.map((item) => (
                <Row
                  key={item.key}
                  name={item.name}
                  price={item.unitPriceUsd}
                  note={order.orderType === "upgrade" ? "new monthly addition" : item.billing === "one-time" ? "one-time" : item.category === "ai" ? "monthly AI employee" : "monthly"}
                />
              ))}
              {order.orderType === "upgrade" && chargeItems.length === 0 && (
                <p className="text-slate-500">No new billable services were selected.</p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Payment Method</h2>
                <p className="text-sm text-slate-500 mt-1">Card details are used for this MVP checkout flow.</p>
              </div>
              <span className="rounded-full bg-violet-50 text-violet-700 px-3 py-1 text-xs font-bold">Secure card</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <Field label="Cardholder name" value={cardholderName} onChange={setCardholderName} placeholder="Name on card" />
              <Field label="Card number" value={cardNumber} onChange={(value) => setCardNumber(value.replace(/[^\d ]/g, "").slice(0, 23))} placeholder="4242 4242 4242 4242" inputMode="numeric" />
              <Field label="Expiry" value={expiry} onChange={(value) => setExpiry(value.replace(/[^\d/]/g, "").slice(0, 5))} placeholder="MM/YY" inputMode="numeric" />
              <Field label="Security code" value={cvv} onChange={(value) => setCvv(value.replace(/\D/g, "").slice(0, 4))} placeholder="CVV" inputMode="numeric" />
            </div>

            <p className="mt-4 text-xs text-slate-500">
              MVP demo payment: the order is recorded as paid for product demonstration; no external payment gateway charge is processed yet.
            </p>
          </section>
        </div>

        <aside className="bg-slate-950 text-white rounded-3xl p-6 h-fit sticky top-6">
          <h2 className="text-xl font-bold">Payment Due</h2>

          <Breakdown label={order.orderType === "upgrade" ? "New additions" : "Monthly subtotal"} value={amountDueSubtotal} />
          <Breakdown label={`VAT (${Math.round(order.vatRate * 100)}%)`} value={amountDueVat} />
          {order.orderType !== "upgrade" && <Breakdown label="One-time hookup fee" value={order.oneTimeTotalUsd} />}

          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-slate-400">{order.orderType === "upgrade" ? "Due Today" : "First Payment"}</p>
            <p className="text-4xl font-bold">${amountDue.toFixed(2)}</p>
            <p className="text-slate-400">AED {amountDueAed}</p>
          </div>

          <div className="mt-7 border-t border-slate-800 pt-5">
            <p className="text-slate-400">Then Monthly</p>
            <p className="text-3xl font-bold">${order.monthlyTotalUsd.toFixed(2)}</p>
            <p className="text-slate-400">AED {order.monthlyTotalAed}/month</p>
          </div>

          {error && <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <button
            type="button"
            onClick={activateOffice}
            disabled={activating || (order.orderType === "upgrade" && amountDue <= 0)}
            className="mt-8 w-full bg-violet-600 rounded-xl py-3 font-semibold disabled:opacity-60"
          >
            {activating ? "Processing Order..." : order.orderType === "upgrade" ? `Pay $${amountDue.toFixed(2)} & Update Subscription` : `Pay $${amountDue.toFixed(2)} & Activate`}
          </button>
        </aside>
      </div>
    </div>
  );
}

function Row({ name, price, note }: { name: string; price: number; note: string }) {
  return (
    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div><p className="font-bold">{name}</p><p className="text-sm text-slate-500">{note}</p></div>
      <p className="font-bold">${price.toFixed(2)} <span className="text-xs text-slate-500">/ AED {toAED(price)}</span></p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: "numeric" }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}

function Breakdown({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4 mt-4 text-sm"><span className="text-slate-400">{label}</span><span className="font-semibold">${value.toFixed(2)}</span></div>;
}
