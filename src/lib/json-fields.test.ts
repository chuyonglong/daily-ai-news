import { describe, expect, it } from "vitest";
import { stringArrayFromJson } from "@/lib/json-fields";

describe("json field helpers", () => {
  it("keeps string arrays from SQLite JSON fields", () => {
    expect(stringArrayFromJson(["AI", "OpenAI"])).toEqual(["AI", "OpenAI"]);
  });

  it("drops non-string values from mixed JSON arrays", () => {
    expect(stringArrayFromJson(["AI", 42, null, "SQLite"])).toEqual(["AI", "SQLite"]);
  });

  it("returns an empty array for non-array JSON values", () => {
    expect(stringArrayFromJson({ tags: ["AI"] })).toEqual([]);
  });
});
