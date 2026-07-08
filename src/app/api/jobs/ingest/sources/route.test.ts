import { describe, expect, it, vi } from "vitest";

const sources = [
  {
    id: "source-1",
    name: "OpenAI Blog",
    type: "RSS",
    url: "https://openai.com/news/rss.xml",
    categoryId: "cat-ai",
    categoryName: "AI",
    fetchFrequencyMinutes: 720,
    lastFetchedAt: null,
  },
];

vi.mock("@/lib/ingest/ingest", () => ({
  listEnabledIngestSources: vi.fn(async () => sources),
}));

vi.mock("@/lib/sources", () => ({
  createSource: vi.fn(async (input) => ({ id: "source-2", lastFetchedAt: null, ...input })),
  isSourceType: vi.fn((value) => ["RSS", "HTML", "HN", "GITHUB_TRENDING"].includes(String(value))),
}));

const { GET, POST } = await import("./route");
const { createSource } = await import("@/lib/sources");

describe("ingest sources API", () => {
  it("returns enabled sources with category fields", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sources });
  });

  it("creates a manual source", async () => {
    const input = {
      name: "Finance Feed",
      type: "RSS",
      url: "https://example.com/feed.xml",
      categoryId: "cat-finance",
      fetchFrequencyMinutes: 360,
      enabled: true,
    };
    const response = await POST(new Request("http://localhost/api/jobs/ingest/sources", { method: "POST", body: JSON.stringify(input) }));

    expect(response.status).toBe(200);
    expect(createSource).toHaveBeenCalledWith(input);
    await expect(response.json()).resolves.toEqual({ source: { id: "source-2", lastFetchedAt: null, ...input } });
  });

  it("rejects manual sources without a category", async () => {
    const response = await POST(
      new Request("http://localhost/api/jobs/ingest/sources", {
        method: "POST",
        body: JSON.stringify({ name: "Finance Feed", type: "RSS", url: "https://example.com/feed.xml" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "请选择类别" });
  });
});
