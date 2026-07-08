import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDefaultSqlitePath, sqliteFileUrl } from "@/lib/runtime-paths";

describe("runtime paths", () => {
  it("stores the default SQLite database beside the executable", () => {
    const exePath = path.join("C:", "apps", "news", "daily-ai-news.exe");

    expect(resolveDefaultSqlitePath(exePath)).toBe(path.join("C:", "apps", "news", "data", "app.db"));
  });

  it("formats Windows SQLite paths as Prisma file URLs", () => {
    expect(sqliteFileUrl("C:\\apps\\news\\data\\app.db")).toBe("file:C:/apps/news/data/app.db");
  });
});
