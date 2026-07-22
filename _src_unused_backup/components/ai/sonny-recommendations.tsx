import { Card } from "@/components/ui/card"

export function SonnyRecommendations() {
  const items = [
    "VAT filing due in 8 days",
    "You can reduce costs by 12% by switching provider",
    "2 new accounting proposals available",
    "1 company document requires signature",
  ]

  return (
    <Card className="space-y-3">
      <h3 className="font-medium">Recommendations</h3>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-sm border border-neutral-200 dark:border-neutral-800"
          >
            {item}
          </div>
        ))}
      </div>
    </Card>
  )
}