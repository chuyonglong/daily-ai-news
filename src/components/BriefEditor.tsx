"use client";

import { Clipboard, Download, FileDown, Save, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { markdownToHtml } from "@/lib/brief/export";
import { defaultCategoryScope } from "@/lib/category-defaults";
import { BRIEF_LANGUAGE_OPTIONS, type BriefLanguage } from "@/lib/defaults";

type BriefEditorProps = {
  briefId?: string;
  initialMarkdown: string;
  initialBriefLanguage: BriefLanguage;
  categories: Array<{ id: string; name: string }>;
};

const TEXT = {
  operationFailed: "\u64cd\u4f5c\u5931\u8d25",
  selectCategory: "\u8bf7\u9009\u62e9\u7c7b\u522b",
  regenerate: "\u91cd\u65b0\u751f\u6210",
  generate: "\u751f\u6210",
  regenerated: "\u5df2\u91cd\u65b0\u751f\u6210\u5e76\u66ff\u6362\u5f53\u524d\u8349\u7a3f",
  generated: "\u5df2\u751f\u6210\u4eca\u65e5\u8349\u7a3f",
  languageSaved: "\u7b80\u62a5\u8bed\u8a00\u5df2\u4fdd\u5b58",
  noDraft: "\u8fd8\u6ca1\u6709\u8349\u7a3f\uff0c\u8bf7\u5148\u751f\u6210\u4eca\u65e5\u7b80\u62a5\u3002",
  saved: "\u5df2\u4fdd\u5b58\u8349\u7a3f",
  exported: "\u5df2\u6309\u5f53\u524d\u6a21\u677f\u91cd\u65b0\u5bfc\u51fa",
  markdownCopied: "Markdown \u5df2\u590d\u5236",
  htmlCopied: "\u5bcc\u6587\u672c HTML \u5df2\u590d\u5236",
  title: "\u4eca\u65e5\u8349\u7a3f",
  emptyMeta: "\u5148\u5230\u91c7\u96c6\u4e2d\u5fc3\u6293\u53d6\u8d44\u8baf\uff0c\u518d\u5728\u8fd9\u91cc\u751f\u6210\u8349\u7a3f",
  ingest: "\u53bb\u91c7\u96c6",
  openIngest: "\u6253\u5f00\u91c7\u96c6\u4e2d\u5fc3",
  languageTitle: "\u9009\u62e9\u751f\u6210\u8bed\u8a00",
  categoryTitle: "\u9009\u62e9\u751f\u6210\u7b80\u62a5\u7684\u7c7b\u522b",
  publishDateTitle: "\u9009\u62e9\u8d44\u8baf\u53d1\u5e03\u65f6\u95f4",
  allCategories: "\u5168\u90e8\u7c7b\u522b",
  generateTitle: "\u6839\u636e\u8d44\u8baf\u6c60\u751f\u6210\u4eca\u65e5\u8349\u7a3f",
  save: "\u4fdd\u5b58",
  saveTitle: "\u4fdd\u5b58\u5f53\u524d Markdown \u8349\u7a3f",
  export: "\u5bfc\u51fa",
  exportTitle: "\u6309\u8bbe\u7f6e\u9875\u6a21\u677f\u91cd\u65b0\u751f\u6210\u5bfc\u51fa\u5185\u5bb9",
  copyMarkdown: "\u590d\u5236 Markdown",
  copyHtml: "\u590d\u5236\u5bcc\u6587\u672c HTML",
  richText: "\u5bcc\u6587\u672c",
  previewTitle: "\u5bcc\u6587\u672c\u9884\u89c8",
  emptyPreview: "\u6682\u65e0\u9884\u89c8",
  placeholder: "\u5148\u5230\u91c7\u96c6\u4e2d\u5fc3\u6293\u53d6\u8d44\u8baf\uff0c\u518d\u9009\u62e9\u7c7b\u522b\u5e76\u70b9\u51fb\u201c\u751f\u6210\u201d\u3002",
};

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(async () => ({ error: await response.text() }))) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? TEXT.operationFailed);
  return data as T;
}

function dateInputValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

export function BriefEditor({ briefId, initialMarkdown, initialBriefLanguage, categories }: BriefEditorProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [id, setId] = useState(briefId);
  const [briefLanguage, setBriefLanguage] = useState<BriefLanguage>(initialBriefLanguage);
  const [categoryScope, setCategoryScope] = useState(() => defaultCategoryScope(categories, ""));
  const [publishDate, setPublishDate] = useState(() => dateInputValue());
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasBrief = Boolean(id);
  const generateButtonLabel = hasBrief ? TEXT.regenerate : TEXT.generate;
  const wordCount = useMemo(() => markdown.replace(/\s/g, "").length, [markdown]);
  const previewHtml = useMemo(() => (markdown ? markdownToHtml(markdown) : ""), [markdown]);

  const runAction = (action: () => Promise<void>, success: string) => {
    setMessage("");
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : TEXT.operationFailed);
      }
    });
  };

  const generate = () =>
    runAction(async () => {
      if (!categoryScope) throw new Error(TEXT.selectCategory);
      const result = await postJson<{ id: string; markdown: string; html: string }>("/api/jobs/generate-brief", { categoryScope, briefLanguage, publishDate });
      setId(result.id);
      setMarkdown(result.markdown);
    }, hasBrief ? TEXT.regenerated : TEXT.generated);

  const updateBriefLanguage = (nextLanguage: BriefLanguage) => {
    setBriefLanguage(nextLanguage);
    runAction(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { briefLanguage: nextLanguage } }),
      });
      if (!response.ok) throw new Error(await response.text());
    }, TEXT.languageSaved);
  };

  const save = () =>
    runAction(async () => {
      if (!id) throw new Error(TEXT.noDraft);
      const response = await fetch(`/api/briefs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      if (!response.ok) throw new Error(await response.text());
    }, TEXT.saved);

  const exportDraft = () =>
    runAction(async () => {
      if (!id) throw new Error(TEXT.noDraft);
      const result = await postJson<{ markdown: string; html: string }>(`/api/briefs/${id}/export`, { markdown });
      setMarkdown(result.markdown);
    }, TEXT.exported);

  const copyMarkdown = () =>
    runAction(async () => {
      await navigator.clipboard.writeText(markdown);
    }, TEXT.markdownCopied);

  const copyHtml = () =>
    runAction(async () => {
      const blob = new Blob([previewHtml], { type: "text/html" });
      const fallback = async () => navigator.clipboard.writeText(previewHtml);
      if (typeof ClipboardItem === "undefined") {
        await fallback();
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]).catch(fallback);
    }, TEXT.htmlCopied);

  return (
    <div className="grid brief-editor-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{TEXT.title}</h2>
            <div className="meta">{hasBrief ? `${wordCount} \u5b57\uff0c\u53ef\u76f4\u63a5\u7f16\u8f91\u3001\u5220\u9664\u6761\u76ee\u6216\u8c03\u6574\u987a\u5e8f` : TEXT.emptyMeta}</div>
          </div>
          {message ? <span className="toast">{message}</span> : null}
        </div>
        <div className="panel-body">
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <a className="button" href="/ingest" title={TEXT.openIngest}>
              <FileDown size={16} />
              {TEXT.ingest}
            </a>
            <select className="toolbar-select" value={briefLanguage} onChange={(event) => updateBriefLanguage(event.target.value as BriefLanguage)} disabled={isPending} title={TEXT.languageTitle}>
              {BRIEF_LANGUAGE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select className="toolbar-select" value={categoryScope} onChange={(event) => setCategoryScope(event.target.value)} disabled={isPending} title={TEXT.categoryTitle}>
              <option value="">{TEXT.selectCategory}</option>
              <option value="all">{TEXT.allCategories}</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input className="toolbar-select" type="date" value={publishDate} onChange={(event) => setPublishDate(event.target.value)} disabled={isPending} title={TEXT.publishDateTitle} />
            <button className="button primary" onClick={generate} disabled={isPending} title={TEXT.generateTitle}>
              <Sparkles size={16} />
              {generateButtonLabel}
            </button>
            <button className="button" onClick={save} disabled={isPending || !hasBrief} title={TEXT.saveTitle}>
              <Save size={16} />
              {TEXT.save}
            </button>
            <button className="button" onClick={exportDraft} disabled={isPending || !hasBrief} title={TEXT.exportTitle}>
              <Download size={16} />
              {TEXT.export}
            </button>
            <button className="button" onClick={copyMarkdown} disabled={isPending || !markdown} title={TEXT.copyMarkdown}>
              <Clipboard size={16} />
              Markdown
            </button>
            <button className="button" onClick={copyHtml} disabled={isPending || !previewHtml} title={TEXT.copyHtml}>
              <Clipboard size={16} />
              {TEXT.richText}
            </button>
          </div>
          <textarea className="editor" value={markdown} onChange={(event) => setMarkdown(event.target.value)} placeholder={TEXT.placeholder} />
        </div>
      </section>
      <aside className="panel">
        <div className="panel-header">
          <h2 className="panel-title">{TEXT.previewTitle}</h2>
        </div>
        <div className="panel-body preview" dangerouslySetInnerHTML={{ __html: previewHtml || `<p>${TEXT.emptyPreview}</p>` }} />
      </aside>
    </div>
  );
}
