import { describe, expect, it } from "vitest";
import { DEFAULT_OPENAI_BASE_URL, normalizeOpenAIBaseUrl, sortModelIds } from "@/lib/openai-client";

describe("OpenAI client helpers", () => {
  it("defaults to the official v1 endpoint", () => {
    expect(normalizeOpenAIBaseUrl("")).toBe(DEFAULT_OPENAI_BASE_URL);
  });

  it("removes trailing slashes", () => {
    expect(normalizeOpenAIBaseUrl("https://api.deepseek.com/v1///")).toBe("https://api.deepseek.com/v1");
  });

  it("adds /v1 for the official OpenAI host", () => {
    expect(normalizeOpenAIBaseUrl("https://api.openai.com")).toBe("https://api.openai.com/v1");
  });

  it("sorts and deduplicates model ids", () => {
    expect(sortModelIds(["gpt-4.1-mini", "o3", "gpt-4.1-mini", "", null])).toEqual(["gpt-4.1-mini", "o3"]);
  });
});