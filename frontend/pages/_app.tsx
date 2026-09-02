import type { AppProps } from "next/app";
import { useRouter } from "next/router";

import "../styles/globals.css";

import { WorkspaceProvider } from "../src/context/WorkspaceProvider";
import { OSProvider } from "../src/os/OSProvider";
import { FirmicActionSystem } from "../src/os/actions";
import {
  ActionEventBridge,
  FirmicEventSystem,
} from "../src/os/events";
import { FirmicNotificationSystem } from "../src/os/notifications";
import { SidebarProvider } from "../src/os/sidebar";
import GlobalSonnyAssistant from "../components/GlobalSonnyAssistant";

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/register",
  "/create-company",
  "/admin-login",
]);

export default function App({
  Component,
  pageProps,
}: AppProps) {
  const router = useRouter();

  const pathname = router.pathname;

  const isPublicRoute =
    PUBLIC_ROUTES.has(pathname);

  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin-");

  // Public/authentication pages must not start tenant workspace,
  // notifications, events, actions, or sidebar state.
  if (isPublicRoute) {
    return <Component {...pageProps} />;
  }

  // Admin pages are isolated from the tenant runtime.
  // AdminSidebar still needs SidebarProvider for UI state.
  if (isAdminRoute) {
    return (
      <SidebarProvider>
        <Component {...pageProps} />
      </SidebarProvider>
    );
  }

  // Authenticated tenant application runtime only.
  return (
    <WorkspaceProvider>
      <OSProvider>
        <FirmicEventSystem>
          <FirmicNotificationSystem>
            <SidebarProvider>
              <FirmicActionSystem>
                <ActionEventBridge />
                <Component {...pageProps} />
                <GlobalSonnyAssistant />
              </FirmicActionSystem>
            </SidebarProvider>
          </FirmicNotificationSystem>
        </FirmicEventSystem>
      </OSProvider>
    </WorkspaceProvider>
  );
}
