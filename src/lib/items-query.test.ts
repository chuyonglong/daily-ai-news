import { describe, expect, it } from "vitest";
import { buildTimeSortHref, parseItemsQuery } from "@/lib/items-query";

describe("items query helpers", () => {
  it("uses safe defaults for limit and sort", () => {
    expect(parseItemsQuery({ limit: "999", sort: "sideways" })).toMatchObject({
      limit: 10,
      sort: "desc",
    });
  });

  it("accepts allowed limits and ascending sort", () => {
    expect(parseItemsQuery({ limit: "50", sort: "asc" })).toMatchObject({
      limit: 50,
      sort: "asc",
    });
  });

  it("preserves the selected item limit when flipping time sort", () => {
    expect(buildTimeSortHref({ limit: "100", sort: "asc" })).toBe("/items?limit=100&sort=desc");
  });

  it("builds a time sort href that preserves filters and flips direction", () => {
    const href = buildTimeSortHref({
      q: "agent",
      source: "source-1",
      tag: "模型",
      category: "cat-ai",
      limit: "20",
      sort: "desc",
    });

    expect(href).toBe("/items?q=agent&source=source-1&tag=%E6%A8%A1%E5%9E%8B&category=cat-ai&limit=20&sort=asc");
  });
});
