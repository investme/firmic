import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { pricing, toAED } from "../src/data/pricing";
import ProtectedRoute from "../components/ProtectedRoute";
import { releaseOffice } from "../services/officeApi";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
  updateActiveWorkspace,
} from "../src/utils/workspaceContext";

type Office = {
  id: number;
  office_code: string;
  location?: string;
  status: string;
  monthly_price_usd?: number;
};

const monthlyTotal =
  pricing.officeRental.usd +
  pricing.mailbox.usd +
  pricing.voip.usd +
  25 +
  pricing.zoom.usd +
  pricing.crm.usd +
  pricing.microsoft365.usd +
  423;

export default function MyOffice() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function loadWorkspace() {
      setWorkspace(getActiveWorkspace());
      setLoading(false);
    }

    function handleWorkspaceChange() {
      loadWorkspace();
    }

    loadWorkspace();

    window.addEventListener(
      getWorkspaceChangedEventName(),
      handleWorkspaceChange
    );

    window.addEventListener("storage", handleWorkspaceChange);

    return () => {
      window.removeEventListener(
        getWorkspaceChangedEventName(),
        handleWorkspaceChange
      );
      window.removeEventListener("storage", handleWorkspaceChange);
    };
  }, []);

  async function handleReleaseHeadquarters() {
    const activeWorkspace = getActiveWorkspace();

    if (!activeWorkspace?.id) {
      setError("Select a company before releasing headquarters.");
      return;
    }

    const confirmed = window.confirm(
      `Release Headquarters ${activeWorkspace.headquarters?.office_code || ""}?\n\nThe office will become available again. The company and its history will remain active.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setReleasing(true);
      setError("");
      setNotice("");

      await releaseOffice(activeWorkspace.id);

      const updatedWorkspace = updateActiveWorkspace({
        headquarters: null,
      });

      setWorkspace(updatedWorkspace);
      setNotice("Headquarters released successfully.");
    } catch (err: any) {
      console.error("Failed to release headquarters:", err);
      setError(
        err?.message ||
          "Failed to release headquarters."
      );
    } finally {
      setReleasing(false);

      window.setTimeout(() => {
        setNotice("");
        setError("");
      }, 4000);
    }
  }

  const headquarters = workspace?.headquarters || null;
  const companyName = workspace?.name || "Active Company";
  const officeCode = headquarters?.office_code || "Not Selected";
  const officeLocation =
    headquarters?.location || "No headquarters selected";
  const officePrice =
    headquarters?.monthly_price_usd || pricing.officeRental.usd;
  const officePhone = headquarters?.phone || "+971 2 XXX 047";
  const plan = workspace?.plan || "Premium";
  const hasHeadquarters = Boolean(headquarters?.office_code);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">Head Office</p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                {companyName} headquarters.
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Manage your virtual headquarters, business infrastructure,
                communications, digital mailroom, software stack, and AI
                workforce.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/billing"
                className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
              >
                Upgrade Infrastructure
              </a>

              {hasHeadquarters && (
                <button
                  type="button"
                  onClick={handleReleaseHeadquarters}
                  disabled={releasing}
                  className="border border-red-200 bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {releasing
                    ? "Releasing..."
                    : "Release Headquarters"}
                </button>
              )}
            </div>
          </header>

          {notice && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-bold">
              {notice}
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 font-bold">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
              Loading your headquarters...
            </div>
          )}

          {!loading && !hasHeadquarters && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 shadow-sm text-yellow-700">
              No headquarters activated yet. Choose one from the Office
              Marketplace.
              <div className="mt-4">
                <a
                  href="/virtual-offices"
                  className="inline-block bg-violet-600 text-white px-5 py-3 rounded-xl font-bold"
                >
                  Open Office Marketplace
                </a>
              </div>
            </div>
          )}

          {!loading && hasHeadquarters && (
            <>
              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="w-full lg:w-72 h-48 rounded-3xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center text-7xl">
                    🏢
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-xs font-bold text-violet-700">
                          Premium Hub71 Virtual Headquarters
                        </p>

                        <h2 className="text-3xl font-bold mt-1">
                          Headquarters {officeCode}
                        </h2>

                        <p className="text-slate-500 mt-2">
                          {officeLocation} · Activated May 12, 2026
                        </p>
                      </div>

                      <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold">
                        Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                      <Info
                        title="Office Rental"
                        value={`$${officePrice}/mo · AED ${toAED(
                          officePrice
                        )}/mo`}
                        icon="🏢"
                      />

                      <Info title="Digital Mailroom" value="Active" icon="📬" />
                      <Info
                        title="Business Calls"
                        value={officePhone}
                        icon="☎️"
                      />
                      <Info title="Plan" value={plan} icon="⭐" />
                    </div>

                    <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-bold">AI Workforce Capacity</p>
                          <p className="text-sm text-slate-500">
                            7 of 15 AI employees active
                          </p>
                        </div>

                        <p className="font-bold text-violet-700">47%</p>
                      </div>

                      <div className="h-3 bg-slate-200 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-violet-600 rounded-full w-[47%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-6 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-2xl font-bold">
                  Firmic is the operating system for AI-native companies.
                </h2>

                <p className="text-violet-100 mt-2 max-w-4xl">
                  Launch your company in a day and equip it with headquarters,
                  digital mailroom, business communications, software, billing,
                  documents, and an AI workforce from day one.
                </p>
              </section>

              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mt-8">
                <h2 className="text-xl font-bold">Business Infrastructure</h2>

                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
                  <p className="text-xs text-slate-500">
                    Total Monthly Infrastructure
                  </p>

                  <p className="font-bold">
                    ${monthlyTotal}/mo · AED {toAED(monthlyTotal)}/mo
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-5 mt-5">
                <Service
                  title="Digital Mailroom"
                  desc="Receive, scan, forward, and archive business mail."
                  usd={pricing.mailbox.usd}
                  icon="📬"
                  href="/mailbox"
                  button="Open Mailroom"
                />

                <Service
                  title="Business Calls"
                  desc="Abu Dhabi business number answered by AI receptionist."
                  usd={pricing.voip.usd}
                  icon="☎️"
                  href="/voip-calls"
                  button="Manage Calls"
                />

                <Service
                  title="Meeting Center"
                  desc="Book professional rooms with Zoom support."
                  usd={25}
                  suffix="/hr"
                  icon="🏛️"
                  href="/meeting-rooms"
                  button="Book Room"
                />

                <Service
                  title="Zoom Pro"
                  desc="Zoom access connected through meeting room operations."
                  usd={pricing.zoom.usd}
                  icon="🎥"
                  href="/meeting-rooms"
                  button="Manage Meetings"
                />

                <Service
                  title="Sales Hub"
                  desc="Manage leads, deals, customers, and AI follow-ups."
                  usd={pricing.crm.usd}
                  icon="📊"
                  href="/crm"
                  button="Open Sales Hub"
                />

                <Service
                  title="Microsoft 365"
                  desc="Email, calendar, Office apps, Teams, and storage."
                  usd={pricing.microsoft365.usd}
                  icon="💼"
                  href="/microsoft-365"
                  button="Manage 365"
                />

                <Service
                  title="AI Workforce"
                  desc="Hire AI employees to help operate your company."
                  usd={423}
                  icon="🤖"
                  href="/ai-workforce"
                  button="Open Workforce"
                />

                <Service
                  title="Billing Center"
                  desc="Track subscriptions, usage, invoices, and payments."
                  usd={0}
                  icon="💳"
                  href="/billing"
                  button="Open Billing"
                  free
                />
              </div>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <Panel title="Office Activity">
                  <Activity time="09:42" text="Receptionist AI answered 18 calls" />
                  <Activity time="09:18" text="Mail received at Hub71" />
                  <Activity time="08:51" text="Sales AI created 2 CRM leads" />
                  <Activity time="08:30" text="Meeting room booked for tomorrow" />
                </Panel>

                <Panel title="Office Health">
                  <div className="grid grid-cols-2 gap-4">
                    <Mini title="System Status" value="Operational" />
                    <Mini title="AI Workforce" value="7 Active" />
                    <Mini title="Digital Mailroom" value="2 New" />
                    <Mini title="Business Calls" value="12 Answered" />
                  </div>
                </Panel>
              </section>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Info({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}

function Service({
  title,
  desc,
  usd,
  suffix = "/mo",
  icon,
  href,
  button,
  free = false,
}: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
      <div className="flex-1">
        <div className="text-4xl">{icon}</div>
        <h3 className="font-bold text-lg mt-4">{title}</h3>
        <p className="text-sm text-slate-500 mt-2 min-h-[52px]">{desc}</p>

        <div className="mt-5">
          {free ? (
            <p className="font-bold text-green-700">Included</p>
          ) : (
            <>
              <p className="font-bold">
                {usd} USD{suffix}
              </p>

              <p className="font-bold text-slate-500">
                {toAED(usd)} AED{suffix}
              </p>
            </>
          )}
        </div>
      </div>

      <a
        href={href}
        className="mt-5 block text-center w-full bg-violet-600 text-white rounded-xl py-3 font-bold hover:bg-violet-700 transition"
      >
        {button}
      </a>
    </div>
  );
}

function Panel({ title, children }: any) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function Activity({ text, time }: { text: string; time: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-semibold flex justify-between gap-4">
      <span>{text}</span>
      <span className="text-slate-400 text-sm">{time}</span>
    </div>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}