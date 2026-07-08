import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureDefaults: vi.fn(),
  prisma: {
    category: {
      findUnique: vi.fn(),
    },
    source: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/settings", () => ({
  ensureDefaults: mocks.ensureDefaults,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

async function importSources() {
  vi.resetModules();
  return import("@/lib/sources");
}

describe("source management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureDefaults.mockResolvedValue(undefined);
    mocks.prisma.category.findUnique.mockResolvedValue({ id: "cat-ai", name: "AI" });
    mocks.prisma.source.create.mockResolvedValue({ id: "source-new" });
    mocks.prisma.source.update.mockResolvedValue({ id: "source-1" });
    mocks.prisma.source.delete.mockResolvedValue({ id: "source-1" });
    mocks.prisma.source.findMany.mockResolvedValue([]);
  });

  it("lists all sources for management with categories", async () => {
    const { listSourcesForManagement } = await importSources();

    await listSourcesForManagement();

    expect(mocks.ensureDefaults).toHaveBeenCalled();
    expect(mocks.prisma.source.findMany).toHaveBeenCalledWith({
      include: { category: true },
      orderBy: [{ enabled: "desc" }, { name: "asc" }],
    });
  });

  it("creates a source with trimmed fields and clamped frequency", async () => {
    const { createSource } = await importSources();

    await createSource({
      name: " OpenAI Blog ",
      type: "RSS",
      url: " https://openai.com/news/rss.xml ",
      categoryId: " cat-ai ",
      fetchFrequencyMinutes: 10,
      enabled: false,
    });

    expect(mocks.prisma.source.create).toHaveBeenCalledWith({
      data: {
        name: "OpenAI Blog",
        type: "RSS",
        url: "https://openai.com/news/rss.xml",
        categoryId: "cat-ai",
        enabled: false,
        fetchFrequencyMinutes: 60,
      },
      include: { category: true },
    });
  });

  it("updates source details and validates category", async () => {
    const { updateSource } = await importSources();

    await updateSource("source-1", {
      name: " Finance Feed ",
      type: "HTML",
      url: " https://example.com/markets ",
      categoryId: " cat-ai ",
      enabled: true,
      fetchFrequencyMinutes: 360,
    });

    expect(mocks.prisma.category.findUnique).toHaveBeenCalledWith({ where: { id: "cat-ai" } });
    expect(mocks.prisma.source.update).toHaveBeenCalledWith({
      where: { id: "source-1" },
      data: {
        name: "Finance Feed",
        type: "HTML",
        url: "https://example.com/markets",
        categoryId: "cat-ai",
        enabled: true,
        fetchFrequencyMinutes: 360,
      },
      include: { category: true },
    });
  });

  it("can disable a source without changing source content", async () => {
    const { updateSource } = await importSources();

    await updateSource("source-1", { enabled: false });

    expect(mocks.prisma.source.update).toHaveBeenCalledWith({
      where: { id: "source-1" },
      data: { enabled: false },
      include: { category: true },
    });
  });

  it("hard deletes a source by id", async () => {
    const { deleteSource } = await importSources();

    await deleteSource("source-1");

    expect(mocks.prisma.source.delete).toHaveBeenCalledWith({ where: { id: "source-1" } });
  });

  it("rejects unsupported source types, blank names, blank urls, and missing categories", async () => {
    const { createSource, updateSource } = await importSources();

    await expect(createSource({ name: " ", type: "RSS", url: "https://example.com", categoryId: "cat-ai" })).rejects.toThrow("来源名称不能为空");
    await expect(createSource({ name: "Feed", type: "RSS", url: " ", categoryId: "cat-ai" })).rejects.toThrow("来源 URL 不能为空");
    await expect(
      createSource({ name: "Feed", type: "BAD" as never, url: "https://example.com", categoryId: "cat-ai" }),
    ).rejects.toThrow("来源类型不支持");

    mocks.prisma.category.findUnique.mockResolvedValueOnce(null);
    await expect(updateSource("source-1", { categoryId: "missing" })).rejects.toThrow("类别不存在");
  });
});
