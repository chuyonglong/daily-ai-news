import { NextResponse } from "next/server";
import { ensureDefaults, getAppConfig, updateAppConfig } from "@/lib/settings";
import type { AppConfig } from "@/lib/defaults";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getAppConfig();
  return NextResponse.json({ config });
}

export async function PATCH(request: Request) {
  await ensureDefaults();
  const body = (await request.json()) as {
    config?: Partial<AppConfig>;
  };

  const config = body.config ? await updateAppConfig(body.config) : await getAppConfig();
  return NextResponse.json({ config });
}
