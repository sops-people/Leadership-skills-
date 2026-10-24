// Gap report for one user against their target role. Owner: Darko (logic unchanged from his scoring.js).
//
//   role gap   = bar - self             (positive: rates themselves below the bar)
//   blind spot = self - others' average (positive: others see them lower than they see themselves)
//   gap size   = max(role gap, 0) + max(blind spot, 0)
//   priority   = role importance x gap size
//
// Folding a positive blind spot into gap size means a skill the user overrates ranks higher,
// because their real gap to the bar is larger than they think. A negative blind spot is a
// hidden strength and does not reduce priority.
import { SKILLS, type CategoryId, type Skill } from "./taxonomy";
import type { Rating } from "./scale";
import type { TargetRole } from "@/shared/roles";

// 360 results for a skill are shown only once this many raters have scored it (anonymity rule).
export const MIN_RATERS = 3;

export type GapItem = {
  skillId: string;
  name: string;
  category: CategoryId;
  bar: number;
  importance: number;
  self: number | null;
  othersAvg: number | null;
  otherRatings: number;
  roleGap: number | null;
  blindSpot: number | null;
  gapSize: number;
  priority: number;
};

export type GapReport = {
  userId: string;
  targetRole: TargetRole;
  generatedAt: string;
  selfComplete: boolean;
  raters: { completed: number; invited: number; needed: number };
  othersVisible: boolean;
  items: GapItem[];
};

export type RaterResponse = { completedAt: Date | string | null; ratings: Record<string, Rating | null | undefined> };

const round1 = (n: number) => Math.round(n * 10) / 10;
const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const isScore = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

export function buildGapReport({
  user,
  selfRatings = {},
  raterResponses = [],
  skills = SKILLS,
  minRaters = MIN_RATERS,
}: {
  user: { id: string; targetRole: TargetRole };
  selfRatings?: Record<string, number | undefined>;
  raterResponses?: RaterResponse[];
  skills?: Skill[];
  minRaters?: number;
}): GapReport {
  const role = user.targetRole;
  const completed = raterResponses.filter((r) => r.completedAt);

  const items = skills.map((skill): GapItem => {
    const selfValue = selfRatings[skill.id];
    const self = isScore(selfValue) ? selfValue : null;
    const scores = completed.map((r) => r.ratings?.[skill.id]).filter(isScore);
    const othersVisible = scores.length >= minRaters;
    const othersAvg = othersVisible ? average(scores) : null;

    const bar = skill.bars[role];
    const importance = skill.importance[role];
    const roleGap = self === null ? null : bar - self;
    const blindSpot = self === null || othersAvg === null ? null : self - othersAvg;
    const gapSize = Math.max(roleGap ?? 0, 0) + Math.max(blindSpot ?? 0, 0);

    return {
      skillId: skill.id,
      name: skill.name,
      category: skill.category,
      bar,
      importance,
      self,
      othersAvg: othersAvg === null ? null : round1(othersAvg),
      otherRatings: scores.length,
      roleGap,
      blindSpot: blindSpot === null ? null : round1(blindSpot),
      gapSize: round1(gapSize),
      priority: round1(importance * gapSize),
    };
  });

  items.sort((a, b) => b.priority - a.priority || b.importance - a.importance || a.name.localeCompare(b.name));

  return {
    userId: user.id,
    targetRole: role,
    generatedAt: new Date().toISOString(),
    selfComplete: items.every((i) => i.self !== null),
    raters: { completed: completed.length, invited: raterResponses.length, needed: Math.max(minRaters - completed.length, 0) },
    othersVisible: completed.length >= minRaters,
    items,
  };
}
