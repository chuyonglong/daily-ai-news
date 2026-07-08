type ExistingBrief = {
  id?: string;
  markdown?: string;
} | null | undefined;

export function getInitialTodayBriefEditorState(_brief: ExistingBrief) {
  return {
    briefId: undefined,
    markdown: "",
  };
}
