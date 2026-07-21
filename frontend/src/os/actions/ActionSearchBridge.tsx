import { useEffect } from "react";

import { useOS } from "../useOS";
import { useActions } from "./useActions";

export function ActionSearchBridge() {
  const { actions, executeAction } = useActions();
  const { registerSearchProvider } = useOS();

  useEffect(() => {
    return registerSearchProvider({
      id: "firmic-actions",
      label: "Firmic Actions",

      search(query: string) {
        const normalized = query.trim().toLowerCase();

        return actions
          .filter((action) => {
            if (!normalized) {
              return true;
            }

            const searchable = [
              action.title,
              action.description ?? "",
              action.category,
              ...(action.keywords ?? []),
            ]
              .join(" ")
              .toLowerCase();

            return searchable.includes(normalized);
          })
          .map((action) => ({
            providerId: "firmic-actions",
            id: action.id,
            title: action.title,
            subtitle: action.description ?? "",
            category: action.category,
            kind: "command" as const,
            icon: action.icon,
            priority: action.priority ?? 0,
            keywords: action.keywords ?? [],

            action: async (): Promise<void> => {
              await executeAction(action.id);
            },
          }));
      },
    });
  }, [actions, executeAction, registerSearchProvider]);

  return null;
}