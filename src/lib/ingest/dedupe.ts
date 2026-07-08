import crypto from "node:crypto";

export function canonicalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = "";
    const removableParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "fbclid", "gclid"];
    for (const param of removableParams) {
      url.searchParams.delete(param);
    }
    url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    const search = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
    url.search = "";
    for (const [key, value] of search) {
      url.searchParams.append(key, value);
    }
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  } catch {
    return input.trim();
  }
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeFingerprint(url: string, title: string): string {
  const canonical = canonicalizeUrl(url);
  const normalizedTitle = normalizeTitle(title);
  const base = canonical || normalizedTitle;
  return crypto.createHash("sha256").update(`${base}|${normalizedTitle}`).digest("hex");
}

export function titleSimilarity(left: string, right: string): number {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}