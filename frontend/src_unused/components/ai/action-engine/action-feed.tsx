import { ActionCard } from "./action-card"
import { SonnyAction } from "./action-types"

export function ActionFeed({
  actions,
  setActions,
}: {
  actions: SonnyAction[]
  setActions: (a: SonnyAction[]) => void
}) {
  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <ActionCard
          key={action.id}
          action={action}
          setActions={setActions}
          actions={actions}
        />
      ))}
    </div>
  )
}