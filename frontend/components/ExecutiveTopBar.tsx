import { Command, Plus, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { useOS } from "../src/os/useOS";
import { NotificationBell } from "../src/os/notifications";
import { getActiveWorkspace } from "../src/utils/workspaceContext";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function ExecutiveTopBar({ eyebrow, title, description, actions }: Props) {
  const { openCommandPalette } = useOS();
  const workspace = getActiveWorkspace();
  const companyName = workspace?.name || "Tenant Workspace";

  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-sm font-bold text-violet-700">{eyebrow}</p>}
          <h1 className="mt-1 text-3xl font-bold text-slate-950">{title}</h1>
          {description && <p className="mt-2 max-w-4xl text-slate-500">{description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden min-w-[250px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-500 hover:bg-violet-50 lg:flex"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1">Search Firmic...</span>
            <span className="rounded-lg border bg-white px-2 py-1 text-[10px] font-bold text-slate-400">Ctrl K</span>
          </button>

          <button onClick={openCommandPalette} className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white text-slate-600 shadow-sm hover:bg-violet-50">
            <Plus className="h-5 w-5" />
          </button>

          <button onClick={openCommandPalette} className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white text-slate-600 shadow-sm hover:bg-violet-50">
            <Sparkles className="h-5 w-5" />
          </button>

          <NotificationBell />

          <a href="/companies" className="flex items-center gap-3 rounded-2xl border bg-white px-3 py-2 shadow-sm hover:bg-violet-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm font-bold text-white">
              {companyName.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="max-w-[150px] truncate text-xs font-bold">{companyName}</p>
              <p className="text-[10px] text-slate-400">Switch workspace</p>
            </div>
          </a>

          {actions}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
        <Command className="h-3.5 w-3.5" />
        <span>Firmic OS</span><span>•</span><span>{companyName}</span>
      </div>
    </header>
  );
}
