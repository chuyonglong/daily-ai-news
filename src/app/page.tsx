import { BriefEditor } from "@/components/BriefEditor";
import { listCategories } from "@/lib/categories";
import { getTodayBrief } from "@/lib/brief/generate";
import { defaultCategoryScope } from "@/lib/category-defaults";
import { prisma } from "@/lib/prisma";
import { ensureDefaults, getAppConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureDefaults();
  const categories = await listCategories();
  const defaultScope = defaultCategoryScope(categories);
  const [brief, config, itemCount, sourceCount, readyCount] = await Promise.all([
    getTodayBrief(defaultScope),
    getAppConfig(),
    prisma.item.count(),
    prisma.source.count({ where: { enabled: true } }),
    prisma.brief.count(),
  ]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">今日简报</h1>
          <p className="page-kicker">采集和生成已经分开：先到采集中心抓取资讯，再回到这里生成中文精编草稿。</p>
        </div>
      </header>
      <section className="stat-row" aria-label="运行概览">
        <div className="stat">
          <div className="stat-label">资讯总数</div>
          <div className="stat-value">{itemCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">启用来源</div>
          <div className="stat-value">{sourceCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">历史简报</div>
          <div className="stat-value">{readyCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">今日状态</div>
          <div className="stat-value">{brief?.status ?? "未生成"}</div>
        </div>
      </section>
      <BriefEditor briefId={brief?.id} initialMarkdown={brief?.markdown ?? ""} initialBriefLanguage={config.briefLanguage} categories={categories} />
    </>
  );
}
