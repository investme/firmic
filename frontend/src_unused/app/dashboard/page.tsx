import { AppShell } from "@/components/layout/app-shell"
import { Card } from "@/components/ui/card"
import { SonnyPanel } from "@/components/ai/sonny-panel"

export default function Dashboard() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div className="rounded-2xl border bg-gradient-to-br from-neutral-900 to-neutral-800 p-8 text-white shadow-sm dark:from-neutral-950 dark:to-neutral-900">
          <p className="text-sm text-neutral-300">Firmic Business OS</p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Welcome back, Hussein
          </h1>

          <p className="mt-2 max-w-2xl text-neutral-300">
            Manage companies, documents, workflows, and Sonny AI operations from one command center.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-5">
            <p className="text-sm text-neutral-500">Companies</p>
            <p className="mt-2 text-3xl font-bold">12</p>
            <p className="mt-1 text-xs text-neutral-400">3 added this month</p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-neutral-500">Active Workflows</p>
            <p className="mt-2 text-3xl font-bold">7</p>
            <p className="mt-1 text-xs text-neutral-400">2 waiting for review</p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-neutral-500">Documents</p>
            <p className="mt-2 text-3xl font-bold">34</p>
            <p className="mt-1 text-xs text-neutral-400">8 pending approval</p>
          </Card>

          <Card className="p-5">
            <p className="text-sm text-neutral-500">Revenue</p>
            <p className="mt-2 text-3xl font-bold">$2,430</p>
            <p className="mt-1 text-xs text-neutral-400">Monthly operating revenue</p>
          </Card>
        </div>

        <SonnyPanel />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Operating Overview</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Track the health of every company inside Firmic.
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-medium">Company onboarding</p>
                  <p className="text-sm text-neutral-500">4 companies in progress</p>
                </div>
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-700">
                  Pending
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-medium">Document review</p>
                  <p className="text-sm text-neutral-500">8 documents need action</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                  Review
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-medium">License renewals</p>
                  <p className="text-sm text-neutral-500">2 renewals upcoming</p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                  Active
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">Sonny Activity</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Latest AI operations and business suggestions.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border p-4">
                <p className="font-medium">Suggested workflow</p>
                <p className="text-sm text-neutral-500">
                  Auto-create onboarding tasks when a new company is added.
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="font-medium">Missing documents detected</p>
                <p className="text-sm text-neutral-500">
                  Sonny found companies without trade license files.
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="font-medium">Next upgrade</p>
                <p className="text-sm text-neutral-500">
                  Build the Companies V2 operating page.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}