import { describe, expect, it } from "vitest";
import { defaultCategoryScope, findDefaultCategoryId, selectedCategoryOrDefault } from "@/lib/category-defaults";

const categories = [
  { id: "cat-finance", name: "财务" },
  { id: "cat-ai", name: "AI" },
];

describe("category defaults", () => {
  it("uses the AI category as the default when it exists", () => {
    expect(findDefaultCategoryId(categories)).toBe("cat-ai");
    expect(defaultCategoryScope(categories)).toBe("cat-ai");
  });

  it("keeps the original fallback when the AI category is unavailable", () => {
    expect(findDefaultCategoryId([{ id: "cat-finance", name: "财务" }])).toBeUndefined();
    expect(defaultCategoryScope([{ id: "cat-finance", name: "财务" }])).toBe("all");
    expect(defaultCategoryScope([], "")).toBe("");
  });

  it("preserves explicit category choices over the AI default", () => {
    expect(selectedCategoryOrDefault("cat-finance", categories)).toBe("cat-finance");
    expect(selectedCategoryOrDefault(" all ", categories)).toBe("all");
    expect(selectedCategoryOrDefault(undefined, categories)).toBe("cat-ai");
  });
});
