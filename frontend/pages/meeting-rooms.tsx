import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { toAED } from "../src/data/pricing";
import ProtectedRoute from "../components/ProtectedRoute";

const rooms = [
  {
    id: 1,
    name: "Business Bay Room A",
    capacity: 4,
    zoom: true,
    price: 25,
    image: "🏢",
  },
  {
    id: 2,
    name: "Business Bay Room B",
    capacity: 8,
    zoom: true,
    price: 25,
    image: "🏛️",
  },
  {
    id: 3,
    name: "Executive Boardroom",
    capacity: 12,
    zoom: true,
    price: 35,
    image: "💼",
  },
  {
    id: 4,
    name: "Training Room",
    capacity: 20,
    zoom: true,
    price: 45,
    image: "🎓",
  },
];

export default function MeetingRooms() {
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Meeting Rooms" />

      <main className="flex-1 p-6 xl:p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Meeting Rooms</h1>

            <p className="text-slate-500 mt-1">
              Book professional meeting rooms with Zoom connectivity.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
            <p className="text-sm text-slate-500">Starting From</p>

            <p className="font-bold">$25/hr · AED {toAED(25)}/hr</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <StatCard title="Available Rooms" value="4" icon="🏢" />
          <StatCard title="Zoom Enabled" value="100%" icon="🎥" />
          <StatCard title="Starting Price" value="$25/hr" icon="💰" />
          <StatCard title="Business Bay" value="Dubai" icon="📍" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 mt-8">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm"
                >
                  <div className="h-36 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center text-6xl">
                    {room.image}
                  </div>

                  <h2 className="text-xl font-bold mt-5">{room.name}</h2>

                  <div className="space-y-2 mt-4 text-sm">
                    <p>👥 Capacity: {room.capacity}</p>
                    <p>🎥 Zoom Included</p>
                    <p>📍 Business Bay, Dubai</p>
                  </div>

                  <div className="mt-5">
                    <p className="font-bold text-xl">${room.price}/hr</p>

                    <p className="text-slate-500 font-semibold">
                      AED {toAED(room.price)}/hr
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedRoom(room)}
                    className="w-full mt-5 bg-violet-600 text-white py-3 rounded-xl font-bold"
                  >
                    Book Room
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm h-fit">
            <h2 className="text-xl font-bold">Room Booking</h2>

            {!selectedRoom ? (
              <div className="mt-6 text-slate-500">
                Select a room to start booking.
              </div>
            ) : (
              <>
                <div className="mt-6 bg-violet-50 rounded-2xl p-4">
                  <p className="font-bold">{selectedRoom.name}</p>

                  <p className="text-sm text-slate-500 mt-1">
                    Capacity {selectedRoom.capacity}
                  </p>
                </div>

                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-sm font-semibold">Date</label>

                    <input
                      type="date"
                      className="w-full mt-2 border rounded-xl p-3"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Time</label>

                    <input
                      type="time"
                      className="w-full mt-2 border rounded-xl p-3"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      Duration (Hours)
                    </label>

                    <select className="w-full mt-2 border rounded-xl p-3">
                      <option>1 Hour</option>
                      <option>2 Hours</option>
                      <option>4 Hours</option>
                      <option>8 Hours</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="font-semibold">Zoom Included</p>

                    <p className="text-sm text-slate-500 mt-1">
                      Meeting link automatically generated.
                    </p>
                  </div>

                  <button className="w-full bg-violet-600 text-white py-4 rounded-xl font-bold">
                    Confirm Booking
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>

      <p className="text-sm text-slate-500 mt-3">{title}</p>

      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}