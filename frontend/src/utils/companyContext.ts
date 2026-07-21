export type FirmicCompanyContext = {
  id: string;
  name: string;
  industry?: string;
  jurisdiction?: string;
  plan?: string;
  office_code?: string | null;
  office_location?: string | null;
};

export function getActiveCompany(): FirmicCompanyContext | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem("firmic_company");

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  const id = localStorage.getItem("company_id");
  const name = localStorage.getItem("company_name");

  if (!id || !name) return null;

  return {
    id,
    name,
    jurisdiction: localStorage.getItem("company_jurisdiction") || "Abu Dhabi",
    plan: localStorage.getItem("company_plan") || "Premium",
    office_code: null,
    office_location: null,
  };
}

export function saveActiveCompany(company: FirmicCompanyContext) {
  if (typeof window === "undefined") return;

  localStorage.setItem("company_id", company.id);
  localStorage.setItem("company_name", company.name);

  if (company.jurisdiction) {
    localStorage.setItem("company_jurisdiction", company.jurisdiction);
  }

  if (company.plan) {
    localStorage.setItem("company_plan", company.plan);
  }

  localStorage.setItem("firmic_company", JSON.stringify(company));
}

export function updateActiveCompanyOffice({
  office_code,
  office_location,
}: {
  office_code: string;
  office_location: string;
}) {
  const company = getActiveCompany();

  if (!company) return;

  saveActiveCompany({
    ...company,
    office_code,
    office_location,
  });
}