import { getActiveWorkspace } from "./workspaceContext";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function companyStorageKey(name: string): string | null {
  const workspace = getActiveWorkspace();
  return workspace?.id ? `firmic_${name}_${workspace.id}` : null;
}

export function readCompanyStorage<T>(name: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const key = companyStorageKey(name);
  if (!key) return fallback;

  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (error) {
    console.error(`Failed to read ${name}:`, error);
    return fallback;
  }
}

export function writeCompanyStorage<T>(name: string, value: T): boolean {
  if (!isBrowser()) return false;
  const key = companyStorageKey(name);
  if (!key) return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("firmic-company-data-changed", {
      detail: { key, name },
    }));
    return true;
  } catch (error) {
    console.error(`Failed to write ${name}:`, error);
    return false;
  }
}
