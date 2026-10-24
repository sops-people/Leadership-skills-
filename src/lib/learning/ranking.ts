// Ranking and filtering of found content.
// Owner: Sops (converted from learning/ranking.py; same weights and rules).
//
// Score = weighted mix of relevance to the skill, source quality, recency,
// length and format, plus a boost or penalty from "Was this useful?" votes.
// Duplicates and off-topic items are removed.
import type { ContentItem, Votes } from "./types";

export const WEIGHTS = { relevance: 0.4, context: 0.15, quality: 0.15, recency: 0.1, length: 0.1, format: 0.1 };

/** How much we trust each source for leadership learning (0-1). */
export const SOURCE_QUALITY: Record<string, number> = { "Open Library": 0.8, Crossref: 0.7, Wikipedia: 0.6, YouTube: 0.6 };

/** Mixing formats gives a path with something to read, watch and look up. */
export const FORMAT_FIT: Record<string, number> = { book: 0.8, article: 0.8, video: 0.9, primer: 0.6 };

export const MIN_RELEVANCE = 0.5;
export const MAX_PER_SOURCE = 2;
const STOPWORDS = new Set(["and", "the", "of", "a", "an", "in", "for", "to", "on", "with", "under"]);

/** Word stems that show an item is about work and leading people. */
const WORKPLACE = ["leader", "manag", "execut", "business", "organi", "corporat", "ceo", "workplace", "team", "board", "strateg", "employ"];
/** Word stems that show an item is about another field, so we drop it. */
const OFF_TOPIC = ["nurs", "patient", "clinic", "adolescen", "child", "disorder", "student", "pupil", "school", "teacher", "classroom", "medical", "surgical"];

function words(text: string | undefined | null): Set<string> {
  const found = (text ?? "").toLowerCase().match(/[a-z]+/g) ?? [];
  return new Set(found.filter((w) => !STOPWORDS.has(w) && w.length > 1));
}

/** Share of the skill-name words found in the item's title and snippet. */
export function relevance(item: ContentItem, skill: { name: string }): number {
  const wanted = [...words(skill.name)];
  if (!wanted.length) return 0;
  // A primer must be about the skill itself, so only its title counts.
  const text = item.format === "primer" ? item.title : `${item.title} ${item.snippet ?? ""}`;
  const found = [...words(text)];
  // Light stemming so "negotiating" matches "negotiation".
  const hits = wanted.filter((w) => found.some((f) => f.startsWith(w.slice(0, 6)))).length;
  return hits / wanted.length;
}

function hasStem(item: ContentItem, stems: string[]): boolean {
  const all = [...words(`${item.title} ${item.snippet ?? ""}`)];
  return all.some((w) => stems.some((s) => w.startsWith(s)));
}

export const context = (item: ContentItem) => (hasStem(item, WORKPLACE) ? 1 : 0);
export const offTopic = (item: ContentItem) => hasStem(item, OFF_TOPIC);

export function recency(item: ContentItem, today = new Date()): number {
  if (!item.year) return 0.5;
  const age = today.getFullYear() - item.year;
  return Math.max(0, 1 - age / 30);
}

/** Prefer things a busy leader can finish: under 1 hour best, books lowest. */
export function lengthFit(item: ContentItem): number {
  const minutes = item.lengthMinutes;
  if (minutes === null || minutes === undefined) return 0.5;
  if (minutes <= 60) return 1;
  if (minutes <= 300) return 0.7;
  return 0.4;
}

/** Each vote moves the score a little. */
export function feedbackAdjustment(votes?: Votes): number {
  if (!votes) return 0;
  return 0.05 * (votes.useful ?? 0) - 0.1 * (votes.notUseful ?? 0);
}

export function score(item: ContentItem, skill: { name: string }, votes?: Votes, today?: Date) {
  const parts = {
    relevance: relevance(item, skill),
    context: context(item),
    quality: SOURCE_QUALITY[item.source] ?? 0.5,
    recency: recency(item, today),
    length: lengthFit(item),
    format: FORMAT_FIT[item.format] ?? 0.5,
  };
  const weighted = (Object.keys(parts) as (keyof typeof parts)[]).reduce((sum, k) => sum + WEIGHTS[k] * parts[k], 0);
  const total = Math.round((weighted + feedbackAdjustment(votes)) * 1000) / 1000;
  return { total, parts };
}

function dedupeKey(item: ContentItem): string {
  return item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
}

export type RankedItem = ContentItem & { score: number };

/** Filter, dedupe and order items for one skill. feedback maps itemId -> votes. */
export function rank(
  items: ContentItem[],
  skill: { name: string },
  feedback: Record<string, Votes> = {},
  today?: Date,
  limit = 5,
): RankedItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const ranked: RankedItem[] = [];
  for (const item of items) {
    const key = dedupeKey(item);
    if (seenUrls.has(item.url) || seenTitles.has(key)) continue;
    seenUrls.add(item.url);
    seenTitles.add(key);
    const { total, parts } = score(item, skill, feedback[item.itemId], today);
    if (parts.relevance < MIN_RELEVANCE || offTopic(item)) continue;
    ranked.push({ ...item, score: total });
  }
  // Stable sort, highest score first (same as Python's sort).
  ranked.sort((a, b) => b.score - a.score);
  // Keep a mix: at most MAX_PER_SOURCE items from any one source.
  const perSource = new Map<string, number>();
  const mixed: RankedItem[] = [];
  for (const item of ranked) {
    const n = perSource.get(item.source) ?? 0;
    if (n < MAX_PER_SOURCE) {
      perSource.set(item.source, n + 1);
      mixed.push(item);
    }
  }
  return mixed.slice(0, limit);
}
