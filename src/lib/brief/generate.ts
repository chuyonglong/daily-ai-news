import OpenAI from "openai";
import type { BriefStatus, Category, Item, Source } from "@prisma/client";
import { coerceBriefLanguage, type AppConfig, type BriefLanguage } from "@/lib/defaults";
import { prisma } from "@/lib/prisma";
import { getAppConfig } from "@/lib/settings";
import { draftToExport } from "@/lib/brief/export";
import type { BriefDraft, BriefItemDraft, BriefSectionDraft } from "@/lib/brief/types";
import { stringArrayFromJson } from "@/lib/json-fields";

type DbItemWithSource = Item & {
  category: Category | null;
  source: Source & { category: Category | null };
};

type ItemWithSource = Omit<DbItemWithSource, "tags"> & {
  tags: string[];
};

type AiBriefResponse = {
  sections?: Array<{
    name?: string;
    items?: Array<{
      itemId?: string;
      title?: string;
      summary?: string;
      whyItMatters?: string;
      tags?: string[];
      score?: number;
    }>;
  }>;
};

type SectionKey = "model" | "product" | "openSource" | "research" | "industry";

type GenerateTodayBriefOptions = {
  categoryScope: string;
  briefLanguage?: BriefLanguage;
  publishDate?: string;
  publishDateFrom?: string;
  publishDateTo?: string;
};

const SECTION_KEYS: SectionKey[] = ["model", "product", "openSource", "research", "industry"];

const SECTION_NAMES: Record<BriefLanguage, Record<SectionKey, string>> = {
  zh: {
    model: "模型发布",
    product: "产品更新",
    openSource: "开源项目",
    research: "研究进展",
    industry: "行业动态",
  },
  en: {
    model: "Model releases",
    product: "Product updates",
    openSource: "Open source projects",
    research: "Research progress",
    industry: "Industry moves",
  },
  ja: {
    model: "モデル発表",
    product: "製品アップデート",
    openSource: "オープンソースプロジェクト",
    research: "研究進展",
    industry: "業界動向",
  },
};

const LANGUAGE_PROMPTS: Record<BriefLanguage, { editor: string; languageLine: string; lengthLine: string; system: string }> = {
  zh: {
    editor: "你是一个中文资讯编辑。请从候选资讯中挑选最重要的内容，生成每日精编简报。",
    languageLine: "请使用中文输出标题、分组名、摘要、重要性说明和标签。",
    lengthLine: "summary 45-90 个中文字符，whyItMatters 30-70 个中文字符。",
    system: "你只输出可解析 JSON。",
  },
  en: {
    editor: "You are an English-language news editor. Select the most important candidate items and produce a concise daily brief.",
    languageLine: "Write the brief in English, including section names, summaries, why-it-matters notes, and tags.",
    lengthLine: "summary should be 35-70 English words, and whyItMatters should be 20-50 English words.",
    system: "Return only parseable JSON.",
  },
  ja: {
    editor: "あなたは日本語のニュース編集者です。候補ニュースから重要な項目を選び、毎日の簡潔なブリーフを作成してください。",
    languageLine: "見出し、分組名、要約、重要な理由、タグは日本語で出力してください。",
    lengthLine: "summary は日本語で80-160字程度、whyItMatters は40-110字程度にしてください。",
    system: "解析可能なJSONのみを返してください。",
  },
};

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseDateInput(value: string | undefined) {
  const match = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }
  return date;
}

function selectedPublishDate(value: string | undefined) {
  return parseDateInput(value) ?? startOfUtcDay();
}

function selectedPublishDateRange(options: Pick<GenerateTodayBriefOptions, "publishDate" | "publishDateFrom" | "publishDateTo">) {
  const from = parseDateInput(options.publishDateFrom) ?? selectedPublishDate(options.publishDate);
  const parsedTo = parseDateInput(options.publishDateTo);
  const to = parsedTo && parsedTo.getTime() >= from.getTime() ? parsedTo : from;
  return {
    from,
    to,
    toExclusive: new Date(to.getTime() + 24 * 60 * 60 * 1000),
  };
}

export function briefTitle(date = new Date(), language: BriefLanguage = "zh", categoryLabel = "AI") {
  if (language === "en") {
    return `${date.toLocaleDateString("en-US", { month: "long", day: "numeric" })} ${categoryLabel} Brief`;
  }
  if (language === "ja") {
    return `${date.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })} ${categoryLabel} ニュースブリーフ`;
  }
  return `${date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })} ${categoryLabel} 资讯简报`;
}

function classify(item: ItemWithSource): SectionKey {
  const text = `${item.title} ${item.excerpt ?? ""} ${item.tags.join(" ")}`.toLowerCase();
  if (/github|open source|repo|library|framework|开源/.test(text)) return "openSource";
  if (/paper|research|benchmark|dataset|eval|研究/.test(text)) return "research";
  if (/launch|release|model|gpt|claude|gemini|llama|模型/.test(text)) return "model";
  if (/product|app|api|platform|copilot|产品/.test(text)) return "product";
  return "industry";
}

function categoryName(item: ItemWithSource) {
  return item.category?.name ?? item.source.category?.name ?? "未分类";
}

function localSummary(item: ItemWithSource) {
  const excerpt = item.excerpt || item.content || item.title;
  return excerpt.length > 120 ? `${excerpt.slice(0, 118)}...` : excerpt;
}

function itemPublishTime(item: Pick<Item, "publishedAt" | "createdAt">) {
  return item.publishedAt ?? undefined;
}

function normalizeItem(item: DbItemWithSource): ItemWithSource {
  return { ...item, tags: stringArrayFromJson(item.tags) };
}

function localWhyItMatters(item: ItemWithSource, language: BriefLanguage) {
  const section = classify(item);
  const source = item.source.name;
  const reason: Record<BriefLanguage, Record<SectionKey, string>> = {
    zh: {
      model: "可能影响模型能力边界、API 选型或后续产品路线，值得跟踪实际可用性。",
      product: "它可能改变现有工具链或用户工作流，适合评估是否能马上用到。",
      openSource: "开源实现便于快速试用、二次开发或观察社区采用速度。",
      research: "研究信号可能提前指向下一波能力和工程实践变化。",
      industry: "这是来自生态里的重要信号，适合判断产业方向和机会窗口。",
    },
    en: {
      model: "It may shift capability boundaries, API choices, or product roadmaps, so practical availability is worth tracking.",
      product: "It may change existing toolchains or user workflows, making it worth evaluating for immediate adoption.",
      openSource: "The open-source implementation makes it easier to test quickly, extend locally, and watch community adoption.",
      research: "This research signal may point early to the next wave of capabilities and engineering practices.",
      industry: "It is an important ecosystem signal for judging industry direction and opportunity windows.",
    },
    ja: {
      model: "モデル能力、API選定、製品ロードマップに影響する可能性があり、実用性の追跡に価値があります。",
      product: "既存のツールチェーンや利用者の作業フローを変える可能性があり、導入評価に向いています。",
      openSource: "オープンソース実装は素早い試用、二次開発、コミュニティ採用の観察に向いています。",
      research: "研究シグナルは次の能力変化やエンジニアリング実践を早めに示す可能性があります。",
      industry: "業界の方向性や機会を判断するうえで重要なエコシステムシグナルです。",
    },
  };
  const suffix = language === "en" ? ` Source: ${source}.` : language === "ja" ? ` 出典：${source}。` : `来源：${source}。`;
  return `${reason[language][section]}${suffix}`;
}

function draftItem(item: ItemWithSource, language: BriefLanguage): BriefItemDraft {
  const category = categoryName(item);
  return {
    itemId: item.id,
    title: item.title,
    url: item.url,
    sourceName: item.source.name,
    publishedAt: itemPublishTime(item),
    summary: localSummary(item),
    whyItMatters: localWhyItMatters(item, language),
    tags: Array.from(new Set([category, SECTION_NAMES[language][classify(item)], ...item.tags])).slice(0, 4),
    score: item.importance,
  };
}

function groupByCategory(items: ItemWithSource[]) {
  const sections = new Map<string, ItemWithSource[]>();
  for (const item of items) {
    const name = categoryName(item);
    sections.set(name, [...(sections.get(name) ?? []), item]);
  }
  return sections;
}

function fallbackDraft(items: ItemWithSource[], maxItems: number, language: BriefLanguage, categoryScope: string, date = new Date()): BriefDraft {
  const selected = items.slice(0, maxItems);
  const grouped = groupByCategory(selected);
  const categoryLabel = categoryScope === "all" ? "全部类别" : categoryName(selected[0]);
  return {
    title: briefTitle(date, language, categoryLabel),
    sections: [...grouped.entries()].map(([name, sectionItems]) => ({
      name,
      items: sectionItems.map((item) => draftItem(item, language)),
    })),
  };
}

export function buildPrompt(items: ItemWithSource[], maxItems: number, languageStyle: string, language: BriefLanguage = "zh") {
  const compact = items.slice(0, Math.max(maxItems * 2, 20)).map((item) => ({
    itemId: item.id,
    title: item.title,
    source: item.source.name,
    url: item.url,
    excerpt: item.excerpt ?? item.content?.slice(0, 500) ?? "",
    tags: item.tags,
    importance: item.importance,
  }));
  const languagePrompt = LANGUAGE_PROMPTS[language];
  const sectionNames = SECTION_KEYS.map((key) => SECTION_NAMES[language][key]).join("、");

  return [
    languagePrompt.editor,
    languagePrompt.languageLine,
    `风格要求：${languageStyle}`,
    `总条数控制在 ${maxItems} 条以内，优先覆盖不同主题。`,
    `主题只能使用：${sectionNames}。`,
    `每条必须包含 itemId、title、summary、whyItMatters、tags、score。${languagePrompt.lengthLine}`,
    `只返回 JSON，不要 Markdown，不要额外解释。JSON 形状：{"sections":[{"name":"${SECTION_NAMES[language].model}","items":[...]}]}`,
    JSON.stringify(compact),
  ].join("\n\n");
}

function buildCategoryPrompt(items: ItemWithSource[], maxItems: number, languageStyle: string, language: BriefLanguage) {
  const compact = items.slice(0, Math.max(maxItems * 2, 20)).map((item) => ({
    itemId: item.id,
    title: item.title,
    category: categoryName(item),
    source: item.source.name,
    url: item.url,
    excerpt: item.excerpt ?? item.content?.slice(0, 500) ?? "",
    tags: item.tags,
    importance: item.importance,
  }));
  const languagePrompt = LANGUAGE_PROMPTS[language];
  const categories = [...groupByCategory(items).keys()].join("、");

  return [
    languagePrompt.editor,
    languagePrompt.languageLine,
    `风格要求：${languageStyle}`,
    `总条数控制在 ${maxItems} 条以内。`,
    `必须按业务类别分组，分组名只能使用：${categories}。`,
    `每条必须包含 itemId、title、summary、whyItMatters、tags、score。${languagePrompt.lengthLine}`,
    `只返回 JSON，不要 Markdown，不要额外解释。JSON 形状：{"sections":[{"name":"${[...groupByCategory(items).keys()][0] ?? "AI"}","items":[...]}]}`,
    JSON.stringify(compact),
  ].join("\n\n");
}

function coerceAiDraft(response: AiBriefResponse, items: ItemWithSource[], language: BriefLanguage, categoryScope: string, date = new Date()): BriefDraft {
  const byId = new Map(items.map((item) => [item.id, item]));
  const categoryNames = [...groupByCategory(items).keys()];
  const sections: BriefSectionDraft[] = categoryNames.map((name) => ({ name, items: [] }));
  const sectionByName = new Map(sections.map((section) => [section.name, section]));

  for (const section of response.sections ?? []) {
    const target = section.name ? sectionByName.get(section.name) : undefined;
    if (!target) continue;
    for (const aiItem of section.items ?? []) {
      if (!aiItem.itemId) continue;
      const sourceItem = byId.get(aiItem.itemId);
      if (!sourceItem) continue;
      target.items.push({
        itemId: sourceItem.id,
        title: aiItem.title?.trim() || sourceItem.title,
        url: sourceItem.url,
        sourceName: sourceItem.source.name,
        publishedAt: itemPublishTime(sourceItem),
        summary: aiItem.summary?.trim() || localSummary(sourceItem),
        whyItMatters: aiItem.whyItMatters?.trim() || localWhyItMatters(sourceItem, language),
        tags: Array.from(new Set([categoryName(sourceItem), ...(aiItem.tags ?? sourceItem.tags)])).slice(0, 4),
        score: Math.max(0, Math.min(100, Number(aiItem.score ?? sourceItem.importance))),
      });
    }
  }

  const categoryLabel = categoryScope === "all" ? "全部类别" : categoryName(items[0]);
  return { title: briefTitle(date, language, categoryLabel), sections };
}

async function aiDraft(items: ItemWithSource[], maxItems: number, apiKey: string, baseURL: string, model: string, languageStyle: string, language: BriefLanguage, categoryScope: string, date: Date) {
  const openai = new OpenAI({ apiKey, baseURL });
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: LANGUAGE_PROMPTS[language].system },
      { role: "user", content: buildCategoryPrompt(items, maxItems, languageStyle, language) },
    ],
  });
  const content = completion.choices[0]?.message.content ?? "{}";
  return coerceAiDraft(JSON.parse(content) as AiBriefResponse, items, language, categoryScope, date);
}

export function resolveBriefLanguage(options: Pick<GenerateTodayBriefOptions, "briefLanguage"> | undefined, config: Pick<AppConfig, "briefLanguage">): BriefLanguage {
  return coerceBriefLanguage(options?.briefLanguage ?? config.briefLanguage);
}

async function getCandidateItems(maxItems: number, categoryScope: string, publishDateFrom: Date, publishDateToExclusive: Date): Promise<ItemWithSource[]> {
  const categoryFilter = categoryScope === "all" ? {} : { categoryId: categoryScope };
  const items = await prisma.item.findMany({
    where: { ...categoryFilter, publishedAt: { gte: publishDateFrom, lt: publishDateToExclusive } },
    include: { category: true, source: { include: { category: true } } },
    orderBy: [{ importance: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: Math.max(maxItems * 3, 30),
  });
  return items.map(normalizeItem);
}

async function replaceBriefSections(briefId: string, draft: BriefDraft) {
  await prisma.briefSection.deleteMany({ where: { briefId } });
  for (const [sectionIndex, section] of draft.sections.entries()) {
    await prisma.briefSection.create({
      data: {
        briefId,
        name: section.name,
        order: sectionIndex,
        items: {
          create: section.items.map((item, itemIndex) => ({
            itemId: item.itemId,
            title: item.title,
            url: item.url,
            sourceName: item.sourceName,
            publishedAt: item.publishedAt,
            summary: item.summary,
            whyItMatters: item.whyItMatters,
            tags: item.tags,
            score: item.score,
            order: itemIndex,
          })),
        },
      },
    });
  }
}

export async function generateTodayBrief(options: GenerateTodayBriefOptions) {
  const config = await getAppConfig();
  const categoryScope = options.categoryScope.trim();
  if (!categoryScope) throw new Error("请选择类别");

  const briefLanguage = resolveBriefLanguage(options, config);
  const maxItems = Math.max(1, Math.min(20, Number(config.briefMaxItems || 12)));
  const publishDateRange = selectedPublishDateRange(options);
  const publishDate = publishDateRange.from;
  const items = await getCandidateItems(maxItems, categoryScope, publishDateRange.from, publishDateRange.toExclusive);
  if (items.length === 0) throw new Error("该时间段暂无可生成的资讯，请先采集");

  let draft = fallbackDraft(items, maxItems, briefLanguage, categoryScope, publishDate);
  let mode: "openai" | "fallback" = "fallback";

  if (config.openaiApiKey) {
    try {
      draft = await aiDraft(items, maxItems, config.openaiApiKey, config.openaiBaseUrl, config.openaiModel, config.languageStyle, briefLanguage, categoryScope, publishDate);
      mode = "openai";
    } catch (error) {
      console.error("OpenAI brief generation failed, using fallback draft:", error);
    }
  }

  const exportResult = draftToExport(draft, config.exportTemplate, briefLanguage);
  const date = publishDate;
  const status: BriefStatus = config.workflowMode === "auto_ready" ? "READY" : "DRAFT";
  const parameters = {
    mode,
    model: config.openaiModel,
    baseUrl: config.openaiBaseUrl,
    language: briefLanguage,
    categoryScope,
    publishDate: publishDate.toISOString().slice(0, 10),
    publishDateFrom: publishDateRange.from.toISOString().slice(0, 10),
    publishDateTo: publishDateRange.to.toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
  };
  const brief = await prisma.brief.upsert({
    where: { date_categoryScope: { date, categoryScope } },
    create: { date, categoryScope, status, title: draft.title, markdown: exportResult.markdown, html: exportResult.html, parameters },
    update: { status, title: draft.title, markdown: exportResult.markdown, html: exportResult.html, parameters },
  });

  await replaceBriefSections(brief.id, draft);
  return prisma.brief.findUniqueOrThrow({
    where: { id: brief.id },
    include: { sections: { include: { items: true }, orderBy: { order: "asc" } } },
  });
}

export async function getTodayBrief(categoryScope = "all") {
  return prisma.brief.findUnique({
    where: { date_categoryScope: { date: startOfDay(), categoryScope } },
    include: { sections: { include: { items: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
  });
}

export async function getBriefWithSections(id: string) {
  return prisma.brief.findUnique({
    where: { id },
    include: { sections: { include: { items: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
  });
}

export async function saveBriefMarkdown(id: string, markdown: string) {
  const { markdownToHtml } = await import("@/lib/brief/export");
  return prisma.brief.update({ where: { id }, data: { markdown, html: markdownToHtml(markdown) } });
}
