import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { createCompany } from "../services/companyApi";
import ProtectedRoute from "../components/ProtectedRoute";
import { saveActiveWorkspace } from "../src/utils/workspaceContext";


export default function CreateCompany() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [jurisdiction, setJurisdiction] = useState("Abu Dhabi");
  const [plan, setPlan] = useState("Premium");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    try {
      if (!name.trim()) {
        alert("Company name is required.");
        return;
      }

      setLoading(true);

      const res = await createCompany({
        name,
      });

      const companyId = res?.company?.id || res?.id;

      if (!companyId) {
        alert("Backend returned no company ID. Check console.");
        console.log("CREATE COMPANY RESPONSE:", res);
        return;
      }

      const savedWorkspace = saveActiveWorkspace({
        id: String(companyId),
        name: res?.company?.name || name.trim(),
        industry,
        jurisdiction,
        plan,
        status: res?.company?.status || "initiated",
        headquarters: null,
      });

      if (!savedWorkspace) {
        throw new Error(
          "The company was created, but the workspace could not be activated."
        );
      }

      window.location.href = `/company?id=${companyId}`;
    } catch (err) {
      console.error("CREATE COMPANY ERROR:", err);
      alert("Failed to create company. Check console.");
    } finally {
      setLoading(false);
    }
  }

  return (
     <ProtectedRoute>
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Create Company
            </h1>

            <p className="text-slate-500 mt-1">
              Launch a new company workspace with Firmic infrastructure,
              Sonny AI, Hermes compliance, and virtual office readiness.
            </p>
          </div>

          <a
            href="/companies"
            className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold"
          >
            View Companies
          </a>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold">Company Setup</h2>

            <div className="space-y-5 mt-6">
              <div>
                <label className="text-sm font-semibold">Company Name</label>
                <input
                  className="w-full mt-2 border border-slate-200 rounded-xl px-5 py-4 outline-none focus:border-violet-500"
                  placeholder="Example: C50 Labs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full mt-2 border border-slate-200 rounded-xl px-5 py-4 outline-none focus:border-violet-500"
                >
                  <option>Technology</option>
                  <option>AI</option>
                  <option>Fintech</option>
                  <option>Consulting</option>
                  <option>Real Estate</option>
                  <option>E-commerce</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
               <label className="text-sm font-semibold">Select Jurisdiction</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full mt-2 border border-slate-200 rounded-xl px-5 py-4 outline-none focus:border-violet-500"
              >
                <option value="Abu Dhabi">🇦🇪 Abu Dhabi</option>
                <option value="Dubai">🇦🇪 Dubai</option>
                <option value="Ras Al Khaimah">🇦🇪 Ras Al Khaimah</option>
                <option value="UAE Mainland">🇦🇪 UAE Mainland</option>
                <option value="Qatar">🇶🇦 Qatar</option>
                <option value="Saudi Arabia" disabled>
                  🇸🇦 Saudi Arabia (Coming Soon)
                </option>
                <option value="Bahrain" disabled>
                  🇧🇭 Bahrain (Coming Soon)
                </option>
                <option value="Oman" disabled>
                  🇴🇲 Oman (Coming Soon)
                </option>
                <option value="Singapore" disabled>
                  🇸🇬 Singapore (Coming Soon)
                </option>
                <option value="United Kingdom" disabled>
                  🇬🇧 United Kingdom (Coming Soon)
                </option>
                <option value="United States" disabled>
                  🇺🇸 United States (Coming Soon)
                </option>
              </select>
            </div>

              <div>
                <label className="text-sm font-semibold">Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full mt-2 border border-slate-200 rounded-xl px-5 py-4 outline-none focus:border-violet-500"
                >
                  <option>Starter</option>
                  <option>Premium</option>
                  <option>Enterprise</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className="w-full bg-violet-600 text-white py-4 rounded-xl font-bold disabled:bg-slate-300 disabled:text-slate-500"
              >
                {loading ? "Creating Company..." : "Create Company"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Firmic Launch Stack</h2>

              <p className="text-violet-100 text-sm mt-2">
                Every company workspace can connect to a virtual office, AI
                workforce, communications, documents, Sonny, Hermes, and reports.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="Office" value="Ready" />
                <Mini title="Sonny" value="Included" />
                <Mini title="Hermes" value="Monitoring" />
                <Mini title="Reports" value="Enabled" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">After Creation</h2>

              <div className="space-y-3 mt-5">
                <Step text="Company workspace is created" />
                <Step text="Company ID is saved as active company" />
                <Step text="You are redirected to Company Control Center" />
                <Step text="Next step: rent a virtual office" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Recommended Setup</h2>

              <div className="space-y-3 mt-5">
                <Step text="Upload Trade License" />
                <Step text="Activate Virtual Office" />
                <Step text="Hire AI Workforce" />
                <Step text="Enable Hermes Compliance" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
    </ProtectedRoute>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-lg">{value}</p>
    </div>
  );
}

function Step({ text }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-semibold">
      {text}
    </div>
  );
}