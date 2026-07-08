import type { Metadata } from "next";
import { BarChart3, Database, FileDown, FileText, Rss, Settings } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getAppConfig } from "@/lib/settings";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "每日 AI 资讯编辑台",
  description: "本地私有运行的 AI 资讯采集、摘要与草稿编辑台",
};

const navItems = [
  { href: "/", label: "今日简报", icon: FileText },
  { href: "/ingest", label: "采集中心", icon: FileDown },
  { href: "/sources", label: "来源管理", icon: Rss },
  { href: "/items", label: "资讯池", icon: Database },
  { href: "/briefs", label: "历史简报", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const config = await getAppConfig();

  return (
    <html lang="zh-CN" data-theme={config.themeMode}>
      <body>
        <div className="top-actions">
          <ThemeSwitcher initialThemeMode={config.themeMode} />
        </div>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              <div className="brand-title">每日 AI 资讯编辑台</div>
              <div className="brand-subtitle">采集 · 精编 · 编辑 · 导出</div>
            </div>
            <nav className="nav" aria-label="主导航">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a key={item.href} href={item.href}>
                    <Icon size={17} aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
