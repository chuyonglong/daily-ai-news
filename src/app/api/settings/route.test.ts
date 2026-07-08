import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureDefaults: vi.fn(),
  getAppConfig: vi.fn(async () => ({ themeMode: "auto" })),
  prisma: {
    source: {
      update: vi.fn(),
    },
  },
  updateAppConfig: vi.fn(async (config) => ({ themeMode: "auto", ...config })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/settings", () => ({
  ensureDefaults: mocks.ensureDefaults,
  getAppConfig: mocks.getAppConfig,
  updateAppConfig: mocks.updateAppConfig,
}));

const { GET, PATCH } = await import("./route");

describe("settings API", () => {
  it("returns app config only", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ config: { themeMode: "auto" } });
  });

  it("updates app config without mutating sources", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          config: { themeMode: "dark" },
          sources: [{ id: "source-1", enabled: false, fetchFrequencyMinutes: 60 }],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateAppConfig).toHaveBeenCalledWith({ themeMode: "dark" });
    expect(mocks.prisma.source.update).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ config: { themeMode: "dark" } });
  });
});
