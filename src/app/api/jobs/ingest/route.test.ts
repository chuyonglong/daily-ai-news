import { describe, expect, it, vi } from "vitest";

const idleRun = {
  runId: null,
  status: "idle" as const,
  categoryScope: "all",
  message: "准备采集",
  startedAt: null,
  completedAt: null,
  sources: [],
};

const runningRun = {
  runId: "run-1",
  status: "running" as const,
  categoryScope: "all",
  message: "正在采集：OpenAI Blog",
  startedAt: "2026-05-30T08:00:00.000Z",
  completedAt: null,
  sources: [
    {
      id: "source-1",
      name: "OpenAI Blog",
      type: "RSS",
      url: "https://openai.com/news/rss.xml",
      categoryId: "cat-ai",
      categoryName: "AI",
      fetchFrequencyMinutes: 720,
      lastFetchedAt: null,
      status: "running" as const,
      errors: [],
    },
  ],
};

vi.mock("@/lib/ingest/runs", () => ({
  getLatestIngestRunView: vi.fn(async () => idleRun),
  startOrResumeIngestRun: vi.fn(async () => runningRun),
}));

const { GET, POST } = await import("./route");
const { startOrResumeIngestRun } = await import("@/lib/ingest/runs");

describe("ingest run API", () => {
  it("returns the latest persisted ingest run", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ run: idleRun });
  });

  it("starts or resumes an ingest run", async () => {
    const response = await POST(new Request("http://localhost/api/jobs/ingest", { method: "POST", body: JSON.stringify({ categoryScope: "all" }) }));
    expect(response.status).toBe(200);
    expect(startOrResumeIngestRun).toHaveBeenCalledWith("all");
    await expect(response.json()).resolves.toEqual({ ok: true, run: runningRun });
  });

  it("starts a category-scoped ingest run", async () => {
    const response = await POST(new Request("http://localhost/api/jobs/ingest", { method: "POST", body: JSON.stringify({ categoryScope: "cat-finance" }) }));
    expect(response.status).toBe(200);
    expect(startOrResumeIngestRun).toHaveBeenCalledWith("cat-finance");
  });

  it("returns a readable error when no run can be created", async () => {
    vi.mocked(startOrResumeIngestRun).mockRejectedValueOnce(new Error("没有启用的来源"));
    const response = await POST();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "没有启用的来源" });
  });
});
