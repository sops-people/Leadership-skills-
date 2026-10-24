// Learning path: turn Darko's gap report into an ordered list of steps.
// Owner: Sops (converted from learning/path.py). Reads the gap report in Darko's
// format directly: roleGap, blindSpot, priority.
//
// Gaps are ordered by priority (biggest first). Each gap gets its top-ranked items.
import type { GapReport } from "@/lib/assessment/scoring";
import { rank, type RankedItem } from "./ranking";
import type { SearchResult, Votes } from "./types";

export type PathStep = {
  order: number;
  skillId: string;
  skillName: string;
  category: "c_level" | "soft";
  roleGap: number | null;
  blindSpot: number | null;
  priority: number;
  items: RankedItem[];
  /** False when this skill has not been searched yet. */
  searched: boolean;
  searchErrors: string[];
};

/** Skills worth working on: below the bar, or rated lower by others. */
export function gapItems(report: GapReport) {
  return report.items
    .filter((g) => (g.roleGap ?? 0) > 0 || (g.blindSpot ?? 0) > 0)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * search(skillId) returns the stored search result for a skill, or null if it
 * hasn't been searched yet. Kept synchronous and pure so it is easy to test.
 */
export function buildPath(
  report: GapReport,
  feedback: Record<string, Votes>,
  search: (skillId: string) => SearchResult | null,
  perSkill = 5,
): PathStep[] {
  return gapItems(report).map((gap, i) => {
    const found = search(gap.skillId);
    return {
      order: i + 1,
      skillId: gap.skillId,
      skillName: gap.name,
      category: gap.category,
      roleGap: gap.roleGap,
      blindSpot: gap.blindSpot,
      priority: gap.priority,
      items: found ? rank(found.items, { name: gap.name }, feedback, undefined, perSkill) : [],
      searched: found !== null,
      searchErrors: found?.errors ?? [],
    };
  });
}
