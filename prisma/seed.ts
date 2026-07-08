import { ensureDefaults, getAppConfig, listSources } from "../src/lib/settings";

async function main() {
  await ensureDefaults();
  const [config, sources] = await Promise.all([getAppConfig(), listSources()]);
  console.log(`Seeded ${sources.length} sources. Daily run: ${config.dailyRunTime}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
