import "../styles/globals.css";
import type { AppProps } from "next/app";

import { WorkspaceProvider } from "../src/context/WorkspaceProvider";
import { OSProvider } from "../src/os/OSProvider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WorkspaceProvider>
      <OSProvider>
        <Component {...pageProps} />
      </OSProvider>
    </WorkspaceProvider>
  );
}
