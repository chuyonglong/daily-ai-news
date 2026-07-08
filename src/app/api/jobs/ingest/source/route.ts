import { NextResponse } from "next/server";
import { ingestSourceById } from "@/lib/ingest/ingest";

export const dynamic = "force-dynamic";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sourceId?: string };
  const sourceId = body.sourceId?.trim();

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }

  try {
    const result = await ingestSourceById(sourceId);
    if (!result) {
      return NextResponse.json({ error: "Source not found or disabled" }, { status: 404 });
    }
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 502 });
  }
}