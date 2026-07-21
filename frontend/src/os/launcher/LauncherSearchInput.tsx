import { LoaderCircle, Search, X } from "lucide-react";
import type { RefObject } from "react";

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onClose: () => void;
};

export function LauncherSearchInput({
  inputRef,
  query,
  loading,
  onQueryChange,
  onClose,
}: Props) {
  return (
    <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-4 sm:px-6">
      <Search className="h-5 w-5 shrink-0 text-violet-600" />

      <input
        ref={inputRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search Firmic or run a command..."
        className="h-16 min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400 sm:text-lg"
      />

      {loading ? (
        <LoaderCircle className="h-5 w-5 animate-spin text-violet-600" />
      ) : null}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close global search"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
      >
        <X className="h-5 w-5" />
      </button>
    </header>
  );
}
