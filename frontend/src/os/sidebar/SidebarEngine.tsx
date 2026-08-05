import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import { logout } from "../../../services/authApi";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
  type FirmicWorkspace,
} from "../../utils/workspaceContext";
import { NotificationBadge } from "../notifications";

import type {
  SidebarConfig,
  SidebarItemConfig,
  SidebarSectionConfig,
} from "./types";
import { useSidebar } from "./useSidebar";

function routeIsActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function SidebarItem({
  item,
  nested = false,
}: {
  item: SidebarItemConfig;
  nested?: boolean;
}) {
  const router = useRouter();

  const { collapsed, closeMobile, favorites, toggleFavorite } = useSidebar();

  const active = routeIsActive(router.pathname, item.href);

  const favorite = favorites.includes(item.id);

  return (
    <div className="group relative">
      <a
        href={item.href}
        onClick={closeMobile}
        title={collapsed ? item.label : undefined}
        className={[
          "flex items-center rounded-xl text-sm font-semibold transition-all duration-200",
          collapsed
            ? "mx-auto h-11 w-11 justify-center"
            : nested
              ? "ml-3 gap-3 border-l border-slate-800 px-3 py-2.5"
              : "gap-3 px-3 py-2.5",
          active
            ? "border-violet-500 bg-gradient-to-r from-violet-700 to-fuchsia-500 text-white shadow-sm"
            : "text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white",
        ].join(" ")}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
          {item.icon}
        </span>

        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>

            {item.badge === "notifications" && <NotificationBadge />}
          </>
        )}
      </a>

      {!collapsed && (
        <button
          type="button"
          aria-label={
            favorite
              ? `Remove ${item.label} from favorites`
              : `Add ${item.label} to favorites`
          }
          onClick={() => toggleFavorite(item.id)}
          className={[
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 transition",
            favorite
              ? "text-amber-400 opacity-100"
              : "text-slate-600 opacity-0 group-hover:opacity-100",
          ].join(" ")}
        >
          <Star
            className="h-3.5 w-3.5"
            fill={favorite ? "currentColor" : "none"}
          />
        </button>
      )}
    </div>
  );
}

function SidebarSection({ section }: { section: SidebarSectionConfig }) {
  const router = useRouter();

  const { collapsed, expandedSection, toggleSection } = useSidebar();

  const expanded = expandedSection === section.id;

  const containsActiveItem = section.items.some((item) =>
    routeIsActive(router.pathname, item.href),
  );

  if (collapsed) {
    return (
      <section className="mb-5">
        <div className="space-y-2">
          {section.items.map((item) => (
            <SidebarItem key={item.id} item={item} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-3">
      <button
        type="button"
        onClick={() => toggleSection(section.id)}
        aria-expanded={expanded}
        aria-controls={`sidebar-section-${section.id}`}
        className={[
          "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-200",
          expanded
            ? "bg-slate-900 text-slate-200"
            : containsActiveItem
              ? "text-violet-300 hover:bg-slate-900"
              : "text-slate-500 hover:bg-slate-900 hover:text-slate-300",
        ].join(" ")}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          {section.title}
        </span>

        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 transition-transform duration-200",
            expanded ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      <div
        id={`sidebar-section-${section.id}`}
        className={[
          "grid transition-all duration-200 ease-in-out",
          expanded
            ? "mt-2 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="space-y-1.5 pb-1">
            {section.items.map((item) => (
              <SidebarItem key={item.id} item={item} nested />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SidebarEngine({ config }: { config: SidebarConfig }) {
  const router = useRouter();

  const {
    collapsed,
    mobileOpen,
    closeMobile,
    favorites,
    toggleCollapsed,
    openMobile,
    expandSection,
  } = useSidebar();

  const [workspace, setWorkspace] = useState<FirmicWorkspace | null>(null);

  const lastAutomaticallyExpandedPath = useRef<string | null>(null);

  const allItems = useMemo(
    () => config.sections.flatMap((section) => section.items),
    [config.sections],
  );

  const favoriteItems = useMemo(
    () => allItems.filter((item) => favorites.includes(item.id)),
    [allItems, favorites],
  );

  const isAdmin = config.mode === "admin";

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    const refreshWorkspace = () => {
      setWorkspace(getActiveWorkspace());
    };

    refreshWorkspace();

    const eventName = getWorkspaceChangedEventName();

    window.addEventListener(eventName, refreshWorkspace);

    window.addEventListener("storage", refreshWorkspace);

    return () => {
      window.removeEventListener(eventName, refreshWorkspace);

      window.removeEventListener("storage", refreshWorkspace);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (lastAutomaticallyExpandedPath.current === router.pathname) {
      return;
    }

    lastAutomaticallyExpandedPath.current = router.pathname;

    const activeSection = config.sections.find((section) =>
      section.items.some((item) => routeIsActive(router.pathname, item.href)),
    );

    if (activeSection) {
      expandSection(activeSection.id);
    }
  }, [config.sections, expandSection, router.pathname]);

  const sidebarContent = (
    <aside
      className={[
        "flex h-screen flex-col bg-slate-950 text-white transition-[width] duration-300",
        collapsed ? "w-[76px]" : isAdmin ? "w-72" : "w-[280px]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3 border-b border-slate-900 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-lg font-bold">
          ◆
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
              {config.brandEyebrow}
            </p>

            <h1 className="truncate text-xl font-bold">{config.brandTitle}</h1>

            <p className="truncate text-xs text-slate-400">
              {config.brandSubtitle}
            </p>
          </div>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-900 hover:text-white xl:block"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expand sidebar"
          className="mx-auto mt-3 hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-900 hover:text-white xl:block"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div className={`${collapsed ? "px-2" : "px-3"} pb-3 pt-4`}>
        {isAdmin ? (
          <div
            className={[
              "rounded-2xl border border-slate-800 bg-slate-900",
              collapsed ? "p-2" : "p-3",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300">
                <ShieldCheck className="h-5 w-5" />
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                    Current Mode
                  </p>

                  <p className="truncate text-sm font-bold">Firmic Employee</p>

                  <p className="text-[10px] text-green-400">
                    Admin access active
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <a
            href="/companies"
            className={[
              "block rounded-2xl border border-slate-800 bg-slate-900 transition hover:border-slate-700 hover:bg-slate-900/80",
              collapsed ? "p-2" : "p-3",
            ].join(" ")}
          >
            {collapsed ? (
              <div className="flex h-9 w-9 items-center justify-center">🏢</div>
            ) : (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                  Tenant Workspace
                </p>

                <p className="mt-1 truncate text-sm font-bold">
                  {workspace?.name || "Tenant Workspace"}
                </p>

                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {workspace?.plan || "Premium"}
                </p>
              </div>
            )}
          </a>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {favoriteItems.length > 0 && (
          <section className="mb-6">
            {!collapsed && (
              <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">
                Favorites
              </p>
            )}

            <div className="space-y-2">
              {favoriteItems.map((item) => (
                <SidebarItem key={`favorite-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}

        {config.sections.map((section) => (
          <SidebarSection key={section.id} section={section} />
        ))}
      </nav>

      <div className="border-t border-slate-900 p-3">
        {!collapsed && (
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs text-slate-500">Firmic v1.1</p>

            <span
              className={[
                "rounded-full px-2 py-1 text-[10px] font-bold",
                isAdmin
                  ? "bg-violet-500/10 text-violet-300"
                  : "bg-green-500/10 text-green-400",
              ].join(" ")}
            >
              {isAdmin ? "Admin" : "Tenant"}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => logout(isAdmin ? "/admin-login" : "/login")}
          className={[
            "w-full rounded-xl bg-slate-900 font-bold text-white transition hover:bg-red-600",
            collapsed ? "h-11 text-xs" : "py-2.5 text-sm",
          ].join(" ")}
        >
          {collapsed ? "↪" : "Logout"}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <button
        type="button"
        onClick={openMobile}
        aria-label="Open sidebar"
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg xl:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden xl:sticky xl:top-0 xl:block xl:h-screen">
        {sidebarContent}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[130] xl:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={closeMobile}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          <div className="absolute left-0 top-0 h-full">{sidebarContent}</div>

          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close sidebar"
            className="absolute left-[290px] top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
