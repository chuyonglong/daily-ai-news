import type { Prisma, Source } from "@prisma/client";
import { coerceBriefLanguage, coerceThemeMode, DEFAULT_APP_CONFIG, DEFAULT_CATEGORIES, DEFAULT_SOURCES, type AppConfig } from "@/lib/defaults";
import { safeNormalizeOpenAIBaseUrl, sortModelIds } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";
import { ensureSqliteSchema } from "@/lib/sqlite-schema";

const SETTINGS_KEY = "app_config";

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function coerceAppConfig(value: Record<string, unknown>): AppConfig {
  return {
    ...DEFAULT_APP_CONFIG,
    ...value,
    openaiApiKey: String(value.openaiApiKey ?? process.env.OPENAI_API_KEY ?? DEFAULT_APP_CONFIG.openaiApiKey),
    openaiBaseUrl: safeNormalizeOpenAIBaseUrl(String(value.openaiBaseUrl ?? DEFAULT_APP_CONFIG.openaiBaseUrl)),
    openaiModel: String(value.openaiModel ?? DEFAULT_APP_CONFIG.openaiModel),
    openaiModels: sortModelIds(Array.isArray(value.openaiModels) ? value.openaiModels : DEFAULT_APP_CONFIG.openaiModels),
    briefLanguage: coerceBriefLanguage(value.briefLanguage),
    themeMode: coerceThemeMode(value.themeMode),
  } as AppConfig;
}

export async function ensureDefaults() {
  await ensureSqliteSchema(prisma);

  await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: DEFAULT_APP_CONFIG },
    update: {},
  });

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({ where: { name: category.name }, create: category, update: {} });
  }

  const aiCategory = await prisma.category.findUniqueOrThrow({ where: { name: "AI" } });

  for (const source of DEFAULT_SOURCES) {
    const category = await prisma.category.findUnique({ where: { name: source.categoryName } });
    const { categoryName, ...sourceData } = source;
    await prisma.source.upsert({
      where: { name: source.name },
      create: { ...sourceData, categoryId: category?.id ?? aiCategory.id },
      update: { categoryId: category?.id ?? aiCategory.id },
    });
  }

  await prisma.source.updateMany({ where: { categoryId: null }, data: { categoryId: aiCategory.id } });
  await prisma.item.updateMany({ where: { categoryId: null }, data: { categoryId: aiCategory.id } });
  await prisma.brief.updateMany({ where: { categoryScope: "" }, data: { categoryScope: "all" } });
  const itemsWithoutCategory = await prisma.item.findMany({
    where: { categoryId: null },
    select: { id: true, source: { select: { categoryId: true } } },
  });
  for (const item of itemsWithoutCategory) {
    await prisma.item.update({ where: { id: item.id }, data: { categoryId: item.source.categoryId ?? aiCategory.id } });
  }
}

export async function getAppConfig(): Promise<AppConfig> {
  await ensureDefaults();
  const row = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  return coerceAppConfig(asRecord(row?.value));
}

export async function updateAppConfig(config: Partial<AppConfig>) {
  const current = await getAppConfig();
  const next = coerceAppConfig({ ...current, ...config });
  await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: next },
    update: { value: next },
  });
  return next;
}

export type SourceWithCategory = Source & { category: { id: string; name: string } | null };

export async function listSources(): Promise<SourceWithCategory[]> {
  await ensureDefaults();
  return prisma.source.findMany({ include: { category: true }, orderBy: [{ enabled: "desc" }, { name: "asc" }] });
}
