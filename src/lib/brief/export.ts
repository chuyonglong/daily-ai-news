import type { Brief, BriefItem, BriefSection } from "@prisma/client";
import type { BriefDraft, ExportResult } from "@/lib/brief/types";
import type { BriefLanguage, ExportTemplate } from "@/lib/defaults";
import { stringArrayFromJson } from "@/lib/json-fields";

type BriefWithSections = Brief & {
  sections: Array<BriefSection & { items: BriefItem[] }>;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const TEMPLATE_NOTES: Record<BriefLanguage, Record<ExportTemplate, string>> = {
  zh: {
    wechat: "\u9002\u5408\u5fae\u4fe1\u516c\u4f17\u53f7\uff1a\u6bb5\u843d\u77ed\u3001\u94fe\u63a5\u4fdd\u7559\u5728\u6761\u76ee\u672b\u5c3e\u3002",
    zhihu: "\u9002\u5408\u77e5\u4e4e\uff1a\u4fdd\u7559\u6e05\u6670\u5c0f\u6807\u9898\u548c\u539f\u6587\u94fe\u63a5\u3002",
    juejin: "\u9002\u5408\u6398\u91d1\uff1a\u504f\u6280\u672f\u8bfb\u8005\uff0c\u6807\u7b7e\u548c\u9879\u76ee\u94fe\u63a5\u5b8c\u6574\u4fdd\u7559\u3002",
  },
  en: {
    wechat: "For WeChat Official Accounts: keep paragraphs short and keep links at the end of each item.",
    zhihu: "For Zhihu: keep clear subheadings and original links.",
    juejin: "For Juejin: write for technical readers and preserve tags and project links.",
  },
  ja: {
    wechat: "WeChat公式アカウント向け：段落は短くし、リンクは各項目の末尾に残す。",
    zhihu: "知乎向け：明確な小見出しと原文リンクを残す。",
    juejin: "掘金向け：技術読者を意識し、タグとプロジェクトリンクを残す。",
  },
};

const FIELD_LABELS: Record<BriefLanguage, { source: string; summary: string; whyItMatters: string; original: string }> = {
  zh: { source: "来源", summary: "摘要", whyItMatters: "为什么重要", original: "原文" },
  en: { source: "Source", summary: "Summary", whyItMatters: "Why it matters", original: "Original" },
  ja: { source: "出典", summary: "要約", whyItMatters: "重要な理由", original: "原文" },
};

export function templateNote(template: ExportTemplate, language: BriefLanguage = "zh") {
  return TEMPLATE_NOTES[language][template];
}

const PUBLISH_TIME_LABELS: Record<BriefLanguage, string> = {
  zh: "\u53d1\u5e03\u65f6\u95f4",
  en: "Published",
  ja: "\u516c\u958b\u65e5\u6642",
};

function formatPublishedAt(date: Date, language: BriefLanguage) {
  if (language === "en") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai",
    }).format(date);
  }
  return new Intl.DateTimeFormat(language === "ja" ? "ja-JP" : "zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  })
    .format(date)
    .replace(",", "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replaceTemplateNote(markdown: string, template: ExportTemplate, language: BriefLanguage = "zh") {
  const allNotes = Object.values(TEMPLATE_NOTES).flatMap((notes) => Object.values(notes));
  const notePattern = new RegExp(`^> (?:${allNotes.map(escapeRegExp).join("|")})$`, "m");
  return markdown.replace(notePattern, `> ${templateNote(template, language)}`);
}

export function draftToMarkdown(draft: BriefDraft, template: ExportTemplate = "wechat", language: BriefLanguage = "zh") {
  const labels = FIELD_LABELS[language];
  const lines: string[] = [`# ${draft.title}`, "", `> ${templateNote(template, language)}`, ""];
  for (const section of draft.sections) {
    if (section.items.length === 0) continue;
    lines.push(`## ${section.name}`, "");
    section.items.forEach((item, index) => {
      const tagText = item.tags.length ? ` ${item.tags.map((tag) => `#${tag}`).join(" ")}` : "";
      lines.push(`### ${index + 1}. ${item.title}`);
      lines.push(`- ${labels.source}: ${item.sourceName}${tagText}`);
      if (item.publishedAt) lines.push(`- ${PUBLISH_TIME_LABELS[language]}: ${formatPublishedAt(item.publishedAt, language)}`);
      lines.push(`- ${labels.summary}: ${item.summary}`);
      lines.push(`- ${labels.whyItMatters}: ${item.whyItMatters}`);
      lines.push(`- ${labels.original}: ${item.url}`);
      lines.push("");
    });
  }
  return lines.join("\n").trim() + "\n";
}

function renderInlineMarkdown(value: string) {
  const placeholders: string[] = [];
  const stash = (html: string) => {
    const token = `@@MDTOKEN${placeholders.length}@@`;
    placeholders.push(html);
    return token;
  };

  let rendered = value.replace(/`([^`]+)`/g, (_match, code: string) => stash(`<code>${escapeHtml(code)}</code>`));
  rendered = escapeHtml(rendered);
  rendered = rendered.replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, (_match, label: string, url: string) => stash(`<a href="${url}">${label}</a>`));
  rendered = rendered.replace(/(https?:\/\/[^\s<]+)/g, (url) => stash(`<a href="${url}">${url}</a>`));
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  rendered = rendered.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return rendered.replace(/@@MDTOKEN(\d+)@@/g, (_match, index: string) => placeholders[Number(index)] ?? "");
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const openList = (type: "ul" | "ol") => {
    if (listType === type) return;
    closeList();
    html.push(`<${type}>`);
    listType = type;
  };

  const closeCodeBlock = () => {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
    inCodeBlock = false;
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      closeList();
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        inCodeBlock = true;
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);

    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
    } else if (line.startsWith("> ")) {
      closeList();
      html.push(`<blockquote>${renderInlineMarkdown(line.slice(2))}</blockquote>`);
    } else if (unordered) {
      openList("ul");
      html.push(`<li>${renderInlineMarkdown(unordered[1])}</li>`);
    } else if (ordered) {
      openList("ol");
      html.push(`<li>${renderInlineMarkdown(ordered[1])}</li>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      html.push(`<p>${renderInlineMarkdown(line)}</p>`);
    }
  }
  if (inCodeBlock) closeCodeBlock();
  closeList();
  return html.join("\n");
}

export function draftToExport(draft: BriefDraft, template: ExportTemplate = "wechat", language: BriefLanguage = "zh"): ExportResult {
  const markdown = draftToMarkdown(draft, template, language);
  return { markdown, html: markdownToHtml(markdown) };
}

export function dbBriefToDraft(brief: BriefWithSections): BriefDraft {
  return {
    title: brief.title,
    sections: brief.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        name: section.name,
        items: section.items
          .sort((a, b) => a.order - b.order)
          .map((item) => ({
            itemId: item.itemId ?? undefined,
            title: item.title,
            url: item.url,
            sourceName: item.sourceName,
            publishedAt: item.publishedAt ?? undefined,
            summary: item.summary,
            whyItMatters: item.whyItMatters,
            tags: stringArrayFromJson(item.tags),
            score: item.score,
          })),
      })),
  };
}
