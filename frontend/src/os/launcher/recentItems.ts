import type { OSSearchItem } from "../types";

const RECENT_ITEMS_KEY = "firmic-os-recent-items";
const MAX_RECENT_ITEMS = 6;

export function readRecentItemIds() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(RECENT_ITEMS_KEY);
    const parsed = value ? JSON.parse(value) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeRecentItemId(item: OSSearchItem) {
  if (typeof window === "undefined") return;

  const identity = `${item.providerId}:${item.id}`;
  const existing = readRecentItemIds();

  const next = [
    identity,
    ...existing.filter((existingId) => existingId !== identity),
  ].slice(0, MAX_RECENT_ITEMS);

  window.localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(next));
}

export { MAX_RECENT_ITEMS };
