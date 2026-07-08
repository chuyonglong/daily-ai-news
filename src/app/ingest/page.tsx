import { IngestCenter } from "@/components/IngestCenter";
import { listCategories } from "@/lib/categories";
import { defaultCategoryScope } from "@/lib/category-defaults";
import { getLatestIngestRunView } from "@/lib/ingest/runs";
import { getAppConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function IngestPage() {
  const [categories, config] = await Promise.all([listCategories(), getAppConfig()]);
  const initialDefaultCategoryScope = defaultCategoryScope(categories, config.defaultCategoryScope);
  const initialRun = await getLatestIngestRunView(initialDefaultCategoryScope);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">采集中心</h1>
          <p className="page-kicker">逐个来源抓取最新 AI 资讯，查看总进度和每个来源的采集结果。</p>
        </div>
        <a className="button" href="/">
          返回今日简报
        </a>
      </header>
      <IngestCenter initialRun={initialRun} initialCategories={categories} initialDefaultCategoryScope={initialDefaultCategoryScope} />
    </>
  );
}
