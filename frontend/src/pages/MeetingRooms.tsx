export default function MeetingRooms() {
  const rooms = [
    { name: "Dubai Room 1", capacity: "4 people", zoom: "Connected", price: "$15/hr" },
    { name: "Dubai Room 2", capacity: "8 people", zoom: "Connected", price: "$25/hr" },
    { name: "Boardroom", capacity: "12 people", zoom: "Connected", price: "$39/hr" },
  ];

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">Meeting Rooms</h1>
      <p className="text-slate-500 mt-1">Book physical meeting rooms with Zoom-ready connections.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        {rooms.map((room) => (
          <div key={room.name} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="h-36 rounded-2xl bg-violet-100 flex items-center justify-center text-5xl">🏛️</div>
            <h2 className="text-xl font-bold mt-5">{room.name}</h2>
            <p className="text-slate-500">{room.capacity}</p>
            <p className="mt-3 font-semibold">Zoom: {room.zoom}</p>
            <p className="mt-1 font-bold">{room.price}</p>

            <button className="mt-5 w-full bg-violet-600 text-white rounded-xl py-3 font-semibold">
              Book Room
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}