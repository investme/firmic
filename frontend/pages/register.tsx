import { useState } from "react";
import { registerUser } from "../services/authApi";
import { clearActiveWorkspace } from "../src/utils/workspaceContext";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) return setError("Enter your full name.");
    if (!cleanEmail) return setError("Enter your email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    try {
      setLoading(true);
      setError("");
      clearActiveWorkspace();

      const result = await registerUser({
        full_name: cleanName,
        email: cleanEmail,
        password,
      });

      if (String(result.user?.role || "").toLowerCase() === "admin") {
        throw new Error("Administrator accounts cannot be created from Tenant Registration.");
      }

      window.location.href = "/create-company";
    } catch (err: any) {
      setError(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !loading) handleRegister();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 py-10">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-2xl">◆</div>
          <h1 className="text-3xl font-bold mt-5">Create Firmic Account</h1>
          <p className="text-slate-500 mt-2">Create a private Tenant account and launch your company workspace.</p>
        </div>

        <div className="space-y-5 mt-8">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">{error}</div>}

          <Field label="Full Name" value={fullName} onChange={setFullName} onKeyDown={handleKeyDown} placeholder="Your full name" autoComplete="name" />
          <Field label="Email" type="email" value={email} onChange={setEmail} onKeyDown={handleKeyDown} placeholder="you@company.com" autoComplete="email" />
          <Field label="Password" type="password" value={password} onChange={setPassword} onKeyDown={handleKeyDown} placeholder="Minimum 8 characters" autoComplete="new-password" />
          <Field label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} onKeyDown={handleKeyDown} placeholder="Repeat your password" autoComplete="new-password" />

          <button
            type="button"
            onClick={handleRegister}
            disabled={loading || !fullName.trim() || !email.trim() || !password || !confirmPassword}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-xl font-bold disabled:bg-slate-300 transition"
          >
            {loading ? "Creating account..." : "Create Tenant Account"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account? <a href="/login" className="text-violet-700 font-bold">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  onKeyDown,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <input
        type={type}
        className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}
