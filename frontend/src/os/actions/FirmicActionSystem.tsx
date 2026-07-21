import type { ReactNode } from "react";

import { ActionProvider } from "./ActionProvider";
import { ActionSearchBridge } from "./ActionSearchBridge";
import { CoreActionRegistrar } from "./CoreActionRegistrar";

type Props = {
  children: ReactNode;
};

export function FirmicActionSystem({ children }: Props) {
  return (
    <ActionProvider>
      <CoreActionRegistrar />
      <ActionSearchBridge />
      {children}
    </ActionProvider>
  );
}
