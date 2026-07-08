import { NextResponse } from "next/server";
import { fetchOpenAIModelIds, normalizeOpenAIBaseUrl } from "@/lib/openai-client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { apiKey?: string; baseUrl?: string };
  const apiKey = body.apiKey?.trim() ?? "";

  if (!apiKey) {
    return NextResponse.json({ error: "\u8bf7\u5148\u586b\u5199 OpenAI API Key" }, { status: 400 });
  }

  let baseUrl: string;
  try {
    baseUrl = normalizeOpenAIBaseUrl(body.baseUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "API \u5730\u5740\u65e0\u6548" }, { status: 400 });
  }

  try {
    const models = await fetchOpenAIModelIds({ apiKey, baseUrl });
    return NextResponse.json({ models, baseUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "\u83b7\u53d6\u6a21\u578b\u5931\u8d25";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}