import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

describe("development server scripts", () => {
  it("uses webpack for Next dev to avoid Turbopack endpoint panics", () => {
    expect(packageJson.scripts.dev).toContain("--webpack");
    expect(packageJson.scripts["dev:all"]).toContain("next dev --webpack");
  });
});
