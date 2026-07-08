import { NextResponse } from "next/server";
import { listEnabledIngestSources } from "@/lib/ingest/ingest";
import { createSource, isSourceType } from "@/lib/sources";

export const dynamic = "force-dynamic";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET() {
  const sources = await listEnabledIngestSources();
  return NextResponse.json({
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.type,
      url: source.url,
      categoryId: source.categoryId,
      categoryName: source.category?.name ?? ("categoryName" in source && typeof source.categoryName === "string" ? source.categoryName : ""),
      fetchFrequencyMinutes: source.fetchFrequencyMinutes,
      lastFetchedAt: source.lastFetchedAt,
    })),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    type?: unknown;
    url?: string;
    categoryId?: string;
    fetchFrequencyMinutes?: number;
    enabled?: boolean;
  };
  const categoryId = body.categoryId?.trim() ?? "";
  if (!categoryId) {
    return NextResponse.json({ error: "请选择类别" }, { status: 400 });
  }
  if (!isSourceType(body.type)) {
    return NextResponse.json({ error: "来源类型不支持" }, { status: 400 });
  }

  try {
    const source = await createSource({
      name: body.name ?? "",
      type: body.type,
      url: body.url ?? "",
      categoryId,
      fetchFrequencyMinutes: body.fetchFrequencyMinutes,
      enabled: body.enabled,
    });
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
