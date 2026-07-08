import type { Source } from "@prisma/client";
import { ensureDefaults } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { canonicalizeUrl, makeFingerprint, titleSimilarity } from "@/lib/ingest/dedupe";
import { fetchSourceItems } from "@/lib/ingest/fetchers";
import type { FetchedItem, IngestResult, SaveItemStatus } from "@/lib/ingest/types";

function importanceSeed(item: FetchedItem) {
  const text = `${item.title} ${item.excerpt ?? ""}`.toLowerCase();
  let score = 50;
  if (/openai|anthropic|google|deepmind|microsoft|meta|hugging face/.test(text)) score += 12;
  if (/release|launch|introduc|announc|open source|benchmark|paper|model|agent/.test(text)) score += 10;
  if (/github|hn|points|comments/.test(text)) score += 4;
  return Math.min(100, score);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function looksLikeDuplicate(item: FetchedItem, fingerprint: string) {
  const exact = await prisma.item.findUnique({ where: { fingerprint } });
  if (exact) return true;

  const recent = await prisma.item.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    },
    select: { title: true },
    take: 500,
  });

  return recent.some((candidate) => titleSimilarity(candidate.title, item.title) > 0.86);
}

async function saveItem(source: Source, item: FetchedItem, seenFingerprints: Set<string>): Promise<{ status: SaveItemStatus; error?: string }> {
  try {
    const canonicalUrl = canonicalizeUrl(item.url);
    const fingerprint = makeFingerprint(canonicalUrl, item.title);

    if (seenFingerprints.has(fingerprint) || (await looksLikeDuplicate(item, fingerprint))) {
      seenFingerprints.add(fingerprint);
      return { status: "duplicate" };
    }

    await prisma.item.create({
      data: {
        sourceId: source.id,
        categoryId: source.categoryId,
        title: item.title.trim(),
        url: item.url,
        canonicalUrl,
        publishedAt: item.publishedAt,
        content: item.content,
        excerpt: item.excerpt,
        importance: importanceSeed(item),
        fingerprint,
        tags: item.tags ?? [],
        raw: item.raw === undefined ? undefined : (item.raw as object),
      },
    });
    seenFingerprints.add(fingerprint);
    return { status: "inserted" };
  } catch (error) {
    return { status: "failed", error: errorMessage(error) };
  }
}

export async function ingestSource(source: Source): Promise<IngestResult> {
  const fetchedItems = await fetchSourceItems(source);
  const seenFingerprints = new Set<string>();
  const result: IngestResult = {
    sourceName: source.name,
    fetched: fetchedItems.length,
    inserted: 0,
    duplicate: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const item of fetchedItems) {
    const saved = await saveItem(source, item, seenFingerprints);
    if (saved.status === "inserted") {
      result.inserted += 1;
    } else if (saved.status === "duplicate") {
      result.duplicate += 1;
      result.skipped += 1;
    } else {
      result.failed += 1;
      result.skipped += 1;
      if (saved.error) result.errors.push(`${item.title}: ${saved.error}`);
    }
  }

  await prisma.source.update({ where: { id: source.id }, data: { lastFetchedAt: new Date() } });
  return result;
}

export async function listEnabledIngestSources(categoryScope = "all") {
  await ensureDefaults();
  return prisma.source.findMany({
    where: {
      enabled: true,
      ...(categoryScope === "all" ? {} : { categoryId: categoryScope }),
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

export async function ingestSourceById(sourceId: string): Promise<IngestResult | null> {
  await ensureDefaults();
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source || !source.enabled) return null;
  return ingestSource(source);
}

function failedSourceResult(sourceName: string, error: unknown): IngestResult {
  return {
    sourceName,
    fetched: 0,
    inserted: 0,
    duplicate: 0,
    skipped: 0,
    failed: 1,
    errors: [errorMessage(error)],
  };
}

export async function ingestEnabledSources(): Promise<IngestResult[]> {
  const sources = await listEnabledIngestSources();
  const results: IngestResult[] = [];
  for (const source of sources) {
    try {
      results.push(await ingestSource(source));
    } catch (error) {
      console.error(`Failed to ingest ${source.name}:`, error);
      results.push(failedSourceResult(source.name, error));
    }
  }
  return results;
}
