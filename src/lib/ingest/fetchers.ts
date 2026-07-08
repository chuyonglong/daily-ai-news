import * as cheerio from "cheerio";
import Parser from "rss-parser";
import type { Source } from "@prisma/client";
import type { FetchedItem } from "@/lib/ingest/types";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "daily-ai-news-desk/0.1 (+local private news reader)",
  },
});

function cleanText(value: string | undefined | null, max = 1200) {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function parseDate(value: unknown): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function fetchRss(source: Source): Promise<FetchedItem[]> {
  const feed = await parser.parseURL(source.url);
  return feed.items
    .filter((item) => item.title && item.link)
    .slice(0, 30)
    .map((item) => ({
      title: item.title ?? "Untitled",
      url: item.link ?? source.url,
      publishedAt: parseDate(item.isoDate ?? item.pubDate),
      content: cleanText(item["content:encoded"] as string | undefined ?? item.content),
      excerpt: cleanText(item.contentSnippet ?? item.summary ?? item.content, 400),
      tags: item.categories?.slice(0, 5) ?? [],
      raw: item,
    }));
}

export async function fetchHtml(source: Source): Promise<FetchedItem[]> {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "daily-ai-news-desk/0.1" },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: FetchedItem[] = [];

  $("article a, main a, h2 a, h3 a").each((_, element) => {
    const title = cleanText($(element).text(), 180);
    const href = $(element).attr("href");
    if (!title || !href) return;
    const url = new URL(href, source.url).toString();
    if (seen.has(url)) return;
    seen.add(url);
    items.push({ title, url, excerpt: title, raw: { href } });
  });

  return items.slice(0, 30);
}

type HnHit = {
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  created_at?: string;
  points?: number;
  num_comments?: number;
  author?: string;
};

export async function fetchHackerNews(source: Source): Promise<FetchedItem[]> {
  const response = await fetch(source.url, { next: { revalidate: 0 } });
  if (!response.ok) throw new Error(`Failed to fetch HN: ${response.status}`);
  const json = (await response.json()) as { hits?: HnHit[] };
  return (json.hits ?? [])
    .filter((hit) => (hit.title || hit.story_title) && (hit.url || hit.story_url))
    .slice(0, 30)
    .map((hit) => {
      const points = hit.points ?? 0;
      const comments = hit.num_comments ?? 0;
      return {
        title: hit.title ?? hit.story_title ?? "Untitled",
        url: hit.url ?? hit.story_url ?? source.url,
        publishedAt: parseDate(hit.created_at),
        excerpt: `HN ${points} points, ${comments} comments${hit.author ? `, by ${hit.author}` : ""}`,
        tags: ["HN", "社区"],
        raw: hit,
      };
    });
}

export async function fetchGithubTrending(source: Source): Promise<FetchedItem[]> {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "daily-ai-news-desk/0.1" },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`Failed to fetch GitHub trending: ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const items: FetchedItem[] = [];

  $("article.Box-row").each((_, element) => {
    const repo = cleanText($(element).find("h2 a").text(), 160).replace(/\s+/g, "");
    const href = $(element).find("h2 a").attr("href");
    const description = cleanText($(element).find("p").text(), 500);
    const language = cleanText($(element).find('[itemprop="programmingLanguage"]').text(), 60);
    const starsText = cleanText($(element).find("a.Link--muted").first().text(), 80);
    if (!repo || !href) return;
    const haystack = `${repo} ${description}`.toLowerCase();
    const looksAi = /\b(ai|llm|agent|rag|diffusion|transformer|gpt|model|machine learning|deep learning|inference)\b/i.test(haystack);
    if (!looksAi) return;
    items.push({
      title: repo,
      url: new URL(href, "https://github.com").toString(),
      excerpt: [description, language, starsText].filter(Boolean).join(" · "),
      tags: ["GitHub", "开源项目", language].filter(Boolean),
      raw: { repo, description, language, starsText },
    });
  });

  return items.slice(0, 30);
}

export async function fetchSourceItems(source: Source): Promise<FetchedItem[]> {
  switch (source.type) {
    case "RSS":
      return fetchRss(source);
    case "HTML":
      return fetchHtml(source);
    case "HN":
      return fetchHackerNews(source);
    case "GITHUB_TRENDING":
      return fetchGithubTrending(source);
    default:
      return [];
  }
}
