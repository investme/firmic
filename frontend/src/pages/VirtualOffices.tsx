import { useEffect, useState } from "react";
import FirmicSidebar from "../../components/FirmicSidebar";
import { getOffices, rentOffice } from "../../services/officeApi";
import ProtectedRoute from "../../components/ProtectedRoute";
import {
  getActiveWorkspace,
  setActiveHeadquarters,
} from "../utils/workspaceContext";

type Office = {
  id: number;
  office_code: string;
  location: string;
  status: string;
  monthly_price_usd: number;
};

function toAED(usd: number) {
  return Math.round(usd * 3.67);
}

export default function VirtualOffices() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [rentingId, setRentingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOffices();
  }, []);

  async function loadOffices() {
    try {
      setLoading(true);
      setError("");

      const data = await getOffices();
      setOffices(data);
    } catch (err: any) {
      setError(err.message || "Failed to load headquarters.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRentOffice(officeId: number) {
    try {
      setRentingId(officeId);

      const workspace = getActiveWorkspace();

      if (!workspace?.id) {
        alert("Create or select a company first.");
        return;
      }

      const companyId = workspace.id;

      const selectedOffice = offices.find((office) => office.id === officeId);

      if (!selectedOffice) {
        alert("Headquarters not found.");
        return;
      }

      await rentOffice({
        office_code: selectedOffice.office_code,
        company_id: companyId,
      });

      setActiveHeadquarters({
      office_id: selectedOffice.id,
      office_code: selectedOffice.office_code,
      office_name: "Premium Hub71 Virtual Headquarters",
      location: selectedOffice.location || "Hub71, Abu Dhabi, United Arab Emirates",
      phone: "+971 2 XXX 047",
      mailbox: true,
      status: "Active",
      monthly_price_usd: selectedOffice.monthly_price_usd || 99,
    });

      alert(
        "Headquarters activated successfully. Your company now has access to Firmic business infrastructure."
      );

      await loadOffices();
    } catch (err: any) {
      alert(err.message || "Failed to activate headquarters.");
    } finally {
      setRentingId(null);
    }
  }

  const availableOffices = offices
    .filter((office) => office.status === "available")
    .slice(0, 40);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Office Marketplace
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Select your company headquarters.
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Choose your headquarters in Hub71, Abu Dhabi and activate
                Firmic’s business infrastructure, digital mailroom, business
                communications, CRM, and AI workforce.
              </p>
            </div>

            <button
              onClick={loadOffices}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
            >
              Refresh Marketplace
            </button>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Available Headquarters"
              value={String(availableOffices.length)}
              icon="🏢"
            />

            <Stat
              title="Ready to Activate"
              value={String(
                offices.filter((office) => office.status === "available").length
              )}
              icon="✅"
            />

            <Stat
              title="Active Companies"
              value={String(
                offices.filter((office) => office.status === "rented").length
              )}
              icon="🔒"
            />

            <Stat title="Starting From" value="$99/mo" icon="💰" />
          </section>

          {loading && (
            <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
              Loading headquarters from backend...
            </div>
          )}

          {error && (
            <div className="mt-8 bg-red-50 border border-red-200 text-red-700 rounded-3xl p-6 shadow-sm">
              {error}
            </div>
          )}

          {!loading && !error && (
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
              {availableOffices.map((office) => {
                const isRenting = rentingId === office.id;

                return (
                  <div
                    key={office.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-full"
                  >
                    <div className="h-36 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center text-6xl">
                      🏢
                    </div>

                    <div className="flex justify-between items-start mt-5">
                      <div>
                        <p className="text-xs font-bold text-violet-700">
                          Premium Headquarters
                        </p>

                        <h2 className="text-xl font-bold mt-1">
                          Headquarters {office.office_code}
                        </h2>

                        <p className="text-sm text-slate-500 mt-1">
                          Hub71, Abu Dhabi, United Arab Emirates
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        Available
                      </span>
                    </div>

                    <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <p className="text-sm text-slate-500">Monthly Rental</p>

                      <p className="font-bold">
                        ${office.monthly_price_usd}/mo
                      </p>

                      <p className="font-bold text-slate-500">
                        AED {toAED(office.monthly_price_usd)}/mo
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
                      <Mini title="Digital Mailroom" value="Ready" href="/mailbox" />
                      <Mini title="Business Calls" value="Ready" href="/voip-calls" />
                      <Mini title="Sales Hub" value="Optional" href="/crm" />
                      <Mini
                        title="AI Workforce"
                        value="Available"
                        href="/ai-workforce"
                      />
                    </div>

                    <div className="mt-5 flex-1">
                      <ul className="text-sm text-slate-600 space-y-2">
                        <li>✓ Abu Dhabi business address</li>
                        <li>✓ Mailbox and forwarding ready</li>
                        <li>✓ VoIP and communications ready</li>
                        <li>✓ AI workforce compatible</li>
                      </ul>
                    </div>

                    <button
                      onClick={() => handleRentOffice(office.id)}
                      disabled={isRenting}
                      className="w-full mt-5 py-3 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-700 transition disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {isRenting ? "Activating..." : "Activate Headquarters"}
                    </button>
                  </div>
                );
              })}
            </section>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Mini({
  title,
  value,
  href,
}: {
  title: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="bg-white border border-slate-200 rounded-2xl p-3 text-center hover:border-violet-400 hover:bg-violet-50 transition"
    >
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold text-sm">{value}</p>
    </a>
  );
}