import { useEffect } from "react";
import { CheckSquare2 } from "lucide-react";

import { useOS } from "../useOS";

/*
Replace this example type and fetch call with your real task API response.
The provider is intentionally isolated from the OS core.
*/
type SearchableTask = {
  id: string;
  title: string;
  status?: string;
  companyName?: string;
};

async function fetchTasksForSearch(query: string): Promise<SearchableTask[]> {
  const token = window.localStorage.getItem("firmic_token");

  if (!token || query.trim().length < 2) {
    return [];
  }

  const response = await fetch(
    `/api/tasks/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export function useTaskSearchProvider() {
  const { registerSearchProvider } = useOS();

  useEffect(() => {
    return registerSearchProvider({
      id: "tasks",
      label: "Tasks",
      search: async (query) => {
        const tasks = await fetchTasksForSearch(query);

        return tasks.map((task) => ({
          id: task.id,
          providerId: "tasks",
          kind: "task",
          title: task.title,
          subtitle: [task.companyName, task.status]
            .filter(Boolean)
            .join(" · "),
          category: "Tasks",
          keywords: [task.status ?? "", task.companyName ?? ""],
          route: `/tasks?task=${encodeURIComponent(task.id)}`,
          icon: CheckSquare2,
          priority: 20,
        }));
      },
    });
  }, [registerSearchProvider]);
}
