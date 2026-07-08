import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sources", () => ({
  deleteSource: vi.fn(async (id: string) => ({ id })),
  isSourceType: vi.fn((value) => ["RSS", "HTML", "HN", "GITHUB_TRENDING"].includes(String(value))),
  updateSource: vi.fn(async (id: string, input) => ({ id, ...input })),
}));

const { DELETE, PATCH } = await import("./route");
const { deleteSource, updateSource } = await import("@/lib/sources");

const context = { params: Promise.resolve({ id: "source-1" }) };

describe("single source management API", () => {
  it("updates a source", async () => {
    const input = {
      name: "OpenAI Blog",
      type: "RSS",
      url: "https://openai.com/news/rss.xml",
      categoryId: "cat-ai",
      enabled: false,
      fetchFrequencyMinutes: 720,
    };
    const response = await PATCH(new Request("http://localhost/api/sources/source-1", { method: "PATCH", body: JSON.stringify(input) }), context);

    expect(response.status).toBe(200);
    expect(updateSource).toHaveBeenCalledWith("source-1", input);
    await expect(response.json()).resolves.toEqual({ source: { id: "source-1", ...input } });
  });

  it("rejects invalid source types", async () => {
    const response = await PATCH(new Request("http://localhost/api/sources/source-1", { method: "PATCH", body: JSON.stringify({ type: "BAD" }) }), context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "来源类型不支持" });
  });

  it("hard deletes a source", async () => {
    const response = await DELETE(new Request("http://localhost/api/sources/source-1", { method: "DELETE" }), context);

    expect(response.status).toBe(200);
    expect(deleteSource).toHaveBeenCalledWith("source-1");
    await expect(response.json()).resolves.toEqual({ source: { id: "source-1" } });
  });

  it("returns readable errors", async () => {
    vi.mocked(updateSource).mockRejectedValueOnce(new Error("类别不存在"));

    const response = await PATCH(new Request("http://localhost/api/sources/source-1", { method: "PATCH", body: JSON.stringify({ categoryId: "missing" }) }), context);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "类别不存在" });
  });
});
