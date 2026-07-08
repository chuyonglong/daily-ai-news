import { NextResponse } from "next/server";
import { isBriefLanguage, type BriefLanguage } from "@/lib/defaults";
import { generateTodayBrief } from "@/lib/brief/generate";

export const dynamic = "force-dynamic";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { categoryScope?: unknown; briefLanguage?: unknown; publishDate?: unknown; publishDateFrom?: unknown; publishDateTo?: unknown };
  const categoryScope = typeof body.categoryScope === "string" ? body.categoryScope.trim() : "";
  if (!categoryScope) {
    return NextResponse.json({ error: "请选择类别" }, { status: 400 });
  }
  const options: { categoryScope: string; briefLanguage?: BriefLanguage; publishDate?: string; publishDateFrom?: string; publishDateTo?: string } = {
    categoryScope,
    ...(isBriefLanguage(body.briefLanguage) ? { briefLanguage: body.briefLanguage } : {}),
    ...(typeof body.publishDate === "string" ? { publishDate: body.publishDate.trim() } : {}),
    ...(typeof body.publishDateFrom === "string" ? { publishDateFrom: body.publishDateFrom.trim() } : {}),
    ...(typeof body.publishDateTo === "string" ? { publishDateTo: body.publishDateTo.trim() } : {}),
  };
  try {
    const brief = await generateTodayBrief(options);
    return NextResponse.json({
      id: brief.id,
      status: brief.status,
      title: brief.title,
      markdown: brief.markdown,
      html: brief.html,
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
