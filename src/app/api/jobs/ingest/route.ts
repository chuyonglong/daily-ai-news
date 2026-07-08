import { NextResponse } from "next/server";
import { getLatestIngestRunView, startOrResumeIngestRun } from "@/lib/ingest/runs";

export const dynamic = "force-dynamic";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function categoryScopeFromUrl(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("categoryScope")?.trim() || "all";
}

export async function GET(request: Request) {
  const run = await getLatestIngestRunView(categoryScopeFromUrl(request));
  return NextResponse.json({ run });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { categoryScope?: string };
  const categoryScope = body.categoryScope?.trim() || "all";
  try {
    const run = await startOrResumeIngestRun(categoryScope);
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
