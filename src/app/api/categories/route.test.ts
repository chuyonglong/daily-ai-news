import { describe, expect, it, vi } from "vitest";

const categories = [
  { id: "cat-ai", name: "AI" },
  { id: "cat-finance", name: "财务" },
];

vi.mock("@/lib/categories", () => ({
  createCategory: vi.fn(async (name: string) => ({ id: "cat-custom", name })),
  listCategories: vi.fn(async () => categories),
}));

const { GET, POST } = await import("./route");
const { createCategory } = await import("@/lib/categories");

describe("categories API", () => {
  it("lists categories", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ categories });
  });

  it("creates a category", async () => {
    const response = await POST(new Request("http://localhost/api/categories", { method: "POST", body: JSON.stringify({ name: "能源" }) }));

    expect(response.status).toBe(200);
    expect(createCategory).toHaveBeenCalledWith("能源");
    await expect(response.json()).resolves.toEqual({ category: { id: "cat-custom", name: "能源" } });
  });

  it("rejects an empty category name", async () => {
    const response = await POST(new Request("http://localhost/api/categories", { method: "POST", body: JSON.stringify({ name: " " }) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "类别名称不能为空" });
  });
});
