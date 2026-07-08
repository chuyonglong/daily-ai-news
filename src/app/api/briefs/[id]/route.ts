import { NextResponse } from "next/server";
import { saveBriefMarkdown } from "@/lib/brief/generate";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as { markdown?: string };
  if (typeof body.markdown !== "string") {
    return NextResponse.json({ error: "markdown is required" }, { status: 400 });
  }
  const brief = await saveBriefMarkdown(id, body.markdown);
  return NextResponse.json({ id: brief.id, markdown: brief.markdown, html: brief.html });
}
