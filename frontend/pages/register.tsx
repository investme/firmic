import { useState } from "react";
import { registerUser } from "../services/authApi";

export default function Register() {
  const [fullName, setFullName] = useState("Hussein Matar");
  const [email, setEmail] = useState("hussein@firmic.io");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    try {
      setLoading(true);

      await registerUser({
        full_name: fullName,
        email,
        password,
      });

      window.location.href = "/dashboard";
    } catch (err: any) {
      alert(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-2xl">
            ◆
          </div>

          <h1 className="text-3xl font-bold mt-5">Create Firmic Account</h1>

          <p className="text-slate-500 mt-2">
            Start building your AI-native business infrastructure.
          </p>
        </div>

        <div className="space-y-5 mt-8">
          <div>
            <label className="text-sm font-semibold">Full Name</label>
            <input
              className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Email</label>
            <input
              className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@firmic.io"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Password</label>
            <input
              type="password"
              className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading || !fullName || !email || !password}
            className="w-full bg-violet-600 text-white py-4 rounded-xl font-bold disabled:bg-slate-300"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <a href="/login" className="text-violet-700 font-bold">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}