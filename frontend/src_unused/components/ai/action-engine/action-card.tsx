import { SonnyAction } from "./action-types"

export function ActionCard({
  action,
  actions,
  setActions,
}: {
  action: SonnyAction
  actions: SonnyAction[]
  setActions: (a: SonnyAction[]) => void
}) {
  const approveAction = () => {
    const updated = actions.map((a) =>
      a.id === action.id
        ? { ...a, status: "approved" }
        : a
    )
    setActions(updated)
  }

  const executeAction = () => {
    const updated = actions.map((a) =>
      a.id === action.id
        ? { ...a, status: "executed" }
        : a
    )
    setActions(updated)
  }

  return (
    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{action.title}</h3>

        <span
          className={`text-xs px-2 py-1 rounded-md
          ${
            action.priority === "high"
              ? "bg-red-100 text-red-600"
              : action.priority === "medium"
              ? "bg-yellow-100 text-yellow-600"
              : "bg-green-100 text-green-600"
          }`}
        >
          {action.priority}
        </span>
      </div>

      {/* DESCRIPTION */}
      <p className="text-sm text-neutral-500">
        {action.description}
      </p>

      {/* STATUS */}
      <div className="text-xs opacity-60">
        Status: {action.status}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-2 pt-2">

        <button
          onClick={approveAction}
          className="px-3 py-1 text-xs rounded-md bg-neutral-100 dark:bg-neutral-800"
        >
          Approve
        </button>

        <button
          onClick={executeAction}
          className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white"
        >
          Execute
        </button>

      </div>
    </div>
  )
}