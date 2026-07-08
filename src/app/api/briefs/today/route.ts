import { NextResponse } from "next/server";
import { getTodayBrief } from "@/lib/brief/generate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoryScope = url.searchParams.get("categoryScope")?.trim() || "all";
  const brief = await getTodayBrief(categoryScope);
  return NextResponse.json({ brief });
}
