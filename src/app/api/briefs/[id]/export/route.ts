import { NextResponse } from "next/server";
import { markdownToHtml, replaceTemplateNote } from "@/lib/brief/export";
import { getBriefWithSections, saveBriefMarkdown } from "@/lib/brief/generate";
import { getAppConfig } from "@/lib/settings";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { markdown?: string };
  const current = await getBriefWithSections(id);
  if (!current) return NextResponse.json({ error: "Brief not found" }, { status: 404 });

  const config = await getAppConfig();
  const markdown = typeof body.markdown === "string" ? body.markdown : current.markdown;
  const normalizedMarkdown = replaceTemplateNote(markdown, config.exportTemplate, config.briefLanguage);
  const html = markdownToHtml(normalizedMarkdown);
  await saveBriefMarkdown(id, normalizedMarkdown);
  return NextResponse.json({ markdown: normalizedMarkdown, html });
}
