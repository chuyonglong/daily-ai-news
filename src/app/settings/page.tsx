import { SettingsForm } from "@/components/SettingsForm";
import { listCategories } from "@/lib/categories";
import { getAppConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [config, categories] = await Promise.all([getAppConfig(), listCategories()]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">设置</h1>
          <p className="page-kicker">配置来源、OpenAI 模型、每日生成时间和中文内容站导出模板。</p>
        </div>
      </header>
      <SettingsForm initialConfig={config} categories={categories} />
    </>
  );
}
