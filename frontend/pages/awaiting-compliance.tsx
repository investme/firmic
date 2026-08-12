import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  getActiveWorkspace,
} from "../src/utils/workspaceContext";
import {
  readComplianceStatus,
  resolveComplianceAccessState,
} from "../src/utils/complianceAccess";

export default function AwaitingCompliance() {
  const [companyName, setCompanyName] =
    useState("Your company");
  const [status, setStatus] =
    useState<ReturnType<typeof resolveComplianceAccessState>>(
      "under_review",
    );

  useEffect(() => {
    const workspace = getActiveWorkspace();

    if (workspace?.name) {
      setCompanyName(workspace.name);
    }

    setStatus(resolveComplianceAccessState());
  }, []);

  const compliance = readComplianceStatus();

  const submitted =
    status === "under_review" ||
    status === "approved_pending_provisioning";

  const actionRequired =
    status === "action_required";

  return (
    <ProtectedRoute>
      <Head>
        <title>Awaiting Compliance | Firmic</title>
      </Head>

      <main className="min-h-screen bg-[#f3f7f8] px-5 py-8 text-[#09233d] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-[2.3rem] bg-[#09233d] p-7 text-white shadow-[0_28px_80px_rgba(9,35,61,0.18)] sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_330px] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8de6e2]">
                  Firmic · Compliance Gate
                </p>

                <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                  {actionRequired
                    ? "Hermes needs your attention."
                    : "Your company is being prepared."}
                </h1>

                <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">
                  {companyName} has completed payment, but
                  operational access remains securely locked
                  until Firmic completes the mandatory
                  compliance review.
                </p>

                <p className="mt-4 max-w-3xl leading-7 text-white/55">
                  You can continue using Documents and Hermes
                  while your company is under review. Once the
                  package is approved, Sonny will notify you
                  and Firmic will provision your operating
                  workspace.
                </p>
              </div>

              <div className="rounded-[1.8rem] border border-white/12 bg-white/8 p-6">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[#8de6e2]">
                  Expected response
                </p>

                <p className="mt-2 text-3xl font-black">
                  Within 24 hours
                </p>

                <p className="mt-3 text-sm leading-6 text-white/50">
                  Firmic will notify you when your package is
                  approved, requires another document, or needs
                  additional information.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatusCard
              number="01"
              title="Payment"
              value={
                compliance?.subscription_completed
                  ? "Confirmed"
                  : "Pending"
              }
              complete={
                compliance?.subscription_completed === true
              }
            />

            <StatusCard
              number="02"
              title="Documents"
              value={
                submitted
                  ? "Submitted"
                  : actionRequired
                    ? "Action required"
                    : "In progress"
              }
              complete={submitted}
            />

            <StatusCard
              number="03"
              title="Hermes review"
              value={
                submitted ? "In progress" : "Preparing"
              }
              complete={false}
            />

            <StatusCard
              number="04"
              title="Firmic approval"
              value={
                compliance?.admin_approved
                  ? "Approved"
                  : "Pending"
              }
              complete={
                compliance?.admin_approved === true
              }
            />

            <StatusCard
              number="05"
              title="Workspace"
              value={
                compliance?.infrastructure_provisioned
                  ? "Provisioned"
                  : "Locked"
              }
              complete={
                compliance?.infrastructure_provisioned ===
                true
              }
            />
          </section>

          <section className="mt-8 rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_18px_55px_rgba(9,35,61,0.06)] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
                  Limited compliance workspace
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Continue working with Hermes.
                </h2>

                <p className="mt-2 max-w-2xl leading-7 text-[#60798b]">
                  Your operational modules will unlock
                  automatically after compliance approval and
                  infrastructure provisioning.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/documents"
                  className="rounded-2xl bg-[#09233d] px-6 py-4 font-black text-white"
                >
                  Open Documents
                </Link>

                <Link
                  href="/hermes?speak=1"
                  className="rounded-2xl border border-[#0f8f91]/20 bg-[#eefafa] px-6 py-4 font-black text-[#0f7779]"
                >
                  Speak with Hermes
                </Link>

                <Link
                  href="/compliance-review"
                  className="rounded-2xl border border-[#09233d]/10 bg-white px-6 py-4 font-black text-[#49677d]"
                >
                  Compliance Status
                </Link>
              </div>
            </div>
          </section>

          <p className="mt-6 text-center text-sm text-[#7890a1]">
            Command Center, headquarters operations,
            communications, business tools and AI workforce
            remain locked until approval.
          </p>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function StatusCard({
  number,
  title,
  value,
  complete,
}: {
  number: string;
  title: string;
  value: string;
  complete: boolean;
}) {
  return (
    <div className="rounded-[1.6rem] border border-[#09233d]/10 bg-white p-5 shadow-[0_12px_35px_rgba(9,35,61,0.05)]">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black",
          complete
            ? "bg-[#dff7ed] text-[#08785b]"
            : "bg-[#eef3f5] text-[#60798b]",
        ].join(" ")}
      >
        {complete ? "✓" : number}
      </div>

      <p className="mt-4 text-sm font-bold text-[#60798b]">
        {title}
      </p>

      <p className="mt-1 font-black">
        {value}
      </p>
    </div>
  );
}
