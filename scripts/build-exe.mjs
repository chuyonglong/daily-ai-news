import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...options.env },
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return;
  fs.rmSync(to, { recursive: true, force: true });
  copyRecursive(from, to);
}

function copyRecursive(from, to) {
  const stats = fs.statSync(from);
  if (stats.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) {
      copyRecursive(path.join(from, entry), path.join(to, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function walkFiles(dir, baseDir = dir, bundleDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const bundlePath = path.join(bundleDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, baseDir, bundlePath));
    } else if (entry.isFile()) {
      files.push({ sourcePath: fullPath, bundlePath: toBundlePath(bundlePath, baseDir) });
    } else if (entry.isSymbolicLink()) {
      const realPath = fs.realpathSync(fullPath);
      const stats = fs.statSync(realPath);
      if (stats.isDirectory()) {
        files.push(...walkFiles(realPath, baseDir, bundlePath));
      } else if (stats.isFile()) {
        files.push({ sourcePath: realPath, bundlePath: toBundlePath(bundlePath, baseDir) });
      }
    }
  }
  return files;
}

function toBundlePath(filePath, baseDir) {
  return path.relative(baseDir, filePath).replace(/\\/g, "/");
}

function createEmbeddedBundle(baseDir, outFile) {
  const version = String(Date.now());
  fs.writeFileSync(outFile, `const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const zlib = require("node:zlib");

const BUNDLE_VERSION = ${JSON.stringify(version)};
const FILES = [
`);

  const files = walkFiles(baseDir);
  files.forEach((entry, index) => {
    const packedFile = {
      path: entry.bundlePath,
      data: zlib.gzipSync(fs.readFileSync(entry.sourcePath), { level: 9 }).toString("base64"),
    };
    fs.appendFileSync(outFile, `${index === 0 ? "" : ",\n"}${JSON.stringify(packedFile)}`);
  });

  fs.appendFileSync(outFile, `
];

function sqliteFileUrl(filePath) {
  return \`file:\${filePath.replace(/\\\\/g, "/")}\`;
}

function extractRuntime(runtimeDir) {
  const markerPath = path.join(runtimeDir, ".bundle-version");
  if (fs.existsSync(markerPath) && fs.readFileSync(markerPath, "utf8") === BUNDLE_VERSION) {
    return;
  }

  fs.rmSync(runtimeDir, { recursive: true, force: true });
  fs.mkdirSync(runtimeDir, { recursive: true });

  for (const file of FILES) {
    const targetPath = path.join(runtimeDir, file.path);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, zlib.gunzipSync(Buffer.from(file.data, "base64")));
  }

  fs.writeFileSync(markerPath, BUNDLE_VERSION);
}

const exeDir = path.dirname(process.execPath);
const runtimeDir = path.join(exeDir, "runtime");
extractRuntime(runtimeDir);

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
  const dataDir = path.join(exeDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.DATABASE_URL = sqliteFileUrl(path.join(dataDir, "app.db"));
}

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || "3001";

console.log(\`[daily-ai-news] database: \${process.env.DATABASE_URL}\`);
console.log(\`[daily-ai-news] starting server on http://\${process.env.HOSTNAME}:\${process.env.PORT}\`);

createRequire(path.join(runtimeDir, "server.js"))(path.join(runtimeDir, "server.js"));
`);
}

const standaloneDir = path.join(root, ".next", "standalone");
const distDir = path.join(root, "dist");
const bundleEntry = path.join(distDir, "exe-bundle.cjs");

fs.mkdirSync(distDir, { recursive: true });

run(npmCmd, ["run", "db:generate"]);
run(npmCmd, ["run", "build"]);

console.log("[build:exe] copying standalone assets...");
copyIfExists(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));
copyIfExists(path.join(root, "public"), path.join(standaloneDir, "public"));
console.log("[build:exe] embedding standalone runtime...");
createEmbeddedBundle(standaloneDir, bundleEntry);
console.log("[build:exe] creating executable...");

run(npmCmd, [
  "exec",
  "--",
  "pkg",
  "--sea",
  bundleEntry,
  "--output",
  path.join(distDir, "daily-ai-news.exe"),
]);

fs.rmSync(bundleEntry, { force: true });
