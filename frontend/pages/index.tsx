import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mx-auto" />

        <p className="mt-5 text-slate-400 font-medium">
          Opening Firmic...
        </p>
      </div>
    </div>
  );
}