export function SonnyHeader() {
  return (
    <div className="flex items-center justify-between">

      <div>
        <h2 className="text-lg font-semibold">
          Sonny AI Briefing
        </h2>

        <p className="text-sm text-neutral-500">
          Your business operating assistant
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-neutral-500">
          Live
        </span>
      </div>

    </div>
  )
}