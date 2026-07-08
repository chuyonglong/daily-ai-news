import { NextResponse } from "next/server";
import { isBriefLanguage, type BriefLanguage } from "@/lib/defaults";
import { generateTodayBrief } from "@/lib/brief/generate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { categoryScope?: unknown; briefLanguage?: unknown };
  const categoryScope = typeof body.categoryScope === "string" ? body.categoryScope.trim() : "";
  if (!categoryScope) {
    return NextResponse.json({ error: "请选择类别" }, { status: 400 });
  }
  const options: { categoryScope: string; briefLanguage?: BriefLanguage } = {
    categoryScope,
    ...(isBriefLanguage(body.briefLanguage) ? { briefLanguage: body.briefLanguage } : {}),
  };
  const brief = await generateTodayBrief(options);
  return NextResponse.json({
    id: brief.id,
    status: brief.status,
    title: brief.title,
    markdown: brief.markdown,
    html: brief.html,
  });
}
