import { describe, expect, it } from "vitest";
import { computeMetrics } from "./compute";
import type { EventName, EventProps, StoredEvent } from "@/shared/events";

const ev = <N extends EventName>(name: N, userId: string, props: EventProps[N], day = 0): StoredEvent =>
  ({ name, userId, props, createdAt: new Date(2026, 0, 1 + day) }) as StoredEvent;

describe("computeMetrics", () => {
  it("returns null values when there are no events", () => {
    const m = computeMetrics([]);
    expect(m.assessmentCompletion).toEqual({ value: null, sampleSize: 0 });
    expect(m.gapClosure.value).toBeNull();
    expect(m.selfVs360Convergence.value).toBeNull();
    expect(m.learningPathCompletion.value).toBeNull();
  });

  it("assessment completion = assessed / onboarded", () => {
    const m = computeMetrics([
      ev("onboarding-completed", "a", { currentRole: "VP", targetRole: "C-level" }),
      ev("onboarding-completed", "b", { currentRole: "VP", targetRole: "C-level" }),
      ev("self-assessment-completed", "a", { assessmentId: "x" }),
      ev("self-assessment-completed", "a", { assessmentId: "y" }),
    ]);
    expect(m.assessmentCompletion).toEqual({ value: 0.5, sampleSize: 2 });
  });

  it("gap closure compares first and latest report, by cycle", () => {
    const m = computeMetrics([
      ev("gap-report-created", "a", { reportId: "2", cycle: 2, gaps: { s1: 1, s2: 2 } }),
      ev("gap-report-created", "a", { reportId: "1", cycle: 1, gaps: { s1: 2, s2: 2, s3: 0 } }),
      ev("gap-report-created", "b", { reportId: "3", cycle: 1, gaps: { s1: 2 } }),
    ]);
    // s1 closed 50%, s2 0%, s3 ignored (no gap); b has one report only
    expect(m.gapClosure).toEqual({ value: 0.25, sampleSize: 1 });
  });

  it("convergence is the drop in average |self - others|", () => {
    const m = computeMetrics([
      ev("360-cycle-closed", "a", { cycle: 1, pairs: [{ skillId: "s1", self: 4, others: 2 }] }),
      ev("360-cycle-closed", "a", { cycle: 2, pairs: [{ skillId: "s1", self: 3.5, others: 3 }] }),
    ]);
    expect(m.selfVs360Convergence).toEqual({ value: 1.5, sampleSize: 1 });
  });

  it("learning path completion uses each item's latest status", () => {
    const m = computeMetrics([
      ev("path-created", "a", { pathId: "p", itemCount: 4 }),
      ev("item-status-changed", "a", { pathId: "p", itemId: "1", status: "improved" }, 1),
      ev("item-status-changed", "a", { pathId: "p", itemId: "2", status: "improved" }, 1),
      ev("item-status-changed", "a", { pathId: "p", itemId: "2", status: "in-progress" }, 2),
    ]);
    expect(m.learningPathCompletion).toEqual({ value: 0.25, sampleSize: 1 });
  });
});
