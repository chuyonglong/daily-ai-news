import { generateTodayBrief } from "../src/lib/brief/generate";
import { ingestEnabledSources } from "../src/lib/ingest/ingest";
import { getAppConfig } from "../src/lib/settings";

let lastRunKey = "";
let running = false;

function todayKey() {
  return new Date().toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
}

function nowTime() {
  return new Date().toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function runDaily() {
  if (running) return;
  running = true;
  try {
    console.log(`[worker] ${new Date().toISOString()} ingesting enabled sources...`);
    const results = await ingestEnabledSources();
    const inserted = results.reduce((sum, result) => sum + result.inserted, 0);
    console.log(`[worker] ingest complete, inserted ${inserted} items. generating brief...`);
    const brief = await generateTodayBrief({ categoryScope: "all" });
    console.log(`[worker] generated ${brief.title} (${brief.status}).`);
  } catch (error) {
    console.error("[worker] daily job failed:", error);
  } finally {
    running = false;
  }
}

async function tick() {
  const config = await getAppConfig();
  const key = todayKey();
  if (nowTime() >= config.dailyRunTime && lastRunKey !== key) {
    lastRunKey = key;
    await runDaily();
  }
}

console.log("[worker] Daily AI news worker started. Checking schedule every minute.");
void tick();
setInterval(() => {
  void tick();
}, 60_000);
