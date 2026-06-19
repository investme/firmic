import { useState } from "react";
import { createCompany } from "../services/api";

export default function CreateCompany() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const res = await createCompany({
        name,
        user_id: "demo-user",
      });

      console.log("CREATE COMPANY RESPONSE:", res);

      const companyId = res?.company?.id || res?.id;

      if (!companyId) {
        alert("Backend returned no company ID. Check console.");
        return;
      }

      localStorage.setItem("company_id", companyId);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("CREATE COMPANY ERROR:", err);
      alert("Failed to create company. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 w-full max-w-xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          Create Your Company
        </h1>

        <input
          className="w-full border border-slate-300 rounded-xl px-5 py-4 text-lg mb-5"
          placeholder="Company Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !name}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Company"}
        </button>
      </div>
    </div>
  );
}