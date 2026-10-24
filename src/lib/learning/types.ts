// Learning path content shapes. Owner: Sops (moved from her Task 2 Python code).

export type ContentFormat = "book" | "article" | "primer" | "video";

export type ContentItem = {
  itemId: string;
  title: string;
  url: string;
  source: string;
  format: ContentFormat;
  year: number | null;
  lengthMinutes: number | null;
  snippet: string;
};

export type Votes = { useful: number; notUseful: number };

export type SearchResult = { items: ContentItem[]; errors: string[] };
