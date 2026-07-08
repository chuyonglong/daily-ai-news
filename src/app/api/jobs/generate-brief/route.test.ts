import { describe, expect, it, vi } from "vitest";

const brief = {
  id: "brief-1",
  status: "DRAFT",
  title: "July 1 AI Brief",
  markdown: "# Brief",
  html: "<h1>Brief</h1>",
};

vi.mock("@/lib/brief/generate", () => ({
  generateTodayBrief: vi.fn(async () => brief),
}));

const { POST } = await import("./route");
const { generateTodayBrief } = await import("@/lib/brief/generate");

describe("generate brief API", () => {
  it("returns 400 when categoryScope is missing", async () => {
    const response = await POST(new Request("http://localhost/api/jobs/generate-brief", { method: "POST", body: JSON.stringify({}) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "请选择类别" });
    expect(generateTodayBrief).not.toHaveBeenCalled();
  });

  it("passes category scope, language, and publish date to brief generation", async () => {
    const response = await POST(
      new Request("http://localhost/api/jobs/generate-brief", {
        method: "POST",
        body: JSON.stringify({ categoryScope: "all", briefLanguage: "en", publishDate: "2026-05-30" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(generateTodayBrief).toHaveBeenCalledWith({ categoryScope: "all", briefLanguage: "en", publishDate: "2026-05-30" });
    await expect(response.json()).resolves.toEqual({
      id: brief.id,
      status: brief.status,
      title: brief.title,
      markdown: brief.markdown,
      html: brief.html,
    });
  });

  it("returns a readable error when no items match the publish date", async () => {
    vi.mocked(generateTodayBrief).mockRejectedValueOnce(new Error("该发布时间暂无可生成的资讯，请先采集"));

    const response = await POST(
      new Request("http://localhost/api/jobs/generate-brief", {
        method: "POST",
        body: JSON.stringify({ categoryScope: "cat-ai", briefLanguage: "zh", publishDate: "2026-05-30" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "该发布时间暂无可生成的资讯，请先采集" });
  });
});
