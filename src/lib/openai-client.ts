import OpenAI from "openai";

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

export function normalizeOpenAIBaseUrl(input: string | undefined | null): string {
  const raw = input?.trim() || DEFAULT_OPENAI_BASE_URL;
  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  const url = new URL(withoutTrailingSlash);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("API \u5730\u5740\u5fc5\u987b\u4ee5 http:// \u6216 https:// \u5f00\u5934");
  }

  if (url.hostname === "api.openai.com" && (url.pathname === "" || url.pathname === "/")) {
    url.pathname = "/v1";
  }

  return url.toString().replace(/\/+$/, "");
}

export function safeNormalizeOpenAIBaseUrl(input: string | undefined | null): string {
  try {
    return normalizeOpenAIBaseUrl(input);
  } catch {
    return DEFAULT_OPENAI_BASE_URL;
  }
}

export function sortModelIds(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim()),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export async function fetchOpenAIModelIds(options: { apiKey: string; baseUrl?: string }) {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error("\u8bf7\u5148\u586b\u5199 OpenAI API Key");
  }

  const baseURL = normalizeOpenAIBaseUrl(options.baseUrl);
  const openai = new OpenAI({ apiKey, baseURL });
  const response = await openai.models.list();
  return sortModelIds(response.data.map((model) => model.id));
}