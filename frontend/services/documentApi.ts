import { API_URL } from "./config";

export async function getDocuments() {
  const res = await fetch(`${API_URL}/api/document/list`);

  if (!res.ok) {
    throw new Error("Failed to load documents");
  }

  return res.json();
}

export async function getCompanyDocuments(companyId: string) {
  const res = await fetch(
    `${API_URL}/api/document/company/${companyId}`
  );

  if (!res.ok) {
    throw new Error("Failed to load company documents");
  }

  return res.json();
}

export async function createDocument(data: {
  company_id: string;
  name: string;
  type?: string;
  status?: string;
  file_path?: string;
}) {
  const params = new URLSearchParams();

  params.append("company_id", data.company_id);
  params.append("name", data.name);
  params.append("type", data.type || "General");
  params.append("status", data.status || "pending");

  if (data.file_path) {
    params.append("file_path", data.file_path);
  }

  const res = await fetch(
    `${API_URL}/api/document/create?${params.toString()}`,
    {
      method: "POST",
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Failed to create document");
  }

  return text ? JSON.parse(text) : null;
}

export async function deleteDocument(documentId: string) {
  const res = await fetch(
    `${API_URL}/api/document/${documentId}`,
    {
      method: "DELETE",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to delete document");
  }

  return res.json();
}