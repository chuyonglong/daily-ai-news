import { describe, expect, it } from "vitest";
import { DEFAULT_APP_CONFIG, DEFAULT_CATEGORIES, DEFAULT_SOURCES, THEME_MODE_OPTIONS, coerceThemeMode, isThemeMode } from "@/lib/defaults";

describe("theme mode defaults", () => {
  it("defaults to automatic theme mode", () => {
    expect(DEFAULT_APP_CONFIG.themeMode).toBe("auto");
  });

  it("recognizes supported theme modes", () => {
    expect(THEME_MODE_OPTIONS.map((option) => option.value)).toEqual(["auto", "light", "dark"]);
    expect(isThemeMode("auto")).toBe(true);
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
  });

  it("coerces unsupported theme modes to automatic", () => {
    expect(coerceThemeMode("light")).toBe("light");
    expect(coerceThemeMode("dark")).toBe("dark");
    expect(coerceThemeMode("system")).toBe("auto");
    expect(coerceThemeMode(undefined)).toBe("auto");
  });
});

describe("finance source defaults", () => {
  it("includes the requested finance publishers in the finance category", () => {
    expect(DEFAULT_CATEGORIES.map((category) => category.name)).toContain("\u8d22\u52a1");

    const financeSources = DEFAULT_SOURCES.filter((source) => source.categoryName === "\u8d22\u52a1");
    expect(financeSources.map((source) => source.name)).toEqual([
      "Bloomberg",
      "Reuters",
      "Financial Times",
      "Wall Street Journal",
      "CNBC",
      "Yahoo Finance",
      "MarketWatch",
      "Forbes",
      "The Economist",
      "Business Insider",
    ]);
    expect(financeSources.every((source) => source.enabled)).toBe(true);
    expect(financeSources.every((source) => source.fetchFrequencyMinutes === 720)).toBe(true);
  });
});
