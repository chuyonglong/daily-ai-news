"use client";

import { Clipboard, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { getInitialHistoryBriefId, type BriefHistoryQuery, type HistoryBriefCard } from "@/lib/brief/history";

type BriefHistoryBrowserProps = {
  briefs: HistoryBriefCard[];
  categories: Array<{ id: string; name: string }>;
  filters: Pick<BriefHistoryQuery, "q" | "from" | "to" | "category">;
};

const TEXT = {
  copied: "Markdown 已复制",
  copyFailed: "复制失败",
  copyMarkdown: "复制 Markdown",
};

export function BriefHistoryBrowser({ briefs, categories, filters }: BriefHistoryBrowserProps) {
  const [selectedId, setSelectedId] = useState(() => getInitialHistoryBriefId(briefs));
  const [message, setMessage] = useState("");
  const selectedBrief = useMemo(
    () => briefs.find((brief) => brief.id === selectedId) ?? briefs[0] ?? null,
    [briefs, selectedId],
  );

  const copyMarkdown = async () => {
    if (!selectedBrief) return;
    setMessage("");
    try {
      await navigator.clipboard.writeText(selectedBrief.markdown);
      setMessage(TEXT.copied);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : TEXT.copyFailed);
    }
  };

  return (
    <div className="brief-history-shell">
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body">
          <form className="toolbar" action="/briefs">
            <input name="q" placeholder="搜索标题或正文" defaultValue={filters.q ?? ""} style={{ width: 240 }} />
            <input name="from" type="date" defaultValue={filters.from ?? ""} title="开始日期" style={{ width: 160 }} />
            <input name="to" type="date" defaultValue={filters.to ?? ""} title="结束日期" style={{ width: 160 }} />
            <select name="category" defaultValue={filters.category ?? ""} style={{ width: 180 }}>
              <option value="">全部历史</option>
              <option value="all">全部类别简报</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="button primary" type="submit">
              <Search size={16} />
              搜索
            </button>
            <a className="button" href="/briefs">清空</a>
          </form>
        </div>
      </section>

      <div className="brief-history-layout">
        <aside className="panel brief-history-sidebar">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">历史列表</h2>
              <div className="meta">共 {briefs.length} 份简报</div>
            </div>
          </div>
          <div className="panel-body brief-history-list">
            {briefs.map((brief) => (
              <button
                className={`brief-history-item${brief.id === selectedBrief?.id ? " active" : ""}`}
                key={brief.id}
                onClick={() => {
                  setSelectedId(brief.id);
                  setMessage("");
                }}
                type="button"
                aria-pressed={brief.id === selectedBrief?.id}
              >
                <span className="brief-history-item-title">{brief.title}</span>
                <span className="meta">
                  {brief.dateLabel} · {brief.categoryLabel} · {brief.status} · {brief.itemCount} 条
                </span>
                {brief.sections.length > 0 ? (
                  <span className="tag-list">
                    {brief.sections.map((section) => (
                      <span className="tag" key={section.id}>
                        {section.name} {section.itemCount}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel brief-history-content">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{selectedBrief?.title ?? "暂无简报"}</h2>
              {selectedBrief ? (
                <div className="meta">
                  {selectedBrief.dateLabel} · {selectedBrief.categoryLabel} · {selectedBrief.status} · {selectedBrief.itemCount} 条
                </div>
              ) : null}
            </div>
            <div className="toolbar">
              {message ? <span className="toast">{message}</span> : null}
              <button className="button" onClick={copyMarkdown} disabled={!selectedBrief} type="button" title={TEXT.copyMarkdown}>
                <Clipboard size={16} />
                复制
              </button>
            </div>
          </div>
          <div
            className="panel-body preview brief-history-preview"
            dangerouslySetInnerHTML={{ __html: selectedBrief?.previewHtml ?? "<p>暂无预览</p>" }}
          />
        </section>
      </div>
    </div>
  );
}
