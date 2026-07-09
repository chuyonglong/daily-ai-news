import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readLocal(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("source management UI boundaries", () => {
  it("keeps source creation out of the ingest center", () => {
    const source = readLocal("./IngestCenter.tsx");

    expect(source).not.toContain("新增类别与来源");
    expect(source).not.toContain("title=\"新增来源\"");
    expect(source).not.toContain("/api/jobs/ingest/sources");
    expect(source).toContain("/sources");
  });

  it("keeps source controls out of settings", () => {
    const source = readLocal("./SettingsForm.tsx");

    expect(source).not.toContain("资讯来源");
    expect(source).not.toContain("禁用后不会再自动采集");
    expect(source).not.toContain("initialSources");
  });

  it("adds source management to the main navigation", () => {
    const source = readLocal("../app/layout.tsx");

    expect(source).toContain("来源管理");
    expect(source).toContain("/sources");
  });

  it("keeps source table sort controls icon-only beyond the column label", () => {
    const source = readLocal("./SourceManager.tsx");

    expect(source).not.toContain("sortLabel");
    expect(source).not.toContain("升序");
    expect(source).not.toContain("降序");
  });

  it("keeps the page title standard and emphasizes centered source table headers", () => {
    const page = readLocal("../app/sources/page.tsx");
    const css = readLocal("../app/globals.css");

    expect(page).not.toContain("source-page-header");
    expect(css).toContain(".source-table th");
    expect(css).toContain(".source-table td");
    expect(css).toContain("text-align: center");
    expect(css).toContain("vertical-align: middle");
    expect(css).toContain("color: var(--primary-strong)");
  });

  it("opens source URLs in a new tab without showing the internal fetch type column", () => {
    const source = readLocal("./SourceManager.tsx");

    expect(source).not.toContain("<th>采集方式</th>");
    expect(source).not.toContain("<td>{source.type}</td>");
    expect(source).toContain("className=\"source-url-link\"");
    expect(source).toContain("target=\"_blank\"");
    expect(source).toContain("rel=\"noreferrer noopener\"");
  });
});
