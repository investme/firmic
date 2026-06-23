import { useEffect, useState } from "react";
import { money } from "../data/pricing";
import { getOffices, rentOffice } from "../services/api";

type Office = {
  id?: number;
  office_code?: string;
  code?: string;
  location: string;
  status: string;
  monthly_price_usd?: number;
  price?: number;
};

export default function VirtualOffices() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [renting, setRenting] = useState<string | null>(null);

  useEffect(() => {
    loadOffices();
  }, []);

  const loadOffices = async () => {
    try {
      const data = await getOffices();
      setOffices(data);
    } catch (error) {
      console.error("Failed loading offices", error);

      // fallback demo data
      setOffices([
        {
          office_code: "A001",
          location: "Business Bay, Dubai",
          status: "available",
          monthly_price_usd: 99,
        },
        {
          office_code: "A002",
          location: "Business Bay, Dubai",
          status: "available",
          monthly_price_usd: 99,
        },
        {
          office_code: "A003",
          location: "Business Bay, Dubai",
          status: "rented",
          monthly_price_usd: 99,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRent = async (officeCode: string) => {
    try {
      setRenting(officeCode);

      await rentOffice(officeCode);

      alert(`Office ${officeCode} rented successfully`);

      await loadOffices();
    } catch (error) {
      console.error(error);
      alert("Failed to rent office");
    } finally {
      setRenting(null);
    }
  };

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      {/* Header */}

      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            Virtual Offices
          </h1>

          <p className="text-slate-500 mt-2">
            Rent a Dubai virtual office and activate your AI workforce.
          </p>
        </div>

        <button className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-semibold">
          Rent Best Available
        </button>
      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">
        <StatCard
          title="Total Offices"
          value="1,000"
          sub="Dubai Inventory"
          icon="🏢"
        />

        <StatCard
          title="Available"
          value="876"
          sub="Ready To Rent"
          icon="✅"
        />

        <StatCard
          title="Rented"
          value="124"
          sub="Active Customers"
          icon="📈"
        />

        <StatCard
          title="Starting Price"
          value="$99"
          sub="AED 363/mo"
          icon="💰"
        />
      </div>

      {/* Loading */}

      {loading && (
        <div className="mt-10 bg-white rounded-3xl p-8 border border-slate-200">
          Loading offices...
        </div>
      )}

      {/* Offices */}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-10">
          {offices.map((office) => {
            const officeCode =
              office.office_code || office.code || "A000";

            const monthlyPrice =
              office.monthly_price_usd || office.price || 99;

            const available =
              office.status?.toLowerCase() === "available";

            return (
              <div
                key={officeCode}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="h-40 bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-6xl">
                  🏢
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">
                      Office {officeCode}
                    </h2>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        available
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {available ? "Available" : "Rented"}
                    </span>
                  </div>

                  <p className="text-slate-500 mt-3">
                    {office.location}
                  </p>

                  <div className="mt-5 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Mailbox</span>
                      <span>Included</span>
                    </div>

                    <div className="flex justify-between">
                      <span>VoIP Ready</span>
                      <span>Included</span>
                    </div>

                    <div className="flex justify-between">
                      <span>AI Workforce</span>
                      <span>Available</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-slate-500 text-sm">
                      Starting Price
                    </p>

                    <h3 className="text-2xl font-bold">
                      {money(monthlyPrice)}
                    </h3>

                    <p className="text-xs text-slate-400">
                      per month
                    </p>
                  </div>

                  <button
                    disabled={!available || renting === officeCode}
                    onClick={() => handleRent(officeCode)}
                    className={`mt-6 w-full rounded-xl py-3 font-semibold transition ${
                      available
                        ? "bg-violet-600 hover:bg-violet-700 text-white"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {renting === officeCode
                      ? "Processing..."
                      : available
                      ? "Rent Office"
                      : "Unavailable"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="text-4xl">{icon}</div>

      <p className="text-slate-500 text-sm mt-3">
        {title}
      </p>

      <h3 className="text-3xl font-bold mt-1">
        {value}
      </h3>

      <p className="text-slate-400 text-sm">
        {sub}
      </p>
    </div>
  );
}