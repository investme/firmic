import { API_URL } from "./config";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {
      "Content-Type": "application/json",
    };
  }

  const token = localStorage.getItem("firmic_token");

  if (!token) {
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 1
): Promise<Response> {
  let response = await fetch(url, options);

  if (
    response.ok ||
    response.status === 404 ||
    response.status === 204 ||
    retries <= 0
  ) {
    return response;
  }

  await wait(300);

  response = await fetch(url, options);

  return response;
}

async function readErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const text = await response.text();

    if (!text) {
      return fallbackMessage;
    }

    try {
      const parsed = JSON.parse(text);

      if (typeof parsed?.detail === "string") {
        return parsed.detail;
      }

      if (Array.isArray(parsed?.detail)) {
        return parsed.detail
          .map((item: any) => {
            const location = Array.isArray(item?.loc)
              ? item.loc.join(".")
              : "field";

            return `${location}: ${item?.msg || "Invalid value"}`;
          })
          .join("\n");
      }

      if (typeof parsed?.message === "string") {
        return parsed.message;
      }

      return text;
    } catch {
      return text;
    }
  } catch {
    return fallbackMessage;
  }
}

function normalizeTaskList(data: unknown): any[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    "tasks" in data &&
    Array.isArray((data as { tasks?: unknown }).tasks)
  ) {
    return (data as { tasks: any[] }).tasks;
  }

  return [];
}

function parseResponseText(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: true,
      message: text,
    };
  }
}

export async function getCompanyTasks(
  companyId: string
): Promise<any[]> {
  if (!companyId) {
    return [];
  }

  const response = await fetchWithRetry(
    `${API_URL}/api/task/company/${encodeURIComponent(companyId)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
    1
  );

  if (response.status === 404 || response.status === 204) {
    return [];
  }

  if (!response.ok) {
    const message = await readErrorMessage(
      response,
      "Failed to load tasks"
    );

    throw new Error(message);
  }

  const data = await response.json();

  return normalizeTaskList(data);
}

export async function createTask(data: {
  company_id: string;
  title: string;
  description?: string;
  status?: string;
}) {
  if (!data.company_id) {
    throw new Error("Company ID is required.");
  }

  if (!data.title.trim()) {
    throw new Error("Task title is required.");
  }

  const response = await fetch(`${API_URL}/api/task/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      company_id: data.company_id,
      title: data.title.trim(),
      description: data.description?.trim() || "",
      status: data.status || "pending",
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    const message = await readErrorMessage(
      new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
      "Failed to create task"
    );

    throw new Error(message);
  }

  return parseResponseText(text);
}

export async function updateTaskStatus(
  taskId: string,
  status: string
) {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  if (!status) {
    throw new Error("Task status is required.");
  }

  const params = new URLSearchParams();
  params.append("status", status);

  const response = await fetch(
    `${API_URL}/api/task/${encodeURIComponent(
      taskId
    )}/status?${params.toString()}`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    const message = await readErrorMessage(
      new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
      "Failed to update task status"
    );

    throw new Error(message);
  }

  return parseResponseText(text);
}

export async function deleteTask(taskId: string) {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  const response = await fetch(
    `${API_URL}/api/task/${encodeURIComponent(taskId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  if (response.status === 404) {
    return {
      success: true,
      message: "Task was already removed.",
    };
  }

  const text = await response.text();

  if (!response.ok) {
    const message = await readErrorMessage(
      new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
      "Failed to delete task"
    );

    throw new Error(message);
  }

  return (
    parseResponseText(text) || {
      success: true,
    }
  );
}