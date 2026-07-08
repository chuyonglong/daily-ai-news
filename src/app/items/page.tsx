import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { defaultCategoryScope } from "@/lib/category-defaults";
import { prisma } from "@/lib/prisma";
import { ensureDefaults } from "@/lib/settings";
import { buildTimeSortHref, ITEM_LIMIT_OPTIONS, parseItemsQuery } from "@/lib/items-query";
import { stringArrayFromJson } from "@/lib/json-fields";

export const dynamic = "force-dynamic";

type ItemsPageProps = {
  searchParams: Promise<{ source?: string; tag?: string; q?: string; category?: string; limit?: string; sort?: string }>;
};

function formatDate(date: Date | null) {
  if (!date) return "未知时间";
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function ItemsPage({ searchParams }: ItemsPageProps) {
  await ensureDefaults();
  const rawParams = await searchParams;
  const params = parseItemsQuery(rawParams);
  const [sources, categories] = await Promise.all([
    prisma.source.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  const selectedCategory = rawParams.category === undefined ? defaultCategoryScope(categories) : params.category;
  const where = {
    ...(params.source ? { sourceId: params.source } : {}),
    ...(selectedCategory ? { categoryId: selectedCategory } : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q } },
            { excerpt: { contains: params.q } },
          ],
        }
      : {}),
  };
  const rawItems = await prisma.item.findMany({
    where,
    include: { source: true },
    orderBy: [{ publishedAt: params.sort }, { createdAt: params.sort }],
  });
  const filteredItems = rawItems
    .map((item) => ({ ...item, tags: stringArrayFromJson(item.tags) }))
    .filter((item) => (params.tag ? item.tags.includes(params.tag) : true));
  const total = filteredItems.length;
  const items = filteredItems.slice(0, params.limit);
  const tags = Array.from(new Set(items.flatMap((item) => item.tags))).filter(Boolean).slice(0, 24);
  const timeSortHref = buildTimeSortHref(rawParams);
  const timeSortLabel = params.sort === "desc" ? "时间 ↓" : "时间 ↑";

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">资讯池</h1>
          <p className="page-kicker">共 {total} 条，按来源、标签和关键词筛选，方便检查每天的候选资讯。</p>
        </div>
      </header>

      <section className="items-page-shell">
        <div className="panel">
          <div className="panel-body">
            <form className="toolbar" action="/items">
              <input type="hidden" name="sort" value={params.sort} />
              <input type="hidden" name="limit" value={String(params.limit)} />
              <input name="q" placeholder="搜索标题或摘要" defaultValue={params.q ?? ""} style={{ width: 240 }} />
              <select name="source" defaultValue={params.source ?? ""} style={{ width: 220 }}>
                <option value="">全部来源</option>
                {sources.map((source) => (
                  <option value={source.id} key={source.id}>{source.name}</option>
                ))}
              </select>
              <select name="category" defaultValue={selectedCategory ?? ""} style={{ width: 180 }}>
                <option value="">全部类别</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>{category.name}</option>
                ))}
              </select>
              <select name="tag" defaultValue={params.tag ?? ""} style={{ width: 180 }}>
                <option value="">全部标签</option>
                {tags.map((tag) => (
                  <option value={tag} key={tag}>{tag}</option>
                ))}
              </select>
              <button className="button primary" type="submit">筛选</button>
              <a className="button" href="/items">清空</a>
            </form>
          </div>
        </div>

        <div className="items-results">
          {items.length === 0 ? (
            <div className="empty">暂无资讯。回到今日简报页点击“采集”即可抓取默认来源。</div>
          ) : (
            <div className="table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th className="items-title-cell">标题</th>
                    <th>来源</th>
                    <th>标签</th>
                    <th>评分</th>
                    <th>
                      <a className="sort-link" href={timeSortHref}>{timeSortLabel}</a>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="items-title-cell">
                        <a href={item.url} target="_blank" rel="noreferrer"><strong>{item.title}</strong></a>
                        <div className="meta">{item.excerpt || item.aiSummary || item.canonicalUrl}</div>
                      </td>
                      <td>{item.source.name}</td>
                      <td>
                        <div className="tag-list">
                          {item.tags.slice(0, 4).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                        </div>
                      </td>
                      <td>{item.importance}</td>
                      <td className="meta">{formatDate(item.publishedAt ?? item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="items-footer">
          <form className="items-limit-form" action="/items">
            <input type="hidden" name="q" value={params.q ?? ""} />
            <input type="hidden" name="source" value={params.source ?? ""} />
            <input type="hidden" name="category" value={selectedCategory ?? ""} />
            <input type="hidden" name="tag" value={params.tag ?? ""} />
            <input type="hidden" name="sort" value={params.sort} />
            <AutoSubmitSelect
              className="items-limit-field"
              name="limit"
              value={String(params.limit)}
              label="显示条数"
              options={ITEM_LIMIT_OPTIONS.map((limit) => ({ value: String(limit), label: `${limit} 条` }))}
            />
          </form>
        </footer>
      </section>
    </>
  );
}
