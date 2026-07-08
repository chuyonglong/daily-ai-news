import type { SourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDefaults } from "@/lib/settings";

const SOURCE_TYPES: SourceType[] = ["RSS", "HTML", "HN", "GITHUB_TRENDING"];

export type CreateSourceInput = {
  name: string;
  type: SourceType;
  url: string;
  categoryId: string;
  fetchFrequencyMinutes?: number;
  enabled?: boolean;
};

export function isSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && SOURCE_TYPES.includes(value as SourceType);
}

export async function createSource(input: CreateSourceInput) {
  await ensureDefaults();
  const name = input.name.trim();
  const url = input.url.trim();
  const categoryId = input.categoryId.trim();

  if (!name) throw new Error("来源名称不能为空");
  if (!url) throw new Error("来源 URL 不能为空");
  if (!categoryId) throw new Error("请选择类别");
  if (!isSourceType(input.type)) throw new Error("来源类型不支持");

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("类别不存在");

  return prisma.source.create({
    data: {
      name,
      type: input.type,
      url,
      categoryId,
      enabled: input.enabled ?? true,
      fetchFrequencyMinutes: Math.max(60, Number(input.fetchFrequencyMinutes ?? 1440)),
    },
    include: { category: true },
  });
}
