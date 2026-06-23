import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import MyOffice from "./pages/MyOffice";
import AIWorkforce from "./pages/AIWorkforce";
import Mailbox from "./pages/Mailbox";
import VoipCalls from "./pages/VoipCalls";
import MeetingRooms from "./pages/MeetingRooms";
import CRM from "./pages/CRM";
import Microsoft365 from "./pages/Microsoft365";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import LandingPage from "./pages/LandingPage";
import VirtualOffices from "./pages/VirtualOffices";
import ConfigureOffice from "./pages/ConfigureOffice";
import Checkout from "./pages/Checkout";

const pages = [
  "Dashboard",
  "My Office",
  "AI Workforce",
  "Mailbox",
  "VoIP & Calls",
  "Meeting Rooms",
  "CRM",
  "Microsoft 365",
  "Billing",
  "Settings",
  "Landing Page",
  "Virtual Offices",
  "Configure Office",
  "Checkout",
];

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-72 bg-slate-950 text-white p-6 hidden lg:block">
        <h1 className="text-3xl font-bold">Firmic</h1>
        <p className="text-slate-400 text-sm mt-1">
          Virtual Office. AI Workforce.
        </p>

        <nav className="mt-10 space-y-3">
          {pages.map((page) => (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              className={`w-full text-left px-4 py-3 rounded-xl transition ${
                activePage === page
                  ? "bg-violet-600 text-white"
                  : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              {page}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1">
        {activePage === "Dashboard" && <Dashboard />}
        {activePage === "My Office" && <MyOffice />}
        {activePage === "AI Workforce" && <AIWorkforce />}
        {activePage === "Mailbox" && <Mailbox />}
        {activePage === "VoIP & Calls" && <VoipCalls />}
        {activePage === "Meeting Rooms" && <MeetingRooms />}
        {activePage === "CRM" && <CRM />}
        {activePage === "Microsoft 365" && <Microsoft365 />}
        {activePage === "Billing" && <Billing />}
        {activePage === "Settings" && <Settings />}
        {activePage === "Landing Page" && <LandingPage />}
        {activePage === "Virtual Offices" && <VirtualOffices />}
        {activePage === "Configure Office" && <ConfigureOffice />}
        {activePage === "Checkout" && <Checkout />}
      </main>
    </div>
  );
}