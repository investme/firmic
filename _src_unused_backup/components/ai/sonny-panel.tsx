import { SonnyHeader } from "./sonny-header"
import { SonnyRecommendations } from "./sonny-recommendations"
import { SonnyRisk } from "./sonny-risk"
import { Card } from "@/components/ui/card"

export function SonnyPanel() {
  return (
    <Card className="space-y-6">

      <SonnyHeader />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <SonnyRecommendations />

        <SonnyRisk />

      </div>

    </Card>
  )
}