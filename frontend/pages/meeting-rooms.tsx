import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { toAED } from "../src/data/pricing";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import {
  cancelMeetingBooking,
  createMeetingBooking,
  getCompanyMeetingBookings,
} from "../services/meetingBookingApi";

const rooms = [
  { id: 1, name: "Hub71 Focus Room", capacity: 4, price: 25, image: "🏢" },
  { id: 2, name: "Abu Dhabi Client Room", capacity: 8, price: 25, image: "🏛️" },
  { id: 3, name: "Executive Boardroom", capacity: 12, price: 35, image: "💼" },
  { id: 4, name: "Founder Workshop Room", capacity: 20, price: 45, image: "🎓" },
];

type Booking = {
  id: string;
  room_id: number;
  room_name: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  hourly_price_usd: number;
  status: string;
};

export default function MeetingRooms() {
  const [workspace, setWorkspace] = useState(() =>
    getActiveWorkspace()
  );
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());
    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(getWorkspaceChangedEventName(), sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    loadBookings();
  }, [workspace?.id]);

  async function loadBookings() {
    if (!workspace?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getCompanyMeetingBookings(workspace.id);
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load meeting bookings.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmBooking() {
    if (!workspace?.id || !selectedRoom) {
      setError("Select a company and room.");
      return;
    }

    if (!date || !time) {
      setError("Select a date and time.");
      return;
    }

    try {
      setBusy("create");
      setError("");
      setNotice("");

      await createMeetingBooking({
        company_id: workspace.id,
        room_id: selectedRoom.id,
        room_name: selectedRoom.name,
        booking_date: date,
        booking_time: time,
        duration_hours: durationHours,
        hourly_price_usd: selectedRoom.price,
      });

      setNotice("Meeting room booking confirmed.");
      setDate("");
      setTime("");
      setDurationHours(1);
      setSelectedRoom(null);

      await loadBookings();
    } catch (err: any) {
      setError(err?.message || "Booking failed.");
    } finally {
      setBusy("");
    }
  }

  async function cancelBooking(id: string) {
    if (!workspace?.id) return;

    if (!confirm("Cancel this room booking?")) {
      return;
    }

    try {
      setBusy(id);
      setError("");
      setNotice("");

      await cancelMeetingBooking(id, workspace.id);
      setNotice("Meeting room booking cancelled.");

      await loadBookings();
    } catch (err: any) {
      setError(err?.message || "Cancellation failed.");
    } finally {
      setBusy("");
    }
  }

  const headquarters = workspace?.headquarters;
  const hasHeadquarters = Boolean(headquarters?.office_code);
  const companyName = workspace?.name || "Active Company";
  const location =
    headquarters?.location || "No headquarters selected";

  const totalHours = useMemo(
    () =>
      bookings.reduce(
        (sum, booking) =>
          sum + Number(booking.duration_hours || 0),
        0
      ),
    [bookings]
  );

  const totalSpend = useMemo(
    () =>
      bookings.reduce(
        (sum, booking) =>
          sum +
          Number(booking.duration_hours || 0) *
            Number(booking.hourly_price_usd || 0),
        0
      ),
    [bookings]
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Meeting Center
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Meeting rooms for {companyName}.
              </h1>

              <p className="text-slate-500 mt-2">
                Bookings are now stored in PostgreSQL and automatically billed through the Usage Ledger.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3">
              <p className="font-bold">
                From $25/hr · AED {toAED(25)}/hr
              </p>
              <p className="text-xs text-slate-500">
                {location}
              </p>
            </div>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          {notice && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4">
              {notice}
            </div>
          )}

          {!hasHeadquarters && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 text-yellow-700">
              Activate a Headquarters before booking meeting rooms.
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat title="Available Rooms" value="4" icon="🏢" />
            <Stat title="Confirmed Bookings" value={String(bookings.length)} icon="📅" />
            <Stat title="Booked Hours" value={String(totalHours)} icon="⏱️" />
            <Stat title="Usage Subtotal" value={`$${totalSpend.toFixed(2)}`} icon="💰" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm"
                >
                  <div className="h-36 rounded-2xl bg-violet-100 flex items-center justify-center text-6xl">
                    {room.image}
                  </div>

                  <h2 className="text-xl font-bold mt-5">
                    {room.name}
                  </h2>

                  <p className="text-sm text-slate-500 mt-2">
                    Capacity: {room.capacity}
                  </p>

                  <p className="font-bold mt-4">
                    ${room.price}/hr · AED {toAED(room.price)}/hr
                  </p>

                  <button
                    type="button"
                    disabled={!hasHeadquarters}
                    onClick={() => setSelectedRoom(room)}
                    className="w-full mt-5 bg-violet-600 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold"
                  >
                    Book Meeting Room
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Room Booking
                </h2>

                {selectedRoom ? (
                  <div className="space-y-4 mt-6">
                    <div className="bg-violet-50 rounded-2xl p-4 font-bold">
                      {selectedRoom.name}
                    </div>

                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3"
                    />

                    <input
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3"
                    />

                    <select
                      value={durationHours}
                      onChange={(event) =>
                        setDurationHours(
                          Number(event.target.value)
                        )
                      }
                      className="w-full border border-slate-200 rounded-xl p-3"
                    >
                      <option value={1}>1 Hour</option>
                      <option value={2}>2 Hours</option>
                      <option value={4}>4 Hours</option>
                      <option value={8}>8 Hours</option>
                    </select>

                    <button
                      type="button"
                      disabled={busy === "create"}
                      onClick={confirmBooking}
                      className="w-full bg-violet-600 text-white py-4 rounded-xl font-bold disabled:bg-slate-300"
                    >
                      {busy === "create"
                        ? "Booking..."
                        : "Confirm Booking"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-6 text-slate-500">
                    Select a room to start booking.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Manage Bookings
                </h2>

                <div className="space-y-3 mt-5">
                  {loading ? (
                    <p className="text-slate-500">
                      Loading bookings...
                    </p>
                  ) : bookings.length === 0 ? (
                    <p className="text-slate-500">
                      No bookings for this company.
                    </p>
                  ) : (
                    bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="border border-slate-200 rounded-2xl p-4"
                      >
                        <p className="font-bold">
                          {booking.room_name}
                        </p>

                        <p className="text-sm text-slate-500 mt-1">
                          {booking.booking_date} · {booking.booking_time} · {booking.duration_hours} hour(s)
                        </p>

                        <p className="text-sm font-bold mt-2">
                          ${(booking.duration_hours * booking.hourly_price_usd).toFixed(2)}
                        </p>

                        <button
                          type="button"
                          disabled={busy === booking.id}
                          onClick={() => cancelBooking(booking.id)}
                          className="mt-3 border border-red-200 text-red-600 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
                        >
                          {busy === booking.id
                            ? "Cancelling..."
                            : "Cancel Booking"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
