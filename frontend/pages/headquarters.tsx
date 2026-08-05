import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ProtectedRoute from "../components/ProtectedRoute";
import { getOffices } from "../services/officeApi";
import {
  getActiveWorkspace,
} from "../src/utils/workspaceContext";
import {
  getPlanEntitlement,
} from "../src/utils/planEntitlements";

type Office = {
  id: string | number;
  office_code: string;
  location?: string;
  status: string;
  monthly_price_usd?: number;
};

export default function HeadquartersPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(
    () => getActiveWorkspace(),
  );
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedCode, setSelectedCode] =
    useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const plan = useMemo(
    () => getPlanEntitlement(workspace?.plan),
    [workspace?.plan],
  );

  useEffect(() => {
    const currentWorkspace = getActiveWorkspace();
    setWorkspace(currentWorkspace);

    if (!currentWorkspace?.id) {
      router.replace(
        "/login?next=/headquarters",
      );
      return;
    }

    loadOffices();
  }, [router]);

  async function loadOffices() {
    try {
      setLoading(true);
      setError("");

      const response = await getOffices();
      const list = Array.isArray(response)
        ? response
        : response?.offices || [];

      setOffices(
        list.filter(
          (office: Office) =>
            office.status === "available" ||
            office.status === "Available",
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load headquarters.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function selectHeadquarters(
    office: Office,
  ) {
    setSelectedCode(office.office_code);

    const selected = {
      office_id: office.id,
      office_code: office.office_code,
      office_name: `Firmic Headquarters ${office.office_code}`,
      location:
        office.location ||
        "Hub71, Abu Dhabi, United Arab Emirates",
      status: "Reserved for checkout",
      monthly_price_usd: 0,
    };

    localStorage.setItem(
      "firmic_selected_headquarters",
      JSON.stringify(selected),
    );

    await router.push("/configure-office");
  }

  return (
    <ProtectedRoute>
      <Head>
        <title>Choose headquarters | Firmic</title>
      </Head>

      <div className="min-h-screen bg-[#f3f7f8] px-5 py-8 text-[#09233d] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1450px]">
          <header className="rounded-[2rem] bg-[#09233d] p-7 text-white shadow-[0_24px_70px_rgba(9,35,61,0.18)] sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.17em] text-[#8de6e2]">
              Company Launch · Headquarters
            </p>

            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                  Choose your company headquarters.
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-white/65">
                  Choose the operating address for{" "}
                  {workspace?.name || "your company"}.
                  Headquarters is included in every Firmic plan
                  and adds no separate monthly charge.
                </p>
              </div>

              <div className="rounded-2xl border border-white/12 bg-white/8 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8de6e2]">
                  {plan.name}
                </p>
                <p className="mt-1 text-2xl font-black">
                  ${plan.monthlyPriceUsd}/month
                </p>
                <p className="mt-1 text-sm font-bold text-white/55">
                  Headquarters included
                </p>
              </div>
            </div>
          </header>

          {loading && (
            <div className="mt-8 rounded-[2rem] border border-[#09233d]/10 bg-white p-8 font-bold">
              Loading available headquarters...
            </div>
          )}

          {error && (
            <div className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {offices.map((office, index) => {
                const selected =
                  selectedCode === office.office_code;

                return (
                  <article
                    key={office.office_code}
                    className={[
                      "overflow-hidden rounded-[2rem] border bg-white shadow-[0_18px_55px_rgba(9,35,61,0.07)] transition",
                      selected
                        ? "border-[#0f8f91] ring-4 ring-[#0f8f91]/10"
                        : "border-[#09233d]/10",
                    ].join(" ")}
                  >
                    <div className="relative bg-[#09233d] p-7 text-white">
                      {index === 0 && (
                        <span className="absolute right-5 top-5 rounded-full bg-[#20b9b5] px-3 py-1.5 text-xs font-black text-[#09233d]">
                          Recommended
                        </span>
                      )}

                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
                        Firmic Headquarters
                      </p>
                      <h2 className="mt-4 text-4xl font-black">
                        {office.office_code}
                      </h2>
                      <p className="mt-2 text-white/60">
                        {office.location ||
                          "Hub71 · Abu Dhabi"}
                      </p>
                    </div>

                    <div className="p-7">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-black text-[#0f7779]">
                          Premium Virtual Headquarters
                        </p>
                        <span className="rounded-full bg-[#dff7ed] px-3 py-1.5 text-xs font-black text-[#08785b]">
                          Available
                        </span>
                      </div>

                      <h3 className="mt-4 text-2xl font-black">
                        Headquarters {office.office_code}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-[#60798b]">
                        {office.location ||
                          "Hub71, Abu Dhabi, United Arab Emirates"}
                      </p>

                      <div className="mt-6 rounded-[1.4rem] border border-[#0f8f91]/15 bg-[#0f8f91]/5 p-5">
                        <p className="text-sm font-bold text-[#60798b]">
                          Monthly headquarters cost
                        </p>
                        <p className="mt-2 text-2xl font-black">
                          Included
                        </p>
                        <p className="mt-1 text-sm font-black text-[#0f8f91]">
                          $0 additional · Included with {plan.name}
                        </p>
                      </div>

                      <div className="mt-6 space-y-3 text-sm font-bold text-[#405d72]">
                        <Feature text="Company headquarters address" />
                        <Feature text="Digital mailroom compatibility" />
                        <Feature text="Business communications ready" />
                        <Feature text="AI workforce and Customer Hub access" />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          selectHeadquarters(office)
                        }
                        className="mt-7 w-full rounded-2xl bg-[#09233d] px-6 py-4 font-black text-white transition hover:-translate-y-0.5 hover:bg-[#0f8f91]"
                      >
                        Choose {office.office_code} →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0f8f91]/10 text-xs font-black text-[#0f8f91]">
        ✓
      </span>
      <span>{text}</span>
    </div>
  );
}
