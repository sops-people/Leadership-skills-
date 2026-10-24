import { SKILLS } from './taxonomy.js';

// 360 results for a skill are shown only once this many raters have scored it (anonymity rule).
export const MIN_RATERS = 3;

const round1 = (n) => Math.round(n * 10) / 10;
const average = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Builds the gap report for one user against their target role.
//
//   role gap   = bar − self             (positive: rates themselves below the bar)
//   blind spot = self − others' average (positive: others see them lower than they see themselves)
//   gap size   = max(role gap, 0) + max(blind spot, 0)
//   priority   = role importance × gap size
//
// Folding a positive blind spot into gap size means a skill the user overrates ranks higher,
// because their real gap to the bar is larger than they think. A negative blind spot is a
// hidden strength and does not reduce priority.
export function buildGapReport({ user, selfRatings = {}, raterResponses = [], skills = SKILLS, minRaters = MIN_RATERS }) {
  const role = user.targetRole;
  const completed = raterResponses.filter((r) => r.completedAt);

  const items = skills.map((skill) => {
    const self = Number.isInteger(selfRatings[skill.id]) ? selfRatings[skill.id] : null;
    const scores = completed.map((r) => r.ratings?.[skill.id]).filter(Number.isInteger);
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
