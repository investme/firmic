import type { OSCommand, OSSearchItem } from "./types";

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function commandToSearchItem(command: OSCommand): OSSearchItem {
  return {
    id: `command:${command.id}`,
    providerId: "firmic-core",
    kind: command.category === "AI" ? "agent" : "command",
    title: command.title,
    subtitle: command.subtitle,
    category: command.category,
    keywords: command.keywords,
    route: command.route,
    icon: command.icon,
    action: command.action,
    priority: command.category === "Actions" ? 25 : 10,
  };
}

export function scoreSearchItem(item: OSSearchItem, rawQuery: string) {
  const query = normalizeSearchValue(rawQuery);

  if (!query) {
    return item.priority ?? 0;
  }

  const title = normalizeSearchValue(item.title);
  const subtitle = normalizeSearchValue(item.subtitle ?? "");
  const category = normalizeSearchValue(item.category);
  const keywords = (item.keywords ?? []).map(normalizeSearchValue);
  const parts = query.split(/\s+/).filter(Boolean);

  let score = item.priority ?? 0;

  if (title === query) score += 160;
  if (title.startsWith(query)) score += 120;
  if (keywords.some((keyword) => keyword === query)) score += 110;
  if (keywords.some((keyword) => keyword.startsWith(query))) score += 90;
  if (title.includes(query)) score += 75;
  if (keywords.some((keyword) => keyword.includes(query))) score += 60;
  if (subtitle.includes(query)) score += 35;
  if (category.includes(query)) score += 25;

  for (const part of parts) {
    if (title.includes(part)) score += 20;
    if (subtitle.includes(part)) score += 10;
    if (keywords.some((keyword) => keyword.includes(part))) score += 15;
  }

  return score;
}

export function rankSearchItems(
  items: OSSearchItem[],
  query: string,
  limit = 18,
) {
  const uniqueItems = new Map<string, OSSearchItem>();

  for (const item of items) {
    uniqueItems.set(`${item.providerId}:${item.id}`, item);
  }

  return Array.from(uniqueItems.values())
    .map((item) => ({
      item,
      score: scoreSearchItem(item, query),
    }))
    .filter(({ score }) => query.trim() === "" || score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.title.localeCompare(b.item.title);
    })
    .slice(0, limit)
    .map(({ item }) => item);
}
