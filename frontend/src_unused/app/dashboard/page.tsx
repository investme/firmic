import { AppShell } from "@/components/layout/app-shell"
import { Card } from "@/components/ui/card"
import { SonnyPanel } from "@/components/ai/sonny-panel"

export default function Dashboard() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold mb-6">
        Firmic Dashboard
      </h1>
       {/* HERO */}
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back
          </h1>
          <p className="text-neutral-500">
            Here is your business overview
          </p>
        </div>

        {/* SONNY AI */}
        <SonnyPanel />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-neutral-500">
            Companies
          </div>
          <div className="text-2xl font-bold">12</div>
        </Card>

        <Card>
          <div className="text-sm text-neutral-500">
            Active Services
          </div>
          <div className="text-2xl font-bold">7</div>
        </Card>

        <Card>
          <div className="text-sm text-neutral-500">
            Revenue
          </div>
          <div className="text-2xl font-bold">$2,430</div>
        </Card>
      </div>
    </AppShell>
  )
}