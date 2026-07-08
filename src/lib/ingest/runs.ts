import type { IngestRun, IngestRunSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDefaults } from "@/lib/settings";
import { ingestSource, listEnabledIngestSources } from "@/lib/ingest/ingest";
import type { IngestResult } from "@/lib/ingest/types";
import { stringArrayFromJson } from "@/lib/json-fields";

const ACTIVE_RUN_STATUSES = ["PENDING", "RUNNING"] as const;
const ACTIVE_SOURCE_STATUSES = ["PENDING", "RUNNING"] as const;
const STALE_RUN_MS = 30 * 60 * 1000;

type RunWithSources = IngestRun & { sources: IngestRunSource[] };
type IngestSourceRecord = Awaited<ReturnType<typeof listEnabledIngestSources>>[number];

export type IngestRunViewStatus = "idle" | "pending" | "running" | "completed" | "failed";
export type IngestSourceViewStatus = "idle" | "running" | "success" | "empty" | "failed";

export type IngestSourceView = {
  id: string;
  name: string;
  type: string;
  url: string;
  categoryId: string | null;
  categoryName: string;
  fetchFrequencyMinutes: number;
  lastFetchedAt: string | null;
  status: IngestSourceViewStatus;
  result?: IngestResult;
  errors: string[];
};

export type IngestRunView = {
  runId: string | null;
  status: IngestRunViewStatus;
  categoryScope: string;
  message: string;
  startedAt: string | null;
  completedAt: string | null;
  sources: IngestSourceView[];
};

const globalForIngestRuns = globalThis as unknown as { activeIngestRunIds?: Set<string> };
const activeIngestRunIds = globalForIngestRuns.activeIngestRunIds ?? new Set<string>();
globalForIngestRuns.activeIngestRunIds = activeIngestRunIds;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function rowStatusFromResult(result: IngestResult) {
  return result.inserted > 0 ? "SUCCESS" : "EMPTY";
}

function viewStatus(status: IngestRun["status"]): IngestRunViewStatus {
  if (status === "PENDING") return "pending";
  if (status === "RUNNING") return "running";
  if (status === "FAILED") return "failed";
  return "completed";
}

function sourceViewStatus(status: IngestRunSource["status"]): IngestSourceViewStatus {
  if (status === "RUNNING") return "running";
  if (status === "SUCCESS") return "success";
  if (status === "EMPTY") return "empty";
  if (status === "FAILED") return "failed";
  return "idle";
}

function resultFromRunSource(source: IngestRunSource): IngestResult | undefined {
  if (source.status === "PENDING" || source.status === "RUNNING") return undefined;
  return {
    sourceName: source.name,
    fetched: source.fetched,
    inserted: source.inserted,
    duplicate: source.duplicate,
    skipped: source.skipped,
    failed: source.failed,
    errors: stringArrayFromJson(source.errors),
  };
}

function toIso(value: Date | null) {
  return value?.toISOString() ?? null;
}

function runToView(run: RunWithSources): IngestRunView {
  return {
    runId: run.id,
    status: viewStatus(run.status),
    categoryScope: run.categoryScope,
    message: run.message || (run.status === "COMPLETED" ? "采集完成" : "准备采集"),
    startedAt: toIso(run.startedAt),
    completedAt: toIso(run.completedAt),
    sources: run.sources.map((source) => ({
      id: source.sourceId,
      name: source.name,
      type: source.type,
      url: source.url,
      categoryId: source.categoryId,
      categoryName: source.categoryName,
      fetchFrequencyMinutes: source.fetchFrequencyMinutes,
      lastFetchedAt: toIso(source.lastFetchedAt),
      status: sourceViewStatus(source.status),
      result: resultFromRunSource(source),
      errors: stringArrayFromJson(source.errors),
    })),
  };
}

function idleView(sources: IngestSourceRecord[], categoryScope = "all"): IngestRunView {
  return {
    runId: null,
    status: "idle",
    categoryScope,
    message: sources.length ? "准备采集" : "没有启用的来源",
    startedAt: null,
    completedAt: null,
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.type,
      url: source.url,
      categoryId: source.categoryId,
      categoryName: source.category?.name ?? "",
      fetchFrequencyMinutes: source.fetchFrequencyMinutes,
      lastFetchedAt: toIso(source.lastFetchedAt),
      status: "idle",
      errors: [],
    })),
  };
}

async function findRun(id: string) {
  return prisma.ingestRun.findUnique({
    where: { id },
    include: { sources: { orderBy: { order: "asc" } } },
  });
}

async function findLatestRun(categoryScope = "all") {
  return prisma.ingestRun.findFirst({
    where: { categoryScope },
    orderBy: { createdAt: "desc" },
    include: { sources: { orderBy: { order: "asc" } } },
  });
}

async function findActiveRun(categoryScope = "all") {
  return prisma.ingestRun.findFirst({
    where: { status: { in: [...ACTIVE_RUN_STATUSES] }, categoryScope },
    orderBy: { createdAt: "desc" },
    include: { sources: { orderBy: { order: "asc" } } },
  });
}

async function failStaleRuns() {
  const staleBefore = new Date(Date.now() - STALE_RUN_MS);
  const staleRuns = await prisma.ingestRun.findMany({
    where: {
      status: { in: [...ACTIVE_RUN_STATUSES] },
      updatedAt: { lt: staleBefore },
    },
    select: { id: true },
  });

  for (const run of staleRuns) {
    await prisma.$transaction([
      prisma.ingestRunSource.updateMany({
        where: { runId: run.id, status: { in: [...ACTIVE_SOURCE_STATUSES] } },
        data: { status: "FAILED", failed: 1, errors: ["采集任务超时，已停止"], completedAt: new Date() },
      }),
      prisma.ingestRun.update({
        where: { id: run.id },
        data: { status: "FAILED", message: "采集任务超时，已停止", completedAt: new Date() },
      }),
    ]);
  }
}

export async function getLatestIngestRunView(categoryScope = "all") {
  await ensureDefaults();
  await failStaleRuns();
  const latest = await findLatestRun(categoryScope);
  if (latest) {
    if (latest.status === "PENDING" || latest.status === "RUNNING") {
      kickIngestRun(latest.id);
    }
    return runToView(latest);
  }
  return idleView(await listEnabledIngestSources(categoryScope), categoryScope);
}

export async function startOrResumeIngestRun(categoryScope = "all") {
  await ensureDefaults();
  await failStaleRuns();

  const active = await findActiveRun(categoryScope);
  if (active) {
    kickIngestRun(active.id);
    return runToView(active);
  }

  const sources = await listEnabledIngestSources(categoryScope);
  if (sources.length === 0) {
    throw new Error("没有启用的来源");
  }

  const run = await prisma.ingestRun.create({
    data: {
      status: "PENDING",
      trigger: "manual",
      categoryScope,
      message: "采集任务已创建",
      sources: {
        create: sources.map((source, index) => ({
          sourceId: source.id,
          name: source.name,
          type: source.type,
          url: source.url,
          categoryId: source.categoryId,
          categoryName: source.category?.name ?? "",
          fetchFrequencyMinutes: source.fetchFrequencyMinutes,
          lastFetchedAt: source.lastFetchedAt,
          order: index,
          errors: [],
        })),
      },
    },
    include: { sources: { orderBy: { order: "asc" } } },
  });

  kickIngestRun(run.id);
  return runToView(run);
}

export function kickIngestRun(runId: string) {
  if (activeIngestRunIds.has(runId)) return;
  activeIngestRunIds.add(runId);
  void runIngestRun(runId).finally(() => {
    activeIngestRunIds.delete(runId);
  });
}

async function runIngestRun(runId: string) {
  const run = await findRun(runId);
  if (!run || run.status === "COMPLETED" || run.status === "FAILED") return;

  await prisma.ingestRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: run.startedAt ?? new Date(), message: "采集开始" },
  });

  for (const runSource of run.sources) {
    if (runSource.status === "SUCCESS" || runSource.status === "EMPTY" || runSource.status === "FAILED") continue;

    await prisma.$transaction([
      prisma.ingestRun.update({ where: { id: runId }, data: { message: `正在采集：${runSource.name}` } }),
      prisma.ingestRunSource.update({
        where: { id: runSource.id },
        data: {
          status: "RUNNING",
          fetched: 0,
          inserted: 0,
          duplicate: 0,
          skipped: 0,
          failed: 0,
          errors: [],
          startedAt: new Date(),
          completedAt: null,
        },
      }),
    ]);

    try {
      const source = await prisma.source.findUnique({ where: { id: runSource.sourceId } });
      if (!source || !source.enabled) {
        throw new Error("Source not found or disabled");
      }

      const result = await ingestSource(source);
      await prisma.ingestRunSource.update({
        where: { id: runSource.id },
        data: {
          status: rowStatusFromResult(result),
          fetched: result.fetched,
          inserted: result.inserted,
          duplicate: result.duplicate,
          skipped: result.skipped,
          failed: result.failed,
          errors: result.errors,
          lastFetchedAt: new Date(),
          completedAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.ingestRunSource.update({
        where: { id: runSource.id },
        data: {
          status: "FAILED",
          failed: 1,
          errors: [errorMessage(error)],
          completedAt: new Date(),
        },
      });
    }
  }

  const failedSources = await prisma.ingestRunSource.count({ where: { runId, status: "FAILED" } });
  await prisma.ingestRun.update({
    where: { id: runId },
    data: {
      status: "COMPLETED",
      message: failedSources > 0 ? `采集完成，${failedSources} 个来源失败` : "采集完成",
      completedAt: new Date(),
    },
  });
}
