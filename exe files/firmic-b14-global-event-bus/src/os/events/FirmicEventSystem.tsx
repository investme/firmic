import type { ReactNode } from "react";

import { EventProvider } from "./EventProvider";

type Props = {
  children: ReactNode;
};

export function FirmicEventSystem({ children }: Props) {
  return (
    <EventProvider historyLimit={250}>
      {children}
    </EventProvider>
  );
}
