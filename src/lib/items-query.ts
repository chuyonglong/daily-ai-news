export type ItemsSort = "asc" | "desc";

type RawItemsQuery = {
  q?: string;
  source?: string;
  tag?: string;
  category?: string;
  limit?: string;
  sort?: string;
};

export const ITEM_LIMIT_OPTIONS = [10, 20, 30, 50, 100] as const;

function clean(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || undefined;
}

export function parseItemsQuery(raw: RawItemsQuery) {
  const parsedLimit = Number(raw.limit);
  const limit = ITEM_LIMIT_OPTIONS.includes(parsedLimit as (typeof ITEM_LIMIT_OPTIONS)[number]) ? parsedLimit : 10;
  const sort: ItemsSort = raw.sort === "asc" ? "asc" : "desc";

  return {
    q: clean(raw.q),
    source: clean(raw.source),
    tag: clean(raw.tag),
    category: clean(raw.category),
    limit,
    sort,
  };
}

export function buildTimeSortHref(raw: RawItemsQuery) {
  const query = parseItemsQuery(raw);
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.source) params.set("source", query.source);
  if (query.tag) params.set("tag", query.tag);
  if (query.category) params.set("category", query.category);
  params.set("limit", String(query.limit));
  params.set("sort", query.sort === "desc" ? "asc" : "desc");
  return `/items?${params.toString()}`;
}
