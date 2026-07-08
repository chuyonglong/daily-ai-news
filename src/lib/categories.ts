import { prisma } from "@/lib/prisma";
import { ensureDefaults } from "@/lib/settings";

export async function listCategories() {
  await ensureDefaults();
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(name: string) {
  await ensureDefaults();
  const normalized = name.trim();
  if (!normalized) throw new Error("类别名称不能为空");
  return prisma.category.upsert({
    where: { name: normalized },
    create: { name: normalized },
    update: {},
  });
}
