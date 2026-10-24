// Converted from Sops's tests/test_learning.py (PathTests), now reading Darko's gap report format.
import { describe, expect, it } from "vitest";
import { buildPath } from "./path";
import type { GapItem, GapReport } from "@/lib/assessment/scoring";

const gap = (skillId: string, name: string, roleGap: number, blindSpot: number | null, priority: number): GapItem => ({
  skillId,
  name,
  category: "soft",
  bar: 4,
  importance: 2,
  self: 3,
  othersAvg: null,
  otherRatings: 0,
  roleGap,
  blindSpot,
  gapSize: 0,
  priority,
});

const report: GapReport = {
  userId: "u1",
  targetRole: "VP",
  generatedAt: "2026-10-24T00:00:00.000Z",
  selfComplete: true,
  raters: { completed: 3, invited: 3, needed: 0 },
  othersVisible: true,
  items: [
    gap("negotiation", "Negotiation", 1, 0, 0.6),
    gap("feedback", "Giving & receiving feedback", 1, 1, 1.8),
    gap("done", "Done skill", 0, -0.5, 0),
  ],
};

describe("buildPath", () => {
  it("orders by priority and skips closed gaps", () => {
    const steps = buildPath(report, {}, () => ({ items: [], errors: [] }));
    expect(steps.map((s) => s.skillId)).toEqual(["feedback", "negotiation"]);
    expect(steps.map((s) => s.order)).toEqual([1, 2]);
  });

  it("treats a hidden blind spot (null) as no blind spot", () => {
    const hidden: GapReport = { ...report, items: [gap("x", "X skill", 0, null, 0)] };
    expect(buildPath(hidden, {}, () => null)).toEqual([]);
  });

  it("marks skills that haven't been searched yet", () => {
    const steps = buildPath(report, {}, () => null);
    expect(steps.every((s) => !s.searched && s.items.length === 0)).toBe(true);
  });
});
