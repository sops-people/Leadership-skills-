import { describe, expect, it } from "vitest";
import { buildGapReport, MIN_RATERS, type RaterResponse } from "./scoring";
import { SKILLS, type Skill } from "./taxonomy";
import { RATING_SCALE } from "./scale";
import { TARGET_ROLES } from "@/shared/roles";

// Ported from Darko's test/scoring.test.js.
const skill = (id: string, bar: number, importance: 1 | 2 | 3): Skill => ({
  id,
  name: id,
  category: "c_level",
  description: "",
  statement: "",
  behaviours: [],
  bars: { Director: bar, VP: bar, "C-level": bar },
  importance: { Director: importance, VP: importance, "C-level": importance },
});
const user = { id: "u1", targetRole: "VP" as const };
const rater = (ratings: RaterResponse["ratings"]): RaterResponse => ({ completedAt: "2026-10-24T00:00:00Z", ratings });

describe("buildGapReport", () => {
  it("taxonomy has 19 skills (11 C-level, 8 soft) with bars and importance for every role", () => {
    expect(SKILLS).toHaveLength(19);
    expect(SKILLS.filter((s) => s.category === "c_level")).toHaveLength(11);
    expect(SKILLS.filter((s) => s.category === "soft")).toHaveLength(8);
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(19);
    for (const s of SKILLS) {
      expect(Boolean(s.description && s.statement && s.behaviours.length >= 3), s.id).toBe(true);
      for (const role of TARGET_ROLES) {
        expect(s.bars[role] >= 1 && s.bars[role] <= 5, `${s.id} bar ${role}`).toBe(true);
        expect([1, 2, 3]).toContain(s.importance[role]);
      }
    }
    expect(RATING_SCALE.map((r) => r.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("role gap = bar - self, and priority = importance x gap when there is no 360 yet", () => {
    const report = buildGapReport({ user, skills: [skill("a", 4, 3), skill("b", 4, 1)], selfRatings: { a: 2, b: 2 } });
    const a = report.items.find((i) => i.skillId === "a")!;
    expect(a.roleGap).toBe(2);
    expect(a.blindSpot).toBeNull();
    expect(a.priority).toBe(6);
    expect(report.items.map((i) => i.skillId)).toEqual(["a", "b"]);
  });

  it("360 averages stay hidden until enough people have rated", () => {
    const skills = [skill("a", 4, 2)];
    const two = buildGapReport({
      user,
      skills,
      selfRatings: { a: 4 },
      raterResponses: [rater({ a: 2 }), rater({ a: 2 }), { completedAt: null, ratings: {} }],
    });
    expect(two.othersVisible).toBe(false);
    expect(two.raters.needed).toBe(MIN_RATERS - 2);
    expect(two.items[0].othersAvg).toBeNull();
    expect(two.items[0].blindSpot).toBeNull();

    const three = buildGapReport({
      user,
      skills,
      selfRatings: { a: 4 },
      raterResponses: [rater({ a: 2 }), rater({ a: 2 }), rater({ a: 3 })],
    });
    expect(three.othersVisible).toBe(true);
    expect(three.items[0].othersAvg).toBe(2.3);
  });

  it("blind spot = self - others, and an overrated skill moves up the ranking", () => {
    const report = buildGapReport({
      user,
      skills: [skill("overrated", 4, 2), skill("below-bar", 4, 2)],
      selfRatings: { overrated: 4, "below-bar": 3 },
      raterResponses: [
        rater({ overrated: 2, "below-bar": 3 }),
        rater({ overrated: 2, "below-bar": 3 }),
        rater({ overrated: 2, "below-bar": 3 }),
      ],
    });
    const [first, second] = report.items;
    expect(first.skillId).toBe("overrated");
    expect(first.roleGap).toBe(0);
    expect(first.blindSpot).toBe(2);
    expect(first.priority).toBe(4);
    expect(second.roleGap).toBe(1);
    expect(second.blindSpot).toBe(0);
    expect(second.priority).toBe(2);
  });

  it("hidden strengths and above-bar ratings do not add priority", () => {
    const report = buildGapReport({
      user,
      skills: [skill("a", 3, 3)],
      selfRatings: { a: 4 },
      raterResponses: [rater({ a: 5 }), rater({ a: 5 }), rater({ a: 5 })],
    });
    expect(report.items[0].roleGap).toBe(-1);
    expect(report.items[0].blindSpot).toBe(-1);
    expect(report.items[0].priority).toBe(0);
  });

  it('"not observed" answers are left out, so a skill needs 3 real ratings to show', () => {
    const report = buildGapReport({
      user,
      skills: [skill("a", 4, 2)],
      selfRatings: { a: 3 },
      raterResponses: [rater({ a: 3 }), rater({ a: 3 }), rater({ a: "n/a" })],
    });
    expect(report.othersVisible).toBe(true);
    expect(report.items[0].otherRatings).toBe(2);
    expect(report.items[0].othersAvg).toBeNull();
  });
});
