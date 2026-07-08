import { describe, expect, it } from "vitest";
import { getSqliteSchemaStatements } from "@/lib/sqlite-schema";

describe("SQLite schema statements", () => {
  it("creates the application tables needed by Prisma", () => {
    const sql = getSqliteSchemaStatements().join("\n");

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "Source"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "Item"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "Brief"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "AppSetting"');
  });

  it("keeps the unique constraints Prisma queries rely on", () => {
    const sql = getSqliteSchemaStatements().join("\n");

    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "Brief_date_categoryScope_key"');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "BriefSection_briefId_order_key"');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "BriefItem_briefSectionId_order_key"');
  });
});
