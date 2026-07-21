import { API_URL } from "./config";

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("firmic_token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function request(
  path: string,
  options: RequestInit = {}
) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      cache: "no-store",
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  if (!response.ok) {
    let message =
      text || "Document request failed";

    try {
      const payload = text
        ? JSON.parse(text)
        : null;

      message =
        payload?.detail ||
        payload?.message ||
        message;
    } catch {
      // Preserve plain-text errors.
    }

    throw new Error(message);
  }

  return text ? JSON.parse(text) : null;
}

function normalizeDocuments(
  value: any
): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value &&
    Array.isArray(value.documents)
  ) {
    return value.documents;
  }

  return [];
}

export async function getDocuments() {
  return normalizeDocuments(
    await request(
      "/api/document/list"
    )
  );
}

export async function getCompanyDocuments(
  companyId: string
) {
  if (!companyId) return [];

  return normalizeDocuments(
    await request(
      `/api/document/company/${encodeURIComponent(
        companyId
      )}`
    )
  );
}

export async function getComplianceRequests(
  companyId: string
) {
  if (!companyId) {
    return {
      company_id: "",
      requests: [],
      requested_count: 0,
      action_required_count: 0,
    };
  }

  return request(
    `/api/document/company/${encodeURIComponent(
      companyId
    )}/compliance-requests`
  );
}

export async function createDocument(
  data: {
    company_id: string;
    name: string;
    type?: string;
    status?: string;
    file_path?: string;
  }
) {
  if (!data.company_id) {
    throw new Error(
      "Company ID is required."
    );
  }

  if (!data.name.trim()) {
    throw new Error(
      "Document name is required."
    );
  }

  return request(
    "/api/document/create",
    {
      method: "POST",
      body: JSON.stringify({
        company_id: data.company_id,
        name: data.name.trim(),
        type:
          data.type ||
          "General",
        status:
          data.status ||
          "uploaded",
        file_path:
          data.file_path ||
          null,
      }),
    }
  );
}

export async function deleteDocument(
  documentId: string
) {
  if (!documentId) {
    throw new Error(
      "Document ID is required."
    );
  }

  return request(
    `/api/document/${encodeURIComponent(
      documentId
    )}`,
    {
      method: "DELETE",
    }
  );
}
