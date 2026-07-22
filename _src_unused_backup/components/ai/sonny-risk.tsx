import { Card } from "@/components/ui/card"

export function SonnyRisk() {
  const risks = [
    {
      level: "High",
      text: "Upcoming compliance deadline in UAE entity",
    },
    {
      level: "Medium",
      text: "Invoice delay detected in accounting provider",
    },
    {
      level: "Low",
      text: "Unused subscription detected",
    },
  ]

  return (
    <Card className="space-y-3">
      <h3 className="font-medium">Risks</h3>

      <div className="space-y-2">
        {risks.map((r, i) => (
          <div
            key={i}
            className="flex justify-between items-center p-3 rounded-lg border border-neutral-200 dark:border-neutral-800"
          >
            <span className="text-sm">{r.text}</span>

            <span
              className={`text-xs px-2 py-1 rounded-md
              ${
                r.level === "High"
                  ? "bg-red-100 text-red-600"
                  : r.level === "Medium"
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-green-100 text-green-600"
              }`}
            >
              {r.level}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}