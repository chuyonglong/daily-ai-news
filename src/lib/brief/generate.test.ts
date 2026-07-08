import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppConfig: vi.fn(),
  prisma: {
    item: {
      findMany: vi.fn(),
    },
    brief: {
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    briefSection: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/settings", () => ({
  getAppConfig: mocks.getAppConfig,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import { briefTitle, buildPrompt, generateTodayBrief, resolveBriefLanguage } from "@/lib/brief/generate";

const category = {
  id: "cat-ai",
  name: "AI",
  createdAt: new Date("2026-05-30T00:00:00Z"),
  updatedAt: new Date("2026-05-30T00:00:00Z"),
};

const item = {
  id: "item-1",
  sourceId: "source-1",
  categoryId: "cat-ai",
  category,
  source: {
    id: "source-1",
    name: "OpenAI Blog",
    type: "RSS" as const,
    url: "https://openai.com/news/rss.xml",
    categoryId: "cat-ai",
    category,
    enabled: true,
    fetchFrequencyMinutes: 720,
    lastFetchedAt: null,
    createdAt: new Date("2026-05-30T00:00:00Z"),
    updatedAt: new Date("2026-05-30T00:00:00Z"),
  },
  title: "OpenAI announces a new model",
  url: "https://openai.com/news/model",
  canonicalUrl: "https://openai.com/news/model",
  publishedAt: new Date("2026-05-30T00:00:00Z"),
  content: null,
  excerpt: "A model update improves reasoning and tool use.",
  aiSummary: null,
  importance: 90,
  fingerprint: "fingerprint-1",
  tags: ["OpenAI", "model"],
  raw: null,
  createdAt: new Date("2026-05-30T00:00:00Z"),
  updatedAt: new Date("2026-05-30T00:00:00Z"),
};

describe("brief generation language helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppConfig.mockResolvedValue({
      briefMaxItems: 12,
      briefLanguage: "zh",
      exportTemplate: "wechat",
      workflowMode: "manual",
      openaiApiKey: "",
      openaiBaseUrl: "https://api.openai.com/v1",
      openaiModel: "gpt-4o-mini",
      languageStyle: "Concise.",
    });
    mocks.prisma.brief.upsert.mockResolvedValue({ id: "brief-1" });
    mocks.prisma.brief.findUniqueOrThrow.mockResolvedValue({ id: "brief-1", sections: [] });
    mocks.prisma.briefSection.deleteMany.mockResolvedValue({ count: 0 });
    mocks.prisma.briefSection.create.mockResolvedValue({});
  });

  it("builds English prompts", () => {
    const prompt = buildPrompt([item], 5, "Concise and editorial.", "en");

    expect(prompt).toContain("Write the brief in English");
    expect(prompt).toContain("Model releases");
    expect(prompt).toContain('"name":"Model releases"');
  });

  it("builds Japanese prompts", () => {
    const prompt = buildPrompt([item], 5, "簡潔に。", "ja");

    expect(prompt).toContain("日本語で出力");
    expect(prompt).toContain("モデル発表");
    expect(prompt).toContain('"name":"モデル発表"');
  });

  it("uses localized titles", () => {
    const date = new Date("2026-05-30T12:00:00Z");

    expect(briefTitle(date, "en")).toContain("AI Brief");
    expect(briefTitle(date, "ja")).toContain("AI ニュースブリーフ");
    expect(briefTitle(date, "zh")).toContain("AI 资讯简报");
  });

  it("resolves language from options, config, then default", () => {
    expect(resolveBriefLanguage({ briefLanguage: "en" }, { briefLanguage: "zh" })).toBe("en");
    expect(resolveBriefLanguage(undefined, { briefLanguage: "ja" })).toBe("ja");
    expect(resolveBriefLanguage({ briefLanguage: undefined }, { briefLanguage: "zh" })).toBe("zh");
  });

  it("persists item publishedAt into generated brief items", async () => {
    mocks.prisma.item.findMany.mockResolvedValue([item]);

    await generateTodayBrief({ categoryScope: "all", briefLanguage: "en", publishDate: "2026-05-30" });

    expect(mocks.prisma.briefSection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: expect.objectContaining({
            create: [
              expect.objectContaining({
                itemId: "item-1",
                publishedAt: new Date("2026-05-30T00:00:00Z"),
              }),
            ],
          }),
        }),
      }),
    );
  });

  it("queries items strictly by the selected publishedAt day", async () => {
    mocks.prisma.item.findMany.mockResolvedValue([item]);

    await generateTodayBrief({ categoryScope: "cat-ai", briefLanguage: "en", publishDate: "2026-05-30" });

    expect(mocks.prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          categoryId: "cat-ai",
          publishedAt: {
            gte: new Date("2026-05-30T00:00:00.000Z"),
            lt: new Date("2026-05-31T00:00:00.000Z"),
          },
        },
      }),
    );
  });

  it("does not fall back to createdAt when no item has the selected publish date", async () => {
    mocks.prisma.item.findMany.mockResolvedValue([]);

    await expect(generateTodayBrief({ categoryScope: "cat-ai", briefLanguage: "en", publishDate: "2026-05-30" })).rejects.toThrow(
      "该发布时间暂无可生成的资讯，请先采集",
    );

    expect(mocks.prisma.item.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.brief.upsert).not.toHaveBeenCalled();
  });
});
