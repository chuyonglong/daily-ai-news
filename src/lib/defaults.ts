import type { SourceType } from "@prisma/client";
import { DEFAULT_OPENAI_BASE_URL } from "@/lib/openai-client";

export type WorkflowMode = "draft_review" | "auto_ready";
export type ExportTemplate = "wechat" | "zhihu" | "juejin";
export type BriefLanguage = "zh" | "en" | "ja";
export type ThemeMode = "auto" | "light" | "dark";
export type BriefFillMode = "instant" | "typewriter";
export type CategoryScope = "all" | string;

export type DefaultCategory = {
  name: string;
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [{ name: "AI" }, { name: "\u8d22\u52a1" }];

export const BRIEF_LANGUAGE_OPTIONS: Array<{ value: BriefLanguage; label: string }> = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

export function isBriefLanguage(value: unknown): value is BriefLanguage {
  return BRIEF_LANGUAGE_OPTIONS.some((option) => option.value === value);
}

export function coerceBriefLanguage(value: unknown): BriefLanguage {
  return isBriefLanguage(value) ? value : "zh";
}

export const THEME_MODE_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODE_OPTIONS.some((option) => option.value === value);
}

export function coerceThemeMode(value: unknown): ThemeMode {
  return isThemeMode(value) ? value : "auto";
}

export const BRIEF_FILL_MODE_OPTIONS: Array<{ value: BriefFillMode; label: string }> = [
  { value: "instant", label: "\u4e00\u8d77\u586b\u5145" },
  { value: "typewriter", label: "\u6253\u5b57\u673a\u6548\u679c" },
];

export function isBriefFillMode(value: unknown): value is BriefFillMode {
  return BRIEF_FILL_MODE_OPTIONS.some((option) => option.value === value);
}

export function coerceBriefFillMode(value: unknown): BriefFillMode {
  return isBriefFillMode(value) ? value : "instant";
}

export type AppConfig = {
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  openaiModels: string[];
  defaultCategoryScope: CategoryScope;
  dailyRunTime: string;
  briefMinItems: number;
  briefMaxItems: number;
  briefLanguage: BriefLanguage;
  themeMode: ThemeMode;
  briefFillMode: BriefFillMode;
  languageStyle: string;
  workflowMode: WorkflowMode;
  exportTemplate: ExportTemplate;
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: DEFAULT_OPENAI_BASE_URL,
  openaiModel: "gpt-4.1-mini",
  openaiModels: [],
  defaultCategoryScope: "all",
  dailyRunTime: "08:30",
  briefMinItems: 8,
  briefMaxItems: 15,
  briefLanguage: "zh",
  themeMode: "auto",
  briefFillMode: "instant",
  languageStyle: "\u4e2d\u6587\u7cbe\u7f16\uff0c\u6e05\u6670\u3001\u514b\u5236\uff0c\u53ef\u76f4\u63a5\u8f6c\u53d1\u5230\u4e2d\u6587\u5185\u5bb9\u7ad9\u3002",
  workflowMode: "draft_review",
  exportTemplate: "wechat",
};

export type DefaultSource = {
  name: string;
  type: SourceType;
  url: string;
  categoryName: string;
  enabled: boolean;
  fetchFrequencyMinutes: number;
};

export const DEFAULT_SOURCES: DefaultSource[] = [
  { name: "OpenAI Blog", type: "RSS", url: "https://openai.com/news/rss.xml", categoryName: "AI", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Anthropic News", type: "RSS", url: "https://www.anthropic.com/news/rss.xml", categoryName: "AI", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Google AI Blog", type: "RSS", url: "https://blog.google/technology/ai/rss/", categoryName: "AI", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Google DeepMind Blog", type: "RSS", url: "https://deepmind.google/discover/blog/rss.xml", categoryName: "AI", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Microsoft AI Blog", type: "RSS", url: "https://blogs.microsoft.com/ai/feed/", categoryName: "AI", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Meta AI Blog", type: "RSS", url: "https://ai.meta.com/blog/rss/", categoryName: "AI", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Hugging Face Blog", type: "RSS", url: "https://huggingface.co/blog/feed.xml", categoryName: "AI", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Hacker News AI", type: "HN", url: "https://hn.algolia.com/api/v1/search_by_date?query=AI%20OR%20OpenAI%20OR%20LLM%20OR%20Claude%20OR%20Gemini&tags=story", categoryName: "AI", enabled: true, fetchFrequencyMinutes: 360 },
  { name: "GitHub AI Trending", type: "GITHUB_TRENDING", url: "https://github.com/trending?since=daily", categoryName: "AI", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Bloomberg", type: "RSS", url: "https://feeds.bloomberg.com/markets/news.rss", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Reuters", type: "HTML", url: "https://www.reuters.com/markets/", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Financial Times", type: "RSS", url: "https://www.ft.com/markets?format=rss", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Wall Street Journal", type: "RSS", url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "CNBC", type: "RSS", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Yahoo Finance", type: "RSS", url: "https://finance.yahoo.com/news/rssindex", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "MarketWatch", type: "RSS", url: "https://feeds.content.dowjones.io/public/rss/mw_marketpulse", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Forbes", type: "HTML", url: "https://www.forbes.com/money/", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "The Economist", type: "RSS", url: "https://www.economist.com/finance-and-economics/rss.xml", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
  { name: "Business Insider", type: "HTML", url: "https://www.businessinsider.com/finance", categoryName: "\u8d22\u52a1", enabled: true, fetchFrequencyMinutes: 720 },
];

export const BRIEF_SECTIONS = [
  "\u6a21\u578b\u53d1\u5e03",
  "\u4ea7\u54c1\u66f4\u65b0",
  "\u5f00\u6e90\u9879\u76ee",
  "\u7814\u7a76\u8fdb\u5c55",
  "\u884c\u4e1a\u52a8\u6001",
];
