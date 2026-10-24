// Stored search results per skill, so the learning path page never waits on a search.
// Owner: Sops (converted from learning/path.py: link checks and the cache).
import { db } from "../db";
import { searchSkill, USER_AGENT } from "./sources";
import type { ContentItem, SearchResult } from "./types";

/** A server that blocks robots (403/429) still works in a person's browser. */
const BLOCKED_BUT_LIVE = new Set([401, 403, 429]);
const LINK_TIMEOUT_MS = 8_000;
const LINK_CHECK_CONCURRENCY = 3;

export async function linkWorks(url: string): Promise<boolean> {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
      });
      if (res.ok) return true;
      if (BLOCKED_BUT_LIVE.has(res.status)) return true;
      if (res.status === 405) continue; // HEAD not allowed, try GET
      return false;
    } catch {
      return false;
    }
  }
  return false;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** All stored results for the given skills; a skill that was never searched is missing. */
export async function loadCached(skillIds: string[]): Promise<Map<string, SearchResult>> {
  const rows = await db.contentCache.findMany({ where: { skillId: { in: skillIds } } });
  return new Map(
    rows.map((row) => [
      row.skillId,
      { items: JSON.parse(row.items) as ContentItem[], errors: JSON.parse(row.errors) as string[] },
    ]),
  );
}

/** Search one skill, keep only working links, and store the result. */
export async function cachedSearch(skill: { id: string; name: string }, refresh = false): Promise<SearchResult> {
  if (!refresh) {
    const row = await db.contentCache.findUnique({ where: { skillId: skill.id } });
    const errors = row ? (JSON.parse(row.errors) as string[]) : null;
    // Don't keep a result where a source failed; search again next time.
    if (row && errors && !errors.length) return { items: JSON.parse(row.items) as ContentItem[], errors };
  }

  const { items, errors } = await searchSkill(skill);
  const alive = await mapLimit(items, LINK_CHECK_CONCURRENCY, (i) => linkWorks(i.url));
  const kept = items.filter((_, i) => alive[i]);
  const data = {
    items: JSON.stringify(kept),
    deadLinks: alive.filter((ok) => !ok).length,
    errors: JSON.stringify(errors),
  };
  await db.contentCache.upsert({ where: { skillId: skill.id }, update: data, create: { skillId: skill.id, ...data } });
  return { items: kept, errors };
}

/** One skill at a time: the free APIs block us if we search in parallel. */
export async function searchSkills(skills: { id: string; name: string }[], refresh = false): Promise<void> {
  for (const skill of skills) await cachedSearch(skill, refresh);
}
