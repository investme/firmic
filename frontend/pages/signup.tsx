import { useState } from "react";

export default function Signup() {
  const [form, setForm] = useState({ email: "", password: "" });

  const register = async () => {
    await fetch("http://localhost:8000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    alert("User created");
  };

  return (
    <div>
      <h1>Sign Up</h1>

      <input
        placeholder="Email"
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <button onClick={register}>Create Account</button>
    </div>
  );
}