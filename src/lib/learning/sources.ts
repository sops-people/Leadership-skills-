// Content search: look up external training content for a skill.
// Owner: Sops (converted from learning/sources.py; same sources and parameters).
//
// Sources with no API key run by default. YouTube runs only when YOUTUBE_API_KEY
// is set. Which sources we keep (and their cost and terms) is an open decision.
import { createHash } from "node:crypto";
import type { ContentFormat, ContentItem, SearchResult } from "./types";

export const USER_AGENT = "LeadershipSkillsApp/0.1 (learning-path prototype)";
const TIMEOUT_MS = 10_000;
const RETRIES = 2;

class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET with a short back-off when a free API says we are going too fast. */
async function getJson(url: string): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new HttpError(res.status, url);
      return await res.json();
    } catch (err) {
      // Only retry "slow down" and server errors; a refused connection won't fix itself.
      const retryable = err instanceof HttpError && [429, 500, 502, 503].includes(err.status);
      if (attempt === RETRIES || !retryable) throw err;
      await sleep(2000 * (attempt + 1));
    }
  }
}

export function itemId(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 12);
}

function stripHtml(text: string | undefined | null): string {
  return (text ?? "").replace(/<[^>]+>/g, "").trim();
}

function item(
  title: string,
  url: string,
  source: string,
  format: ContentFormat,
  { year = null, lengthMinutes = null, snippet = "" }: { year?: number | null; lengthMinutes?: number | null; snippet?: string } = {},
): ContentItem {
  return { itemId: itemId(url), title: title.trim(), url, source, format, year, lengthMinutes, snippet: snippet.slice(0, 300) };
}

export async function searchOpenLibrary(query: string, limit = 8): Promise<ContentItem[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    fields: "key,title,author_name,first_publish_year,number_of_pages_median",
  });
  const data = await getJson(`https://openlibrary.org/search.json?${params}`);
  return (data.docs ?? []).map((doc: any) => {
    const pages: number | undefined = doc.number_of_pages_median;
    const authors = (doc.author_name ?? []).slice(0, 2).join(", ");
    return item(doc.title, `https://openlibrary.org${doc.key}`, "Open Library", "book", {
      year: doc.first_publish_year ?? null,
      // About 2 minutes per page.
      lengthMinutes: pages ? pages * 2 : null,
      snippet: authors ? `by ${authors}` : "",
    });
  });
}

export async function searchCrossref(query: string, limit = 8): Promise<ContentItem[]> {
  const params = new URLSearchParams({
    "query.bibliographic": query,
    rows: String(limit),
    filter: "from-pub-date:2010,type:journal-article",
    select: "title,URL,issued,abstract,container-title",
  });
  const data = await getJson(`https://api.crossref.org/works?${params}`);
  const items: ContentItem[] = [];
  for (const work of data.message?.items ?? []) {
    if (!work.title?.length) continue;
    const year = work.issued?.["date-parts"]?.[0]?.[0] ?? null;
    const journal = work["container-title"]?.[0] ?? "";
    items.push(
      item(work.title[0], work.URL, "Crossref", "article", {
        year,
        lengthMinutes: 20,
        snippet: stripHtml(work.abstract) || journal,
      }),
    );
  }
  return items;
}

export async function searchWikipedia(query: string, limit = 3): Promise<ContentItem[]> {
  const params = new URLSearchParams({ action: "query", list: "search", srsearch: query, format: "json", srlimit: String(limit) });
  const data = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
  return (data.query?.search ?? []).map((hit: any) => {
    const title: string = hit.title;
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
    return item(title, url, "Wikipedia", "primer", {
      // About 200 words per minute.
      lengthMinutes: Math.max(1, Math.floor((hit.wordcount ?? 0) / 200)),
      snippet: stripHtml(hit.snippet),
    });
  });
}

export async function searchYouTube(query: string, limit = 5): Promise<ContentItem[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(limit),
    videoDuration: "medium",
    relevanceLanguage: "en",
    key,
  });
  const data = await getJson(`https://www.googleapis.com/youtube/v3/search?${params}`);
  return (data.items ?? []).map((hit: any) =>
    item(hit.snippet.title, `https://www.youtube.com/watch?v=${hit.id.videoId}`, "YouTube", "video", {
      year: Number(String(hit.snippet.publishedAt).slice(0, 4)) || null,
      lengthMinutes: 12,
      snippet: hit.snippet.description ?? "",
    }),
  );
}

const SOURCES: [string, (query: string) => Promise<ContentItem[]>][] = [
  ["searchOpenLibrary", searchOpenLibrary],
  ["searchCrossref", searchCrossref],
  ["searchWikipedia", searchWikipedia],
  ["searchYouTube", searchYouTube],
];

/** Skill names that search badly as written. */
export const QUERY_OVERRIDES: Record<string, string> = {
  "financial-acumen": "financial acumen for managers",
  "stakeholder-board": "board of directors stakeholder management",
  "industry-expertise": "industry analysis strategy executives",
};

/** Turn a taxonomy skill into a search query. */
export function queryFor(skill: { id: string; name: string }): string {
  if (QUERY_OVERRIDES[skill.id]) return QUERY_OVERRIDES[skill.id];
  const name = skill.name.replace(/&/g, " ").replace(/\//g, " ");
  return `${name.split(/\s+/).filter(Boolean).join(" ")} leadership`;
}

/** Run every source for one skill. A failing source is skipped, not fatal. */
export async function searchSkill(skill: { id: string; name: string }): Promise<SearchResult> {
  const query = queryFor(skill);
  const items: ContentItem[] = [];
  const errors: string[] = [];
  for (const [name, source] of SOURCES) {
    try {
      items.push(...(await source(query)));
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { items, errors };
}
