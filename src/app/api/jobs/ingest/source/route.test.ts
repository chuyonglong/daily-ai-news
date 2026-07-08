import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ingest/ingest", () => ({
  ingestSourceById: vi.fn(async (sourceId: string) => {
    if (sourceId === "missing") return null;
    if (sourceId === "boom") throw new Error("RSS timeout");
    return { sourceName: "OpenAI Blog", fetched: 3, inserted: 1, duplicate: 1, skipped: 2, failed: 1, errors: ["Bad item"] };
  }),
}));

const { POST } = await import("./route");

describe("single source ingest API", () => {
  it("returns 400 when sourceId is missing", async () => {
    const response = await POST(new Request("http://localhost/api/jobs/ingest/source", { method: "POST", body: JSON.stringify({}) }));
    expect(response.status).toBe(400);
  });

  it("returns 404 for missing or disabled sources", async () => {
    const response = await POST(new Request("http://localhost/api/jobs/ingest/source", { method: "POST", body: JSON.stringify({ sourceId: "missing" }) }));
    expect(response.status).toBe(404);
  });

  it("returns 502 when source fetch fails", async () => {
    const response = await POST(new Request("http://localhost/api/jobs/ingest/source", { method: "POST", body: JSON.stringify({ sourceId: "boom" }) }));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "RSS timeout" });
  });

  it("returns an expanded source ingest result", async () => {
    const response = await POST(new Request("http://localhost/api/jobs/ingest/source", { method: "POST", body: JSON.stringify({ sourceId: "source-1" }) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result: { sourceName: "OpenAI Blog", fetched: 3, inserted: 1, duplicate: 1, skipped: 2, failed: 1, errors: ["Bad item"] } });
  });
});