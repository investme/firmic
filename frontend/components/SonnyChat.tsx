import { useState } from "react";

export default function SonnyChat({ company_id }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  const askSonny = async () => {
    const res = await fetch("http://localhost:8000/api/sonny/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_id,
        question: input
      })
    });

    const data = await res.json();

    setMessages([
      ...messages,
      { role: "user", text: input },
      { role: "sonny", text: data.answer }
    ]);

    setInput("");
  };

  return (
    <div>
      <h3>Sonny Assistant</h3>

      <div>
        {messages.map((m, i) => (
          <p key={i}>
            <b>{m.role}:</b> {m.text}
          </p>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about your company..."
      />

      <button onClick={askSonny}>Ask</button>
    </div>
  );
}