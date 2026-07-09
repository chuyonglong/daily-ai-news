import type { SourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDefaults } from "@/lib/settings";

const SOURCE_TYPES: SourceType[] = ["RSS", "HTML", "HN", "GITHUB_TRENDING"];

export type CreateSourceInput = {
  name: string;
  type?: SourceType;
  url: string;
  categoryId: string;
  fetchFrequencyMinutes?: number;
  enabled?: boolean;
};

export type UpdateSourceInput = Partial<CreateSourceInput>;

export function isSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && SOURCE_TYPES.includes(value as SourceType);
}

export function inferSourceTypeFromUrl(input: string): SourceType {
  const normalized = input.trim().toLowerCase();

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.replace(/^www\./, "");
    const pathname = url.pathname;
    const fullPath = `${pathname}${url.search}`;

    if (hostname === "hn.algolia.com" || fullPath.includes("search_by_date")) return "HN";
    if (hostname === "github.com" && pathname.startsWith("/trending")) return "GITHUB_TRENDING";
    if (/\.(rss|xml|atom)$/.test(pathname) || /(^|[/?&=_-])(rss|feed|atom)([/?&=_.-]|$)/.test(fullPath)) return "RSS";
  } catch {
    if (/\.(rss|xml|atom)(\?|#|$)/.test(normalized) || /\b(rss|feed|atom)\b/.test(normalized)) return "RSS";
  }

  return "HTML";
}

async function assertCategory(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("类别不存在");
}

function normalizeFrequency(value: number | undefined) {
  return Math.max(60, Number(value ?? 1440));
}

export async function listSourcesForManagement() {
  await ensureDefaults();
  return prisma.source.findMany({
    include: { category: true },
    orderBy: [{ enabled: "desc" }, { name: "asc" }],
  });
}

export async function createSource(input: CreateSourceInput) {
  await ensureDefaults();
  const name = input.name.trim();
  const url = input.url.trim();
  const categoryId = input.categoryId.trim();

  if (!name) throw new Error("来源名称不能为空");
  if (!url) throw new Error("来源 URL 不能为空");
  if (!categoryId) throw new Error("请选择类别");
  if (input.type !== undefined && !isSourceType(input.type)) throw new Error("来源类型不支持");

  await assertCategory(categoryId);
  const type = input.type ?? inferSourceTypeFromUrl(url);

  return prisma.source.create({
    data: {
      name,
      type,
      url,
      categoryId,
      enabled: input.enabled ?? true,
      fetchFrequencyMinutes: normalizeFrequency(input.fetchFrequencyMinutes),
    },
    include: { category: true },
  });
}

export async function updateSource(id: string, input: UpdateSourceInput) {
  await ensureDefaults();
  const sourceId = id.trim();
  if (!sourceId) throw new Error("来源不存在");

  const data: {
    name?: string;
    type?: SourceType;
    url?: string;
    categoryId?: string;
    enabled?: boolean;
    fetchFrequencyMinutes?: number;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("来源名称不能为空");
    data.name = name;
  }

  if (input.url !== undefined) {
    const url = input.url.trim();
    if (!url) throw new Error("来源 URL 不能为空");
    data.url = url;
    if (input.type === undefined) {
      data.type = inferSourceTypeFromUrl(url);
    }
  }

  if (input.type !== undefined) {
    if (!isSourceType(input.type)) throw new Error("来源类型不支持");
    data.type = input.type;
  }

  if (input.categoryId !== undefined) {
    const categoryId = input.categoryId.trim();
    if (!categoryId) throw new Error("请选择类别");
    await assertCategory(categoryId);
    data.categoryId = categoryId;
  }

  if (input.enabled !== undefined) {
    data.enabled = Boolean(input.enabled);
  }

  if (input.fetchFrequencyMinutes !== undefined) {
    data.fetchFrequencyMinutes = normalizeFrequency(input.fetchFrequencyMinutes);
  }

  return prisma.source.update({
    where: { id: sourceId },
    data,
    include: { category: true },
  });
}

export async function deleteSource(id: string) {
  await ensureDefaults();
  const sourceId = id.trim();
  if (!sourceId) throw new Error("来源不存在");
  return prisma.source.delete({ where: { id: sourceId } });
}
