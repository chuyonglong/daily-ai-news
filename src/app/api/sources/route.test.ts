import { describe, expect, it, vi } from "vitest";

const sources = [
  {
    id: "source-1",
    name: "OpenAI Blog",
    type: "RSS",
    url: "https://openai.com/news/rss.xml",
    categoryId: "cat-ai",
    enabled: true,
    fetchFrequencyMinutes: 720,
    lastFetchedAt: null,
    category: { id: "cat-ai", name: "AI" },
  },
];

const categories = [
  { id: "cat-ai", name: "AI" },
  { id: "cat-finance", name: "财务" },
];

vi.mock("@/lib/sources", () => ({
  createSource: vi.fn(async (input) => ({ id: "source-new", lastFetchedAt: null, category: categories[0], ...input })),
  isSourceType: vi.fn((value) => ["RSS", "HTML", "HN", "GITHUB_TRENDING"].includes(String(value))),
  listSourcesForManagement: vi.fn(async () => sources),
}));

vi.mock("@/lib/categories", () => ({
  listCategories: vi.fn(async () => categories),
}));

const { GET, POST } = await import("./route");
const { createSource } = await import("@/lib/sources");

describe("sources management API", () => {
  it("returns all sources and categories", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sources, categories });
  });

  it("creates a source", async () => {
    const input = {
      name: "Finance Feed",
      type: "RSS",
      url: "https://example.com/feed.xml",
      categoryId: "cat-finance",
      fetchFrequencyMinutes: 360,
      enabled: true,
    };

    const response = await POST(new Request("http://localhost/api/sources", { method: "POST", body: JSON.stringify(input) }));

    expect(response.status).toBe(200);
    expect(createSource).toHaveBeenCalledWith(input);
    await expect(response.json()).resolves.toEqual({ source: { id: "source-new", lastFetchedAt: null, category: categories[0], ...input } });
  });

  it("rejects invalid source types", async () => {
    const response = await POST(new Request("http://localhost/api/sources", { method: "POST", body: JSON.stringify({ type: "BAD" }) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "来源类型不支持" });
  });
});
