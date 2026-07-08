import { SourceManager } from "@/components/SourceManager";
import { listCategories } from "@/lib/categories";
import { listSourcesForManagement } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const [sources, categories] = await Promise.all([listSourcesForManagement(), listCategories()]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">来源管理</h1>
          <p className="page-kicker">集中维护资讯来源、类别、抓取频率和启用状态；采集中心只负责执行采集。</p>
        </div>
      </header>
      <SourceManager initialSources={sources} initialCategories={categories} />
    </>
  );
}
