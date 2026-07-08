import { describe, expect, it } from "vitest";
import { nextTypewriterText } from "@/lib/typewriter";

describe("nextTypewriterText", () => {
  it("appends a bounded chunk from the target text", () => {
    expect(nextTypewriterText("abcdefghijklmnop", 0, 8)).toBe("abcdefgh");
    expect(nextTypewriterText("abcdefghijklmnop", 8, 8)).toBe("abcdefghijklmnop");
  });

  it("finishes at the full target text without overshooting", () => {
    expect(nextTypewriterText("hello", 4, 12)).toBe("hello");
    expect(nextTypewriterText("hello", 5, 12)).toBe("hello");
  });

  it("uses a safe chunk size when the requested size is invalid", () => {
    expect(nextTypewriterText("abcdefghijklmnop", 0, 0)).toBe("abcdefghijkl");
  });
});
