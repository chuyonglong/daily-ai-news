export type FetchedItem = {
  title: string;
  url: string;
  publishedAt?: Date;
  content?: string;
  excerpt?: string;
  tags?: string[];
  raw?: unknown;
};

export type SaveItemStatus = "inserted" | "duplicate" | "failed";

export type IngestResult = {
  sourceName: string;
  fetched: number;
  inserted: number;
  duplicate: number;
  skipped: number;
  failed: number;
  errors: string[];
};