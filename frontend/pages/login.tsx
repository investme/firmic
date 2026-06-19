import { useState } from "react";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });

  const login = async () => {
    const res = await fetch("http://localhost:8000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const data = await res.json();

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user_id", data.user_id);

    alert("Logged in");
  };

  return (
    <div>
      <h1>Login</h1>

      <input
        placeholder="Email"
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <button onClick={login}>Login</button>
    </div>
  );
}