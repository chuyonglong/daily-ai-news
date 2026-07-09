import { describe, expect, it } from "vitest";
import type { ManagedSource, SourceSortState } from "./SourceManager";
import { filterAndSortSources, nextSourceSortState } from "./SourceManager";

function source(overrides: Partial<ManagedSource>): ManagedSource {
  return {
    id: overrides.id ?? "source",
    name: overrides.name ?? "Source",
    type: overrides.type ?? "RSS",
    url: overrides.url ?? "https://example.com/feed.xml",
    categoryId: overrides.categoryId ?? null,
    category: overrides.category ?? null,
    enabled: overrides.enabled ?? true,
    fetchFrequencyMinutes: overrides.fetchFrequencyMinutes ?? 720,
    lastFetchedAt: overrides.lastFetchedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("SourceManager table helpers", () => {
  const sources = [
    source({
      id: "b",
      name: "Beta",
      categoryId: "cat-b",
      category: { id: "cat-b", name: "Beta" },
      createdAt: "2026-01-02T00:00:00.000Z",
    }),
    source({
      id: "a",
      name: "Alpha",
      categoryId: "cat-a",
      category: { id: "cat-a", name: "Alpha" },
      createdAt: "2026-01-03T00:00:00.000Z",
    }),
    source({
      id: "c",
      name: "Cloud",
      categoryId: "cat-c",
      category: { id: "cat-c", name: "Cloud" },
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
  ];

  it("filters sources by selected category", () => {
    const result = filterAndSortSources(sources, "cat-a", null);

    expect(result.map((item) => item.id)).toEqual(["a"]);
  });

  it("sorts sources by category name and toggles direction", () => {
    const asc: SourceSortState = { key: "category", direction: "asc" };
    const desc: SourceSortState = { key: "category", direction: "desc" };

    expect(filterAndSortSources(sources, "all", asc).map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(filterAndSortSources(sources, "all", desc).map((item) => item.id)).toEqual(["c", "b", "a"]);
    expect(nextSourceSortState(null, "category")).toEqual(asc);
    expect(nextSourceSortState(asc, "category")).toEqual(desc);
  });

  it("sorts sources by created time with newest first on first click", () => {
    const firstClick = nextSourceSortState(null, "createdAt");

    expect(firstClick).toEqual({ key: "createdAt", direction: "desc" });
    expect(filterAndSortSources(sources, "all", firstClick).map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(nextSourceSortState(firstClick, "createdAt")).toEqual({ key: "createdAt", direction: "asc" });
  });
});
