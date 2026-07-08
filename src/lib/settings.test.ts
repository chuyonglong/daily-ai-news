import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureSqliteSchema: vi.fn(),
  prisma: {
    appSetting: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    category: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    source: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    item: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    brief: {
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/sqlite-schema", () => ({ ensureSqliteSchema: mocks.ensureSqliteSchema }));

async function importSettings() {
  vi.resetModules();
  return import("@/lib/settings");
}

function mockSuccessfulDefaults() {
  mocks.ensureSqliteSchema.mockResolvedValue(undefined);
  mocks.prisma.appSetting.upsert.mockResolvedValue({});
  mocks.prisma.category.upsert.mockResolvedValue({});
  mocks.prisma.category.findUnique.mockResolvedValue({ id: "cat-ai", name: "AI" });
  mocks.prisma.category.findUniqueOrThrow.mockResolvedValue({ id: "cat-ai", name: "AI" });
  mocks.prisma.source.upsert.mockResolvedValue({});
  mocks.prisma.source.updateMany.mockResolvedValue({ count: 0 });
  mocks.prisma.item.updateMany.mockResolvedValue({ count: 0 });
  mocks.prisma.item.findMany.mockResolvedValue([]);
  mocks.prisma.brief.updateMany.mockResolvedValue({ count: 0 });
}

describe("ensureDefaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccessfulDefaults();
  });

  it("does not rewrite defaults after initialization succeeds", async () => {
    const { ensureDefaults } = await importSettings();

    await ensureDefaults();
    await ensureDefaults();

    expect(mocks.ensureSqliteSchema).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.appSetting.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.category.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.source.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.item.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.brief.updateMany).toHaveBeenCalledTimes(1);
  });

  it("retries initialization after a failed attempt", async () => {
    const { ensureDefaults } = await importSettings();
    mocks.ensureSqliteSchema.mockRejectedValueOnce(new Error("database locked"));

    await expect(ensureDefaults()).rejects.toThrow("database locked");
    await ensureDefaults();

    expect(mocks.ensureSqliteSchema).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.appSetting.upsert).toHaveBeenCalledTimes(1);
  });
});

describe("getAppConfig brief fill mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccessfulDefaults();
  });

  it("backfills instant mode for old app config rows", async () => {
    const { getAppConfig } = await importSettings();
    mocks.prisma.appSetting.findUnique.mockResolvedValue({ value: { briefLanguage: "zh" } });

    const config = await getAppConfig();

    expect((config as { briefFillMode?: string }).briefFillMode).toBe("instant");
  });

  it("coerces unsupported brief fill modes to instant", async () => {
    const { getAppConfig } = await importSettings();
    mocks.prisma.appSetting.findUnique.mockResolvedValue({ value: { briefFillMode: "scroll" } });

    const config = await getAppConfig();

    expect((config as { briefFillMode?: string }).briefFillMode).toBe("instant");
  });
});
