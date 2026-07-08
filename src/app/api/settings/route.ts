import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaults, getAppConfig, listSources, updateAppConfig } from "@/lib/settings";
import type { AppConfig } from "@/lib/defaults";

export const dynamic = "force-dynamic";

export async function GET() {
  const [config, sources] = await Promise.all([getAppConfig(), listSources()]);
  return NextResponse.json({ config, sources });
}

export async function PATCH(request: Request) {
  await ensureDefaults();
  const body = (await request.json()) as {
    config?: Partial<AppConfig>;
    sources?: Array<{ id: string; enabled: boolean; fetchFrequencyMinutes?: number }>;
  };

  const config = body.config ? await updateAppConfig(body.config) : await getAppConfig();

  for (const source of body.sources ?? []) {
    await prisma.source.update({
      where: { id: source.id },
      data: {
        enabled: source.enabled,
        fetchFrequencyMinutes: source.fetchFrequencyMinutes,
      },
    });
  }

  const sources = await listSources();
  return NextResponse.json({ config, sources });
}
