import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const globalsCssPath = fileURLToPath(new URL("./globals.css", import.meta.url));
const globalsCss = readFileSync(globalsCssPath, "utf8");

function getRuleBody(selector: string, css = globalsCss) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`).exec(css);
  return match?.groups?.body ?? "";
}

describe("top action layout spacing", () => {
  it("reserves header space for the fixed theme switcher", () => {
    expect(globalsCss).toContain("--top-action-reserve:");
    expect(getRuleBody(".top-actions")).toContain("right: 18px;");
    expect(getRuleBody(".page-header")).toContain("padding-right: var(--top-action-reserve);");
  });

  it("keeps mobile sidebar content clear of the fixed theme switcher", () => {
    const mobileBlock = globalsCss.match(/@media\s*\(max-width:\s*980px\)\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? "";

    expect(getRuleBody(".sidebar", mobileBlock)).toContain("padding-right: var(--top-action-reserve);");
    expect(getRuleBody(".page-header", mobileBlock)).toContain("padding-right: var(--top-action-reserve);");
  });
});

describe("history brief layout", () => {
  it("defines a two-pane browser with scrollable list and preview areas", () => {
    expect(getRuleBody(".brief-history-layout")).toContain("grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);");
    expect(getRuleBody(".brief-history-list")).toContain("overflow: auto;");
    expect(getRuleBody(".brief-history-preview")).toContain("overflow: auto;");
  });
});

describe("items page layout", () => {
  it("keeps the item table in a scrollable middle region", () => {
    expect(getRuleBody(".items-page-shell")).toContain("grid-template-rows: auto minmax(0, 1fr) auto;");
    expect(getRuleBody(".items-results")).toContain("overflow: auto;");
  });

  it("places the item limit control in a bottom-left footer", () => {
    expect(getRuleBody(".items-footer")).toContain("justify-content: flex-start;");
    expect(getRuleBody(".items-limit-form")).toContain("justify-content: flex-start;");
  });
});

describe("source management URL layout", () => {
  it("clamps long source URLs to two fixed-height lines inside the table", () => {
    const rule = getRuleBody(".source-url-link");

    expect(rule).toContain("display: -webkit-box;");
    expect(rule).toContain("max-width: clamp(180px, 24vw, 340px);");
    expect(rule).toContain("height: calc(1.35em * 2);");
    expect(rule).toContain("line-height: 1.35;");
    expect(rule).toContain("margin: 0 auto;");
    expect(rule).toContain("text-align: center;");
    expect(rule).toContain("overflow: hidden;");
    expect(rule).toContain("text-overflow: ellipsis;");
    expect(rule).toContain("-webkit-line-clamp: 2;");
    expect(rule).toContain("-webkit-box-orient: vertical;");
    expect(rule).toContain("overflow-wrap: anywhere;");
    expect(rule).toContain("white-space: normal;");
  });
});
