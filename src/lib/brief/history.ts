import { markdownToHtml } from "@/lib/brief/export";

export type HistoryBriefSource = {
  id: string;
  title: string;
  date: Date;
  status: string;
  categoryScope: string;
  markdown: string;
  sections: Array<{
    id: string;
    name: string;
    items: unknown[];
  }>;
};

export type HistoryBriefCard = {
  id: string;
  title: string;
  dateLabel: string;
  status: string;
  markdown: string;
  categoryScope: string;
  categoryLabel: string;
  itemCount: number;
  previewHtml: string;
  sections: Array<{
    id: string;
    name: string;
    itemCount: number;
  }>;
};

export type RawBriefHistoryQuery = {
  q?: string;
  from?: string;
  to?: string;
  category?: string;
};

export type BriefHistoryQuery = {
  q?: string;
  from?: string;
  to?: string;
  category?: string;
  fromDate?: Date;
  toExclusiveDate?: Date;
};

function clean(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || undefined;
}

function parseDateInput(value: string | undefined) {
  const cleaned = clean(value);
  const match = cleaned?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
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

export function parseBriefHistoryQuery(raw: RawBriefHistoryQuery): BriefHistoryQuery {
  const fromDate = parseDateInput(raw.from);
  const toDate = parseDateInput(raw.to);
  const toExclusiveDate = toDate ? new Date(toDate.getTime() + 24 * 60 * 60 * 1000) : undefined;

  return {
    q: clean(raw.q),
    from: fromDate ? clean(raw.from) : undefined,
    to: toDate ? clean(raw.to) : undefined,
    category: clean(raw.category),
    fromDate,
    toExclusiveDate,
  };
}

function getCategoryLabel(categoryScope: string, categoryLabels: Map<string, string>) {
  if (categoryScope === "all") return "全部类别";
  return categoryLabels.get(categoryScope) ?? "未知类别";
}

export function briefStatusLabel(status: string) {
  if (status === "DRAFT") return "草稿";
  if (status === "READY") return "已就绪";
  if (status === "ARCHIVED") return "已归档";
  return status || "未生成";
}

export function toHistoryBriefCards(briefs: HistoryBriefSource[], categoryLabels = new Map<string, string>()): HistoryBriefCard[] {
  return briefs.map((brief) => {
    const sections = brief.sections
      .map((section) => ({
        id: section.id,
        name: section.name,
        itemCount: section.items.length,
      }))
      .filter((section) => section.itemCount > 0);

    return {
      id: brief.id,
      title: brief.title,
      dateLabel: brief.date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }),
      status: briefStatusLabel(brief.status),
      markdown: brief.markdown,
      categoryScope: brief.categoryScope,
      categoryLabel: getCategoryLabel(brief.categoryScope, categoryLabels),
      itemCount: sections.reduce((sum, section) => sum + section.itemCount, 0),
      previewHtml: brief.markdown ? markdownToHtml(brief.markdown) : "<p>暂无预览</p>",
      sections,
    };
  });
}

export function getInitialHistoryBriefId(briefs: HistoryBriefCard[]) {
  return briefs[0]?.id ?? null;
}
