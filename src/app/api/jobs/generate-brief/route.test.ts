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

  it("passes category scope and language to brief generation", async () => {
    const response = await POST(
      new Request("http://localhost/api/jobs/generate-brief", {
        method: "POST",
        body: JSON.stringify({ categoryScope: "all", briefLanguage: "en" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(generateTodayBrief).toHaveBeenCalledWith({ categoryScope: "all", briefLanguage: "en" });
    await expect(response.json()).resolves.toEqual({
      id: brief.id,
      status: brief.status,
      title: brief.title,
      markdown: brief.markdown,
      html: brief.html,
    });
  });
});
