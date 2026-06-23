import AddonCard from "../components/AddonCard";
import { pricing } from "../data/pricing";

export default function MyOffice() {
  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">My Virtual Office</h1>
      <p className="text-slate-500 mt-1">
        Manage your Dubai office, address, tools, and rental services.
      </p>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 mt-8 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-72 h-48 rounded-2xl bg-violet-100 flex items-center justify-center text-6xl">
            🏢
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Office A047</h2>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                Active
              </span>
            </div>

            <p className="text-slate-500 mt-2">
              Business Bay, Dubai, United Arab Emirates
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Box title="Mailbox" value="Active" />
              <Box title="VoIP Number" value="+971 4 XXX 047" />
              <Box title="Plan" value="Premium Office" />
              <Box title="Zoom" value="Connected" />
              <Box title="CRM" value="Enabled" />
              <Box title="Microsoft 365" value="Enabled" />
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mt-8">Office Add-ons</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-5">
        <AddonCard
          title="Mailbox"
          desc="Receive, scan, archive, and forward business mail."
          price={pricing.mailbox.usd}
          emoji="📬"
        />
        <AddonCard
          title="VoIP Number"
          desc="Dubai business number answered by your AI receptionist."
          price={pricing.voip.usd}
          emoji="☎️"
        />
        <AddonCard
          title="Meeting Rooms"
          desc="Book professional rooms with Zoom-ready setup."
          price={pricing.meetingRooms.usd}
          emoji="🏛️"
        />
        <AddonCard
          title="Zoom Pro"
          desc="Host online client meetings from your virtual office."
          price={pricing.zoom.usd}
          emoji="🎥"
        />
        <AddonCard
          title="CRM Software"
          desc="Manage leads, deals, clients, and follow-ups."
          price={pricing.crm.usd}
          emoji="📊"
        />
        <AddonCard
          title="Microsoft 365"
          desc="Business email, Office apps, calendar, and storage."
          price={pricing.microsoft365.usd}
          emoji="📁"
        />
      </div>
    </div>
  );
}

function Box({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}