import { BriefHistoryBrowser } from "@/components/BriefHistoryBrowser";
import { parseBriefHistoryQuery, toHistoryBriefCards } from "@/lib/brief/history";
import { defaultCategoryScope } from "@/lib/category-defaults";
import { prisma } from "@/lib/prisma";
import { ensureDefaults, getAppConfig } from "@/lib/settings";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type BriefsPageProps = {
  searchParams: Promise<{ q?: string; from?: string; to?: string; category?: string }>;
};

export default async function BriefsPage({ searchParams }: BriefsPageProps) {
  await ensureDefaults();
  const rawParams = await searchParams;
  const filters = parseBriefHistoryQuery(rawParams);
  const [categories, config] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getAppConfig(),
  ]);
  const selectedCategory = rawParams.category === undefined ? defaultCategoryScope(categories, config.defaultCategoryScope) : filters.category;
  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.fromDate) dateFilter.gte = filters.fromDate;
  if (filters.toExclusiveDate) dateFilter.lt = filters.toExclusiveDate;

  const where: Prisma.BriefWhereInput = {
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q } },
            { markdown: { contains: filters.q } },
          ],
        }
      : {}),
    ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    ...(selectedCategory ? { categoryScope: selectedCategory } : {}),
  };

  const briefs = await prisma.brief.findMany({
    where,
    include: {
      sections: {
        include: { items: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { date: "desc" },
    take: 60,
  });
  const historyBriefs = toHistoryBriefCards(
    briefs,
    new Map(categories.map((category) => [category.id, category.name])),
  );
  const formFilters = {
    q: filters.q,
    from: filters.from,
    to: filters.to,
    category: selectedCategory,
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">历史简报</h1>
          <p className="page-kicker">左侧选择历史草稿，右侧按今日简报的富文本预览格式查看内容。</p>
        </div>
      </header>

      {historyBriefs.length === 0 ? (
        <>
          <BriefHistoryBrowser briefs={historyBriefs} categories={categories} filters={formFilters} />
          <div className="empty">暂无历史简报。生成今日草稿后会出现在这里。</div>
        </>
      ) : (
        <BriefHistoryBrowser briefs={historyBriefs} categories={categories} filters={formFilters} />
      )}
    </>
  );
}
