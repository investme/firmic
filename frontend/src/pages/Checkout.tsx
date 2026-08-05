import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toAED } from "../data/pricing";
import { rentOffice } from "../../services/officeApi";
import { useWorkspace } from "../context/WorkspaceProvider";
import {
  getActiveWorkspace,
  setActiveHeadquarters,
} from "../utils/workspaceContext";
import {
  confirmOrder,
  FirmicOrder,
  getPendingOrder,
  reconcileOrderWithActiveHeadquarters,
  savePendingOrder,
} from "../utils/orderStorage";

const COMPANY_LAUNCH_FEE_USD = 79;

function detectBrand(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, "");

  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";

  return "Card";
}

function normalizeLaunchFee(order: FirmicOrder): FirmicOrder {
  const launchFeeItem: FirmicOrder["items"][number] = {
    key: "company-launch-fee",
    name: "Company Launch Fee",
    category: "fee",
    billing: "one-time",
    unitPriceUsd: COMPANY_LAUNCH_FEE_USD,
    quantity: 1,
    included: false,
    note: "One-time company activation and compliance setup",
  };

  const itemsWithoutLegacyFee: FirmicOrder["items"] =
    order.items.filter(
      (item) =>
        item.key !== "hookup-fee" &&
        item.key !== "company-launch-fee" &&
        item.name.toLowerCase() !== "hookup fee" &&
        item.name.toLowerCase() !== "company launch fee",
    );

  const items: FirmicOrder["items"] =
    order.orderType === "upgrade"
      ? itemsWithoutLegacyFee
      : [...itemsWithoutLegacyFee, launchFeeItem];

  const monthlyBillableItems = items.filter(
    (item) =>
      item.included !== true &&
      item.billing === "monthly" &&
      item.unitPriceUsd > 0,
  );

  const oneTimeBillableItems = items.filter(
    (item) =>
      item.included !== true &&
      item.billing === "one-time" &&
      item.unitPriceUsd > 0,
  );

  const monthlySubtotalUsd = monthlyBillableItems.reduce(
    (sum, item) => sum + item.unitPriceUsd * item.quantity,
    0,
  );

  const oneTimeSubtotalUsd = oneTimeBillableItems.reduce(
    (sum, item) => sum + item.unitPriceUsd * item.quantity,
    0,
  );

  const monthlyVatUsd = Number(
    (monthlySubtotalUsd * order.vatRate).toFixed(2),
  );

  const oneTimeVatUsd = 0;

  const monthlyTotalUsd = Number(
    (monthlySubtotalUsd + monthlyVatUsd).toFixed(2),
  );

  const oneTimeTotalUsd = Number(
    (oneTimeSubtotalUsd + oneTimeVatUsd).toFixed(2),
  );

  const chargeItemKeys =
    order.orderType === "upgrade"
      ? order.chargeItemKeys || []
      : items
          .filter(
            (item) =>
              item.included !== true &&
              item.unitPriceUsd > 0,
          )
          .map((item) => item.key);

  const chargeKeySet = new Set(chargeItemKeys);

  const chargeItems =
    order.orderType === "upgrade"
      ? items.filter((item) => chargeKeySet.has(item.key))
      : items.filter(
          (item) =>
            item.included !== true &&
            item.unitPriceUsd > 0,
        );

  const amountDueSubtotalUsd = chargeItems.reduce(
    (sum, item) => sum + item.unitPriceUsd * item.quantity,
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
        ) * order.vatRate
    ).toFixed(2),
  );

  const amountDueUsd = Number(
    (amountDueSubtotalUsd + amountDueVatUsd).toFixed(2),
  );

  const firstPaymentUsd =
    order.orderType === "upgrade"
      ? amountDueUsd
      : Number(
          (monthlyTotalUsd + oneTimeTotalUsd).toFixed(2),
        );

  return {
    ...order,
    items,
    monthlySubtotalUsd,
    monthlyVatUsd,
    monthlyTotalUsd,
    monthlyTotalAed: Math.round(monthlyTotalUsd * 3.67),
    oneTimeSubtotalUsd,
    oneTimeVatUsd,
    oneTimeTotalUsd,
    firstPaymentUsd,
    firstPaymentAed: Math.round(firstPaymentUsd * 3.67),
    chargeItemKeys,
    amountDueSubtotalUsd,
    amountDueVatUsd,
    amountDueUsd,
    amountDueAed: Math.round(amountDueUsd * 3.67),
  };
}

export default function Checkout() {
  const router = useRouter();
  const { refreshWorkspace } = useWorkspace();

  const [order, setOrder] = useState<FirmicOrder | null>(
    null,
  );
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [cardholderName, setCardholderName] =
    useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [paymentStage, setPaymentStage] = useState<
    "checkout" | "processing" | "paid" | "handoff"
  >("checkout");

  useEffect(() => {
    const workspace = getActiveWorkspace();

    if (!workspace?.id) {
      void router.replace(
        "/login?next=/checkout",
      );
      return;
    }

    const pendingOrder = getPendingOrder(
      String(workspace.id),
    );

    if (!pendingOrder) {
      setOrder(null);
      return;
    }

    const reconciledOrder =
      workspace.headquarters?.office_code
        ? reconcileOrderWithActiveHeadquarters(
            pendingOrder,
            workspace.headquarters,
          )
        : pendingOrder;

    const normalizedOrder =
      normalizeLaunchFee(reconciledOrder);

    savePendingOrder(normalizedOrder);
    localStorage.removeItem(
      "firmic_selected_headquarters",
    );
    setOrder(normalizedOrder);
  }, [router]);

  const monthlyItems = useMemo(
    () =>
      order?.items.filter(
        (item) => item.billing === "monthly",
      ) || [],
    [order],
  );

  const oneTimeItems = useMemo(
    () =>
      order?.items.filter(
        (item) => item.billing === "one-time",
      ) || [],
    [order],
  );

  const includedItems = useMemo(
    () =>
      order?.items.filter((item) => item.included) || [],
    [order],
  );

  const chargeItems = useMemo(() => {
    if (!order) return [];

    const keys = new Set(
      order.chargeItemKeys || [],
    );

    return order.orderType === "upgrade"
      ? order.items.filter((item) =>
          keys.has(item.key),
        )
      : order.items.filter(
          (item) =>
            !item.included && item.unitPriceUsd > 0,
        );
  }, [order]);

  const amountDueSubtotal =
    order?.amountDueSubtotalUsd ??
    order?.firstPaymentUsd ??
    0;

  const amountDueVat =
    order?.amountDueVatUsd ?? 0;

  const amountDue =
    order?.amountDueUsd ??
    order?.firstPaymentUsd ??
    0;

  const amountDueAed =
    order?.amountDueAed ??
    order?.firstPaymentAed ??
    0;

  const planItem = monthlyItems.find(
    (item) => item.category === "plan",
  );

  function validatePayment() {
    const digits = cardNumber.replace(/\D/g, "");

    if (!cardholderName.trim()) {
      throw new Error(
        "Enter the cardholder name.",
      );
    }

    if (digits.length < 12 || digits.length > 19) {
      throw new Error(
        "Enter a valid card number.",
      );
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      throw new Error(
        "Enter expiry as MM/YY.",
      );
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      throw new Error(
        "Enter a valid security code.",
      );
    }
  }

  async function completePayment() {
    if (activating) return;

    try {
      setActivating(true);
      setError("");
      validatePayment();

      const workspace = getActiveWorkspace();

      if (!workspace?.id) {
        throw new Error(
          "No active company workspace was found.",
        );
      }

      if (!order) {
        throw new Error(
          "Your configured order was not found. Return to company configuration.",
        );
      }

      if (!order.headquarters?.office_code) {
        throw new Error(
          "Choose a headquarters before checkout.",
        );
      }

      setPaymentStage("processing");
      await wait(700);

      const selectedOfficeCode = String(
        order.headquarters.office_code,
      ).trim();

      const activeOfficeCode = String(
        workspace.headquarters?.office_code || "",
      ).trim();

      if (!activeOfficeCode) {
        await rentOffice({
          office_code: selectedOfficeCode,
          company_id: String(workspace.id),
        });
      }

      const finalOrder =
        workspace.headquarters?.office_code
          ? normalizeLaunchFee(
              reconcileOrderWithActiveHeadquarters(
                order,
                workspace.headquarters,
              ),
            )
          : normalizeLaunchFee(order);

      confirmOrder(finalOrder, {
        type: "card",
        brand: detectBrand(cardNumber),
        last4: cardNumber
          .replace(/\D/g, "")
          .slice(-4),
        cardholderName: cardholderName.trim(),
      });

      setActiveHeadquarters(
        workspace.headquarters ||
          order.headquarters,
      );

      localStorage.setItem(
        `firmic_compliance_status:${workspace.id}`,
        JSON.stringify({
          status: "documents_required",
          subscription_completed: true,
          admin_approved: false,
          infrastructure_provisioned: false,
          company_access_locked: true,
          next_step: "passport",
          updated_at: new Date().toISOString(),
        }),
      );

      localStorage.setItem(
        "firmic_sonny_handoff",
        JSON.stringify({
          companyId: String(workspace.id),
          from: "checkout",
          to: "hermes",
          status: "payment_confirmed",
          message:
            "Payment confirmed. Sonny is handing the company to Hermes for mandatory compliance verification.",
          createdAt: new Date().toISOString(),
        }),
      );

      localStorage.removeItem(
        "firmic_selected_headquarters",
      );

      await refreshWorkspace();

      setPaymentStage("paid");
      await wait(1100);

      setPaymentStage("handoff");
      await wait(1300);

      await router.replace("/launch");
    } catch (reason) {
      setPaymentStage("checkout");
      setError(
        reason instanceof Error
          ? reason.message
          : "Checkout failed.",
      );
    } finally {
      setActivating(false);
    }
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f3f7f8] p-6 text-[#09233d] lg:p-10">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-[#09233d]/10 bg-white p-8 shadow-[0_20px_60px_rgba(9,35,61,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
            Firmic Launch Engine
          </p>

          <h1 className="mt-3 text-3xl font-black">
            No launch order found.
          </h1>

          <p className="mt-3 text-[#60798b]">
            Return to company configuration so Sonny can
            prepare the activation order.
          </p>

          <button
            type="button"
            onClick={() =>
              void router.push("/configure-office")
            }
            className="mt-6 rounded-2xl bg-[#09233d] px-6 py-4 font-black text-white transition hover:bg-[#0f8f91]"
          >
            Return to Company Configuration
          </button>
        </div>
      </div>
    );
  }

  if (paymentStage !== "checkout") {
    return (
      <PaymentTransition
        stage={paymentStage}
        companyName={
          getActiveWorkspace()?.name ||
          "Your company"
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f7f8] px-5 py-8 text-[#09233d] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1450px]">
        <header className="relative overflow-hidden rounded-[2.2rem] bg-[#09233d] p-7 text-white shadow-[0_26px_80px_rgba(9,35,61,0.2)] sm:p-9">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#20b9b5]/20 blur-3xl" />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.17em] text-[#8de6e2]">
                Sonny · Company Activation
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Review and activate your company.
              </h1>

              <p className="mt-4 max-w-3xl text-lg leading-8 text-white/65">
                I&apos;ve prepared your Firmic subscription,
                headquarters and included infrastructure. After
                payment, I&apos;ll introduce you to Hermes for
                mandatory compliance verification.
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-white/12 bg-white/8 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#20b9b5] font-black text-[#09233d]">
                  S
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8de6e2]">
                    Sonny AI COO
                  </p>
                  <p className="mt-1 font-black">
                    Your launch orchestrator
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-white/60">
                Operational access remains locked until Hermes
                and Firmic Admin approve the compliance package.
              </p>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-7">
            <section className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_18px_55px_rgba(9,35,61,0.06)] sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
                    Launch Package
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Order summary
                  </h2>
                </div>

                {planItem && (
                  <div className="rounded-2xl border border-[#0f8f91]/15 bg-[#0f8f91]/5 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.13em] text-[#0f7779]">
                      Selected Plan
                    </p>
                    <p className="mt-1 font-black">
                      {planItem.name}
                    </p>
                  </div>
                )}
              </div>

              {order.orderType === "upgrade" && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                  Your active subscription and existing services
                  have already been paid. Only newly selected
                  additions are charged today.
                </div>
              )}

              <div className="mt-6 space-y-3">
                {chargeItems.map((item) => (
                  <OrderRow
                    key={item.key}
                    name={item.name}
                    price={item.unitPriceUsd}
                    note={
                      item.billing === "one-time"
                        ? "One-time"
                        : item.category === "plan"
                          ? "Monthly subscription"
                          : "Monthly optional addition"
                    }
                  />
                ))}

                {order.orderType === "upgrade" &&
                  chargeItems.length === 0 && (
                    <p className="text-[#60798b]">
                      No new billable services were selected.
                    </p>
                  )}
              </div>

              {includedItems.length > 0 && (
                <div className="mt-7 border-t border-[#09233d]/10 pt-6">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#0f8f91]">
                    Included with your plan
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {includedItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-[#0f8f91]/15 bg-[#0f8f91]/5 p-4"
                      >
                        <div>
                          <p className="text-sm font-black">
                            {item.name}
                          </p>
                          {item.note && (
                            <p className="mt-1 text-xs text-[#60798b]">
                              {item.note}
                            </p>
                          )}
                        </div>

                        <span className="rounded-full bg-[#dff7ed] px-3 py-1.5 text-xs font-black text-[#08785b]">
                          Included
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_18px_55px_rgba(9,35,61,0.06)] sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
                    Secure Checkout
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Payment method
                  </h2>

                  <p className="mt-2 text-sm text-[#60798b]">
                    Card details are used for this MVP
                    demonstration checkout.
                  </p>
                </div>

                <span className="rounded-full bg-[#eaf5f5] px-4 py-2 text-xs font-black text-[#0f7779]">
                  Secure card
                </span>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field
                  label="Cardholder name"
                  value={cardholderName}
                  onChange={setCardholderName}
                  placeholder="Name on card"
                />

                <Field
                  label="Card number"
                  value={cardNumber}
                  onChange={(value) =>
                    setCardNumber(
                      value
                        .replace(/[^\d ]/g, "")
                        .slice(0, 23),
                    )
                  }
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                />

                <Field
                  label="Expiry"
                  value={expiry}
                  onChange={(value) =>
                    setExpiry(
                      value
                        .replace(/[^\d/]/g, "")
                        .slice(0, 5),
                    )
                  }
                  placeholder="MM/YY"
                  inputMode="numeric"
                />

                <Field
                  label="Security code"
                  value={cvv}
                  onChange={(value) =>
                    setCvv(
                      value
                        .replace(/\D/g, "")
                        .slice(0, 4),
                    )
                  }
                  placeholder="CVV"
                  inputMode="numeric"
                />
              </div>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                MVP demonstration payment: no external payment
                gateway charge is processed yet. The order is
                recorded locally as paid for product testing.
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#d7b865]/30 bg-[#fffaf0] p-6 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8e6c1f]">
                What happens after payment
              </p>

              <h2 className="mt-3 text-2xl font-black">
                Sonny hands your company to Hermes.
              </h2>

              <p className="mt-3 leading-7 text-[#78673c]">
                Hermes will request your passport, trade
                license, incorporation papers, proof of address,
                beneficial-owner information and KYC details.
                Your company, headquarters, AI workforce and
                operating services remain locked until the
                compliance package is approved.
              </p>
            </section>
          </div>

          <aside className="xl:sticky xl:top-8 xl:self-start">
            <div className="rounded-[2rem] bg-[#09233d] p-7 text-white shadow-[0_24px_70px_rgba(9,35,61,0.2)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
                Payment Due
              </p>

              <div className="mt-6 space-y-4">
                <Breakdown
                  label={
                    order.orderType === "upgrade"
                      ? "New additions"
                      : "Monthly subscription"
                  }
                  value={
                    order.orderType === "upgrade"
                      ? amountDueSubtotal
                      : order.monthlySubtotalUsd
                  }
                />

                <Breakdown
                  label={`VAT (${Math.round(
                    order.vatRate * 100,
                  )}%)`}
                  value={amountDueVat}
                />

                {order.orderType !== "upgrade" && (
                  <Breakdown
                    label="Company Launch Fee"
                    value={COMPANY_LAUNCH_FEE_USD}
                    note="One time"
                  />
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="text-sm text-white/50">
                  {order.orderType === "upgrade"
                    ? "Due Today"
                    : "Today's Payment"}
                </p>

                <p className="mt-1 text-4xl font-black">
                  ${amountDue.toFixed(2)}
                </p>

                <p className="mt-1 text-sm font-bold text-white/45">
                  AED {amountDueAed}
                </p>
              </div>

              <div className="mt-6 rounded-2xl bg-white/8 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8de6e2]">
                  Then monthly
                </p>

                <p className="mt-2 text-3xl font-black">
                  ${order.monthlyTotalUsd.toFixed(2)}
                </p>

                <p className="mt-1 text-sm text-white/45">
                  AED {order.monthlyTotalAed}/month
                </p>
              </div>

              {error && (
                <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={completePayment}
                disabled={
                  activating ||
                  (order.orderType === "upgrade" &&
                    amountDue <= 0)
                }
                className="mt-7 w-full rounded-2xl bg-[#20b9b5] px-6 py-4 font-black text-[#09233d] transition hover:-translate-y-0.5 hover:bg-[#38cbc7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activating
                  ? "Processing Payment..."
                  : order.orderType === "upgrade"
                    ? `Pay $${amountDue.toFixed(
                        2,
                      )} & Update Subscription`
                    : `Pay $${amountDue.toFixed(
                        2,
                      )} & Begin Compliance`}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-white/40">
                Payment confirms the subscription. Operational
                access begins only after compliance approval and
                infrastructure provisioning.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PaymentTransition({
  stage,
  companyName,
}: {
  stage: "processing" | "paid" | "handoff";
  companyName: string;
}) {
  const title =
    stage === "processing"
      ? "Processing your company activation."
      : stage === "paid"
        ? "Payment confirmed."
        : "Introducing you to Hermes.";

  const body =
    stage === "processing"
      ? "Sonny is confirming the subscription and reserving your company headquarters."
      : stage === "paid"
        ? `${companyName} is now paid and ready for mandatory compliance verification.`
        : "Hermes will collect and verify the documents required before your company can become operational.";

  const progress =
    stage === "processing"
      ? 35
      : stage === "paid"
        ? 70
        : 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f7f8] px-5 py-10">
      <section className="relative w-full max-w-4xl overflow-hidden rounded-[2.3rem] bg-[#09233d] px-6 py-14 text-center text-white shadow-[0_30px_90px_rgba(9,35,61,0.24)] sm:px-10 lg:px-16 lg:py-20">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#20b9b5]/20 blur-3xl" />

        <div className="relative">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-[#20b9b5] text-3xl font-black text-[#09233d]">
            {stage === "processing"
              ? "S"
              : stage === "paid"
                ? "✓"
                : "H"}
          </div>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[#8de6e2]">
            {stage === "handoff"
              ? "Sonny → Hermes"
              : "Sonny · Launch Engine"}
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            {title}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/65">
            {body}
          </p>

          <div className="mx-auto mt-9 h-2 max-w-xl overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#20b9b5] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-4 text-sm font-bold text-white/45">
            {stage === "processing"
              ? "Confirming payment"
              : stage === "paid"
                ? "Payment complete"
                : "Opening compliance portal"}
          </p>
        </div>
      </section>
    </div>
  );
}

function OrderRow({
  name,
  price,
  note,
}: {
  name: string;
  price: number;
  note: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-[#09233d]/10 bg-[#f8fbfb] p-4">
      <div>
        <p className="font-black">{name}</p>
        <p className="mt-1 text-sm text-[#698296]">
          {note}
        </p>
      </div>

      <p className="shrink-0 font-black">
        ${price.toFixed(2)}
        <span className="ml-1 text-xs font-bold text-[#7b91a0]">
          / AED {toAED(price)}
        </span>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: "numeric";
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#203f57]">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2 w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-4 py-3.5 text-[#09233d] outline-none transition placeholder:text-[#8aa0af] focus:border-[#0f8f91] focus:bg-white focus:ring-4 focus:ring-[#0f8f91]/10"
      />
    </label>
  );
}

function Breakdown({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <div>
        <span className="text-white/50">
          {label}
        </span>
        {note && (
          <p className="mt-1 text-xs text-white/35">
            {note}
          </p>
        )}
      </div>

      <span className="font-black">
        ${value.toFixed(2)}
      </span>
    </div>
  );
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}
