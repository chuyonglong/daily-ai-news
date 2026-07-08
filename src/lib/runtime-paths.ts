import path from "node:path";

export function resolveDefaultSqlitePath(executablePath = process.execPath) {
  return path.join(path.dirname(executablePath), "data", "app.db");
}

export function sqliteFileUrl(filePath: string) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

export function resolveDatabaseUrl(env = process.env, executablePath = process.execPath) {
  const configured = env.DATABASE_URL?.trim();
  if (configured) return configured;
  return sqliteFileUrl(resolveDefaultSqlitePath(executablePath));
}
