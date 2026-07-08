type RawExecutor = {
  $executeRawUnsafe(statement: string): Promise<unknown>;
};

let schemaReady: Promise<void> | null = null;

export function getSqliteSchemaStatements() {
  return [
    `PRAGMA foreign_keys = ON`,
    `CREATE TABLE IF NOT EXISTS "Category" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "Source" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "categoryId" TEXT,
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "fetchFrequencyMinutes" INTEGER NOT NULL DEFAULT 1440,
      "lastFetchedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Source_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "IngestRun" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "trigger" TEXT NOT NULL DEFAULT 'manual',
      "categoryScope" TEXT NOT NULL DEFAULT 'all',
      "message" TEXT NOT NULL DEFAULT '',
      "startedAt" DATETIME,
      "completedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "IngestRunSource" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "runId" TEXT NOT NULL,
      "sourceId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "categoryId" TEXT,
      "categoryName" TEXT NOT NULL DEFAULT '',
      "fetchFrequencyMinutes" INTEGER NOT NULL,
      "lastFetchedAt" DATETIME,
      "order" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "fetched" INTEGER NOT NULL DEFAULT 0,
      "inserted" INTEGER NOT NULL DEFAULT 0,
      "duplicate" INTEGER NOT NULL DEFAULT 0,
      "skipped" INTEGER NOT NULL DEFAULT 0,
      "failed" INTEGER NOT NULL DEFAULT 0,
      "errors" JSONB NOT NULL,
      "startedAt" DATETIME,
      "completedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "IngestRunSource_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Item" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sourceId" TEXT NOT NULL,
      "categoryId" TEXT,
      "title" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "canonicalUrl" TEXT NOT NULL,
      "publishedAt" DATETIME,
      "content" TEXT,
      "excerpt" TEXT,
      "aiSummary" TEXT,
      "importance" INTEGER NOT NULL DEFAULT 0,
      "fingerprint" TEXT NOT NULL,
      "tags" JSONB NOT NULL,
      "raw" JSONB,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Item_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "Brief" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" DATETIME NOT NULL,
      "categoryScope" TEXT NOT NULL DEFAULT 'all',
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "title" TEXT NOT NULL,
      "markdown" TEXT NOT NULL DEFAULT '',
      "html" TEXT NOT NULL DEFAULT '',
      "parameters" JSONB,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "BriefSection" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "briefId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BriefSection_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "BriefItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "briefSectionId" TEXT NOT NULL,
      "itemId" TEXT,
      "title" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "sourceName" TEXT NOT NULL,
      "publishedAt" DATETIME,
      "summary" TEXT NOT NULL,
      "whyItMatters" TEXT NOT NULL,
      "tags" JSONB NOT NULL,
      "score" INTEGER NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BriefItem_briefSectionId_fkey" FOREIGN KEY ("briefSectionId") REFERENCES "BriefSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "BriefItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "AppSetting" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" JSONB NOT NULL,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category" ("name")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Source_name_key" ON "Source" ("name")`,
    `CREATE INDEX IF NOT EXISTS "Source_categoryId_idx" ON "Source" ("categoryId")`,
    `CREATE INDEX IF NOT EXISTS "IngestRun_status_idx" ON "IngestRun" ("status")`,
    `CREATE INDEX IF NOT EXISTS "IngestRun_categoryScope_idx" ON "IngestRun" ("categoryScope")`,
    `CREATE INDEX IF NOT EXISTS "IngestRun_createdAt_idx" ON "IngestRun" ("createdAt")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "IngestRunSource_runId_sourceId_key" ON "IngestRunSource" ("runId", "sourceId")`,
    `CREATE INDEX IF NOT EXISTS "IngestRunSource_runId_order_idx" ON "IngestRunSource" ("runId", "order")`,
    `CREATE INDEX IF NOT EXISTS "IngestRunSource_status_idx" ON "IngestRunSource" ("status")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Item_fingerprint_key" ON "Item" ("fingerprint")`,
    `CREATE INDEX IF NOT EXISTS "Item_publishedAt_idx" ON "Item" ("publishedAt")`,
    `CREATE INDEX IF NOT EXISTS "Item_sourceId_idx" ON "Item" ("sourceId")`,
    `CREATE INDEX IF NOT EXISTS "Item_categoryId_idx" ON "Item" ("categoryId")`,
    `CREATE INDEX IF NOT EXISTS "Item_importance_idx" ON "Item" ("importance")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Brief_date_categoryScope_key" ON "Brief" ("date", "categoryScope")`,
    `CREATE INDEX IF NOT EXISTS "Brief_categoryScope_idx" ON "Brief" ("categoryScope")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "BriefSection_briefId_order_key" ON "BriefSection" ("briefId", "order")`,
    `CREATE INDEX IF NOT EXISTS "BriefSection_briefId_idx" ON "BriefSection" ("briefId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "BriefItem_briefSectionId_order_key" ON "BriefItem" ("briefSectionId", "order")`,
    `CREATE INDEX IF NOT EXISTS "BriefItem_itemId_idx" ON "BriefItem" ("itemId")`,
  ];
}

export async function ensureSqliteSchema(prisma: RawExecutor, databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl?.startsWith("file:")) return;
  schemaReady ??= (async () => {
    for (const statement of getSqliteSchemaStatements()) {
      await prisma.$executeRawUnsafe(statement);
    }
  })();
  await schemaReady;
}
