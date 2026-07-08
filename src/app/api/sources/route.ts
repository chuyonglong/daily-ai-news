import { NextResponse } from "next/server";
import { listCategories } from "@/lib/categories";
import { createSource, isSourceType, listSourcesForManagement } from "@/lib/sources";

export const dynamic = "force-dynamic";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET() {
  const [sources, categories] = await Promise.all([listSourcesForManagement(), listCategories()]);
  return NextResponse.json({ sources, categories });
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

  if (!isSourceType(body.type)) {
    return NextResponse.json({ error: "来源类型不支持" }, { status: 400 });
  }

  try {
    const source = await createSource({
      name: body.name ?? "",
      type: body.type,
      url: body.url ?? "",
      categoryId: body.categoryId ?? "",
      fetchFrequencyMinutes: body.fetchFrequencyMinutes,
      enabled: body.enabled,
    });
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
