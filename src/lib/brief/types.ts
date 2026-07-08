export type BriefItemDraft = {
  itemId?: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt?: Date;
  summary: string;
  whyItMatters: string;
  tags: string[];
  score: number;
};

export type BriefSectionDraft = {
  name: string;
  items: BriefItemDraft[];
};

export type BriefDraft = {
  title: string;
  sections: BriefSectionDraft[];
};

export type ExportResult = {
  markdown: string;
  html: string;
};
