import { describe, expect, it } from "vitest";
import { defaultCategoryScope, findDefaultCategoryId, selectedCategoryOrDefault } from "@/lib/category-defaults";

const categories = [
  { id: "cat-finance", name: "财务" },
  { id: "cat-ai", name: "AI" },
];

describe("category defaults", () => {
  it("uses all categories as the default selection", () => {
    expect(findDefaultCategoryId(categories)).toBe("cat-ai");
    expect(defaultCategoryScope(categories)).toBe("all");
  });

  it("uses the saved default category when it is available", () => {
    expect(defaultCategoryScope(categories, "cat-finance")).toBe("cat-finance");
    expect(defaultCategoryScope(categories, "all")).toBe("all");
  });

  it("keeps the original fallback when the saved category is unavailable", () => {
    expect(findDefaultCategoryId([{ id: "cat-finance", name: "财务" }])).toBeUndefined();
    expect(defaultCategoryScope([{ id: "cat-finance", name: "财务" }], "cat-ai")).toBe("all");
    expect(defaultCategoryScope([], "cat-ai", "")).toBe("");
  });

  it("preserves explicit category choices over the saved default", () => {
    expect(selectedCategoryOrDefault("cat-finance", categories)).toBe("cat-finance");
    expect(selectedCategoryOrDefault(" all ", categories)).toBe("all");
    expect(selectedCategoryOrDefault(undefined, categories, "cat-ai")).toBe("cat-ai");
  });
});
