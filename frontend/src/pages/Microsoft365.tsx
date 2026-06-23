export default function Microsoft365() {
  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">Microsoft 365</h1>
      <p className="text-slate-500 mt-1">Business email, calendar, documents, and storage for your virtual office.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
        <Card title="Business Email" value="admin@office-a047.com" emoji="📧" />
        <Card title="Calendar" value="Connected" emoji="📅" />
        <Card title="OneDrive" value="1TB Storage" emoji="☁️" />
        <Card title="Office Apps" value="Word, Excel, PowerPoint" emoji="📁" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 mt-8 shadow-sm">
        <h2 className="text-xl font-bold">Active Users</h2>

        <div className="mt-5 space-y-3">
          {["Founder", "Receptionist AI", "Sales AI", "Support AI"].map((user) => (
            <div key={user} className="flex justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="font-bold">{user}</p>
              <p className="text-green-700 font-semibold">Active</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, emoji }: { title: string; value: string; emoji: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="text-3xl">{emoji}</div>
      <p className="text-slate-500 text-sm mt-3">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}