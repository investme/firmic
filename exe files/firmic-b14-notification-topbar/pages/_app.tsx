import "../styles/globals.css";
import type { AppProps } from "next/app";

import { WorkspaceProvider } from "../src/context/WorkspaceProvider";
import { OSProvider } from "../src/os/OSProvider";
import { FirmicActionSystem } from "../src/os/actions";
import { ActionEventBridge, FirmicEventSystem } from "../src/os/events";
import { FirmicNotificationSystem } from "../src/os/notifications";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WorkspaceProvider>
      <OSProvider>
        <FirmicEventSystem>
          <FirmicNotificationSystem>
            <FirmicActionSystem>
              <ActionEventBridge />
              <Component {...pageProps} />
            </FirmicActionSystem>
          </FirmicNotificationSystem>
        </FirmicEventSystem>
      </OSProvider>
    </WorkspaceProvider>
  );
}
