import { describe, expect, it } from "vitest";
import { canonicalizeUrl, makeFingerprint, titleSimilarity } from "@/lib/ingest/dedupe";

describe("dedupe helpers", () => {
  it("removes common tracking parameters and normalizes host", () => {
    expect(canonicalizeUrl("https://www.example.com/post/?utm_source=x&b=2&a=1#section")).toBe("https://example.com/post?a=1&b=2");
  });

  it("creates stable fingerprints", () => {
    const first = makeFingerprint("https://example.com/post?utm_campaign=x", "OpenAI releases model");
    const second = makeFingerprint("https://example.com/post", "OpenAI releases model");
    expect(first).toBe(second);
  });

  it("scores the same story across sources as highly similar", () => {
    expect(titleSimilarity("OpenAI releases new reasoning model", "OpenAI announces new reasoning model"), "similar title").toBeGreaterThan(0.5);
  });

  it("scores similar titles higher than unrelated titles", () => {
    expect(titleSimilarity("OpenAI releases new reasoning model", "OpenAI releases reasoning model today")).toBeGreaterThan(0.5);
    expect(titleSimilarity("OpenAI releases new reasoning model", "GitHub launches issue dashboard")).toBeLessThan(0.3);
  });
});