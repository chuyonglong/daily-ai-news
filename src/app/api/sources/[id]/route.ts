import { NextResponse } from "next/server";
import { deleteSource, isSourceType, updateSource } from "@/lib/sources";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    type?: unknown;
    url?: string;
    categoryId?: string;
    fetchFrequencyMinutes?: number;
    enabled?: boolean;
  };

  if (body.type !== undefined && !isSourceType(body.type)) {
    return NextResponse.json({ error: "来源类型不支持" }, { status: 400 });
  }

  try {
    const source = await updateSource(id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.url !== undefined ? { url: body.url } : {}),
      ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
      ...(body.fetchFrequencyMinutes !== undefined ? { fetchFrequencyMinutes: body.fetchFrequencyMinutes } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    });
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const source = await deleteSource(id);
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
