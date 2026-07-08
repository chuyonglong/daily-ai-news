import { describe, expect, it } from "vitest";
import { getInitialTodayBriefEditorState } from "@/lib/brief/editor-state";

describe("getInitialTodayBriefEditorState", () => {
  it("starts the today brief editor blank even when a previous brief exists", () => {
    expect(getInitialTodayBriefEditorState({ id: "brief-1", markdown: "# Yesterday" })).toEqual({
      briefId: undefined,
      markdown: "",
    });
  });
});
