"use client"

import { useState } from "react"
import { ActionFeed } from "./action-feed"
import { SonnyAction } from "./action-types"

export function SonnyActionEngine() {
  const [actions, setActions] = useState<SonnyAction[]>([
    {
      id: "1",
      type: "COMPLIANCE_ALERT",
      title: "VAT Filing Required",
      description:
        "UAE VAT filing is due in 8 days. Recommend preparation.",
      priority: "high",
      status: "pending",
      createdAt: new Date(),
    },
    {
      id: "2",
      type: "OPTIMIZATION_SUGGESTION",
      title: "Reduce Monthly Costs",
      description:
        "Alternative accounting provider can save ~12% monthly.",
      priority: "medium",
      status: "pending",
      createdAt: new Date(),
    },
  ])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Sonny Action Engine
      </h2>

      <ActionFeed actions={actions} setActions={setActions} />
    </div>
  )
}