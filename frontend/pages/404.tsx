import Head from "next/head";
import Link from "next/link";
import { ArrowLeft, Home, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";

import FirmicSidebar from "../components/FirmicSidebar";
import {
  getActiveWorkspace,
  type FirmicWorkspace,
} from "../src/utils/workspaceContext";

export default function Custom404Page() {
  const [workspace, setWorkspace] = useState<FirmicWorkspace | null>(null);

  useEffect(() => {
    setWorkspace(getActiveWorkspace());
  }, []);

  return (
    <>
      <Head>
        <title>Page Unavailable | Firmic</title>
      </Head>

      <div className="flex min-h-screen bg-slate-50">
        <FirmicSidebar />

        <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-12">
          <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-100 text-4xl">
              ◆
            </div>

            <p className="mt-7 text-sm font-bold uppercase tracking-[0.18em] text-violet-700">
              Firmic
            </p>

            <h1 className="mt-3 text-4xl font-bold text-slate-950 sm:text-5xl">
              This workspace area is not available yet.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600">
              The requested Firmic page has not been activated, may have moved,
              or is still being prepared for{" "}
              <span className="font-bold text-slate-900">
                {workspace?.name || "your company"}
              </span>
              .
            </p>

            <div className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-left">
              <p className="text-sm font-bold text-violet-950">
                Your company workspace is safe.
              </p>

              <p className="mt-2 text-sm leading-6 text-violet-800">
                No company information or progress has been lost. Return to the
                Launch Center or Command Center to continue.
              </p>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>

              <Link
                href="/launch-center"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700"
              >
                <Home className="h-4 w-4" />
                Launch Center
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 font-bold text-violet-700 transition hover:bg-violet-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                Command Center
              </Link>
            </div>

            <p className="mt-8 text-xs text-slate-400">
              Error 404 · Firmic workspace route unavailable
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
