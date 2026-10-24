// 360 anonymity rules (kickoff doc, "360 anonymity and privacy"). Darko: pass the
// raw ratings for one cycle through toRatingsView() before showing anything to the
// user. The view never contains rater ids.
//
// - Peer and direct-report scores show only when 3+ raters in that group rated the skill.
// - Manager scores are shown on their own line: one manager can't be anonymous.
// - Comments show only from groups with 3+ raters overall, unattributed and sorted
//   alphabetically, so their order doesn't hint at who wrote them.

export const MIN_RATERS_PER_GROUP = 3;

export type RaterType = "self" | "manager" | "peer" | "direct-report";

export type Rating = {
  raterId: string;
  raterType: RaterType;
  skillId: string;
  score: number;
  comment?: string;
};

/** null on a score means nobody in that group rated the skill, or fewer than 3 did. */
export type SkillView = {
  skillId: string;
  self: number | null;
  manager: number | null;
  peers: number | null;
  directReports: number | null;
  /** Average of every visible non-self score. Use this for self vs 360 gaps. */
  others: number | null;
};

export type RatingsView = {
  skills: SkillView[];
  comments: string[];
  /** Groups with too few raters to show; tell the user why scores are missing. */
  hiddenGroups: ("peer" | "direct-report")[];
};

const POOLED = ["peer", "direct-report"] as const;

export function toRatingsView(ratings: Rating[]): RatingsView {
  const skillIds = [...new Set(ratings.map((r) => r.skillId))].sort();

  const skills = skillIds.map((skillId): SkillView => {
    const forSkill = ratings.filter((r) => r.skillId === skillId);
    const scoresOf = (type: RaterType) => forSkill.filter((r) => r.raterType === type);

    const peers = pooledScores(scoresOf("peer"));
    const directReports = pooledScores(scoresOf("direct-report"));
    const manager = scoresOf("manager").map((r) => r.score);
    const visibleOthers = [...manager, ...(peers ?? []), ...(directReports ?? [])];

    return {
      skillId,
      self: average(scoresOf("self").map((r) => r.score)),
      manager: average(manager),
      peers: peers ? average(peers) : null,
      directReports: directReports ? average(directReports) : null,
      others: average(visibleOthers),
    };
  });

  const visibleCommentGroups = new Set<RaterType>(["manager"]);
  const hiddenGroups: RatingsView["hiddenGroups"] = [];
  for (const type of POOLED) {
    const raters = distinctRaters(ratings.filter((r) => r.raterType === type));
    if (raters >= MIN_RATERS_PER_GROUP) visibleCommentGroups.add(type);
    else if (raters > 0) hiddenGroups.push(type);
  }

  const comments = ratings
    .filter((r) => visibleCommentGroups.has(r.raterType) && r.comment?.trim())
    .map((r) => r.comment!.trim())
    .sort((a, b) => a.localeCompare(b));

  return { skills, comments, hiddenGroups };
}

/** The scores, or null when fewer than MIN_RATERS_PER_GROUP distinct raters gave one. */
function pooledScores(ratings: Rating[]): number[] | null {
  return distinctRaters(ratings) >= MIN_RATERS_PER_GROUP ? ratings.map((r) => r.score) : null;
}

function distinctRaters(ratings: Rating[]): number {
  return new Set(ratings.map((r) => r.raterId)).size;
}

function average(scores: number[]): number | null {
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10;
}
