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
});
