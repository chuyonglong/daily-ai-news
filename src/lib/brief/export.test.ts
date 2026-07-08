import { describe, expect, it } from "vitest";
import { draftToExport, markdownToHtml } from "@/lib/brief/export";

const draft = {
  title: "今日 AI 简报",
  sections: [
    {
      name: "模型发布",
      items: [
        {
          title: "OpenAI 发布新模型",
          url: "https://openai.com/news",
          sourceName: "OpenAI Blog",
          summary: "新模型提升了推理和工具调用能力。",
          whyItMatters: "它会影响开发者选型和产品体验。",
          tags: ["模型发布", "OpenAI"],
          publishedAt: new Date("2026-07-01T06:05:00.000Z"),
          score: 92,
        },
      ],
    },
  ],
};

describe("brief export", () => {
  it("exports markdown and html for content sites", () => {
    const result = draftToExport(draft);

    expect(result.markdown).toContain("# 今日 AI 简报");
    expect(result.markdown).toContain("为什么重要");
    expect(result.html).toContain("<h1>今日 AI 简报</h1>");
    expect(result.html).toContain("<a href=\"https://openai.com/news\">");
  });

  it("converts basic markdown blocks", () => {
    expect(markdownToHtml("# 标题\n\n- 原文：https://example.com")).toContain("<ul>");
  });

  it("renders common markdown safely", () => {
    const html = markdownToHtml([
      "# **标题**",
      "",
      "> 引用 *强调*",
      "",
      "1. 打开 [OpenAI](https://openai.com)",
      "2. 复制 `code`",
      "",
      "```",
      "<script>alert(1)</script>",
      "```",
      "",
      "<img src=x onerror=alert(1)>",
    ].join("\n"));

    expect(html).toContain("<h1><strong>标题</strong></h1>");
    expect(html).toContain("<blockquote>引用 <em>强调</em></blockquote>");
    expect(html).toContain('<ol>');
    expect(html).toContain('<a href="https://openai.com">OpenAI</a>');
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
  });

  it("exports localized field labels", () => {
    expect(draftToExport(draft, "wechat", "zh").markdown).toContain("- 来源: OpenAI Blog");
    expect(draftToExport(draft, "wechat", "en").markdown).toContain("- Why it matters: 它会影响开发者选型和产品体验。");
    expect(draftToExport(draft, "wechat", "ja").markdown).toContain("- 出典: OpenAI Blog");
  });
  it("exports item publish time in markdown and html", () => {
    const result = draftToExport(draft, "wechat", "zh");

    expect(result.markdown).toContain("- \u53d1\u5e03\u65f6\u95f4: 2026/07/01 14:05");
    expect(result.html).toContain("\u53d1\u5e03\u65f6\u95f4: 2026/07/01 14:05");
  });

  it("omits publish time when a draft item has no publish time", () => {
    const draftWithoutPublishTime = {
      ...draft,
      sections: [
        {
          ...draft.sections[0],
          items: draft.sections[0].items.map(({ publishedAt: _publishedAt, ...item }) => item),
        },
      ],
    };

    expect(draftToExport(draftWithoutPublishTime, "wechat", "zh").markdown).not.toContain("\u53d1\u5e03\u65f6\u95f4");
  });
});
