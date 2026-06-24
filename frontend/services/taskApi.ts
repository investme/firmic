import { API_URL } from "./config";

export async function getCompanyTasks(companyId: string) {
  const res = await fetch(
    `${API_URL}/api/task/company/${companyId}`
  );

  if (!res.ok) {
    throw new Error("Failed to load tasks");
  }

  return res.json();
}

export async function createTask(data: {
  company_id: string;
  title: string;
  description?: string;
  status?: string;
}) {
  const params = new URLSearchParams();

  params.append("company_id", data.company_id);
  params.append("title", data.title);
  params.append("description", data.description || "");
  params.append("status", data.status || "pending");

  const res = await fetch(
    `${API_URL}/api/task/create?${params.toString()}`,
    {
      method: "POST",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to create task");
  }

  return res.json();
}

export async function updateTaskStatus(
  taskId: string,
  status: string
) {
  const params = new URLSearchParams();

  params.append("status", status);

  const res = await fetch(
    `${API_URL}/api/task/${taskId}/status?${params.toString()}`,
    {
      method: "PUT",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to update task status");
  }

  return res.json();
}

export async function deleteTask(taskId: string) {
  const res = await fetch(
    `${API_URL}/api/task/${taskId}`,
    {
      method: "DELETE",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to delete task");
  }

  return res.json();
}