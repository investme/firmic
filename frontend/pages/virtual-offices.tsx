import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { getOffices, rentOffice } from "../services/api";

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
      setError(err.message || "Failed to load offices");
    } finally {
      setLoading(false);
    }
  }

  async function handleRentOffice(officeId: number) {
    try {
      setRentingId(officeId);

      const companyId = localStorage.getItem("company_id");

      if (!companyId) {
        alert("Create or select a company first.");
        return;
      }

      await rentOffice({
        office_id: officeId,
        company_id: companyId,
      });

      alert("Office rented successfully.");

      await loadOffices();
    } catch (err: any) {
      alert(err.message || "Failed to rent office");
    } finally {
      setRentingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Virtual Offices" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Virtual Offices
            </h1>

            <p className="text-slate-500 mt-1">
              Rent a Dubai virtual office and activate business infrastructure.
            </p>
          </div>

          <button
            onClick={loadOffices}
            className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Refresh Offices
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Total Offices" value="1,000" icon="🏢" />
          <Stat
            title="Available"
            value={String(
              offices.filter((office) => office.status === "available").length
            )}
            icon="✅"
          />
          <Stat
            title="Rented"
            value={String(
              offices.filter((office) => office.status === "rented").length
            )}
            icon="🔒"
          />
          <Stat title="Starting Price" value="$99/mo" icon="💰" />
        </section>

        {loading && (
          <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
            Loading offices from backend...
          </div>
        )}

        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 text-red-700 rounded-3xl p-6 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
            {offices.slice(0, 40).map((office) => {
              const available = office.status === "available";
              const isRenting = rentingId === office.id;

              return (
                <div
                  key={office.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                >
                  <div className="h-36 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center text-6xl">
                    🏢
                  </div>

                  <div className="flex justify-between items-start mt-5">
                    <div>
                      <h2 className="text-xl font-bold">
                        Office {office.office_code}
                      </h2>

                      <p className="text-sm text-slate-500 mt-1">
                        {office.location}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        available
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {available ? "Available" : "Rented"}
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
                    <Mini title="Mailbox" value="Ready" />
                    <Mini title="VoIP" value="Ready" />
                    <Mini title="CRM" value="Optional" />
                    <Mini title="AI Staff" value="Available" />
                  </div>

                  <button
                    onClick={() => handleRentOffice(office.id)}
                    disabled={!available || isRenting}
                    className={`w-full mt-5 py-3 rounded-xl font-bold ${
                      available
                        ? "bg-violet-600 text-white"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {isRenting
                      ? "Renting..."
                      : available
                      ? "Rent Office"
                      : "Already Rented"}
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
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

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}