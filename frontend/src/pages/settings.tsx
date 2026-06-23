export default function Settings() {
  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="text-slate-500 mt-1">
        Configure your virtual office profile and billing preferences.
      </p>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 mt-8 shadow-sm max-w-3xl">
        <h2 className="text-xl font-bold">Company Profile</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <Input label="Company Name" value="Acme Global FZ-LLC" />
          <Input label="Office ID" value="Office A047" />
          <Input label="Primary Email" value="admin@office-a047.com" />
          <Input label="Phone Number" value="+971 4 XXX 047" />
        </div>

        <button className="mt-6 bg-violet-600 text-white px-5 py-3 rounded-xl font-semibold">
          Save Settings
        </button>
      </div>
    </div>
  );
}

function Input({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-500">{label}</span>
      <input
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        defaultValue={value}
      />
    </label>
  );
}