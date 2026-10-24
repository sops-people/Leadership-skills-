// Converted from Sops's tests/test_learning.py (ProgressTests): the pure rules.
import { describe, expect, it } from "vitest";
import { isItemStatus, isSkillStatus, nextSkillStatus, reassessmentDue, setSkillStatus } from "./progress";

describe("progress rules", () => {
  it("starting an item moves a not-started skill to in progress", () => {
    expect(nextSkillStatus("not_started", "done")).toBe("in_progress");
    expect(nextSkillStatus("not_started", "in_progress")).toBe("in_progress");
    expect(nextSkillStatus("not_started", "not_started")).toBe("not_started");
    expect(nextSkillStatus("improved", "done")).toBe("improved");
  });

  it("rejects unknown statuses", async () => {
    expect(isSkillStatus("finished")).toBe(false);
    expect(isItemStatus("improved")).toBe(false);
    await expect(setSkillStatus("u1", "negotiation", "finished")).rejects.toThrow(/status must be one of/);
  });

  it("re-assessment is due 90 days after the self-assessment", () => {
    const notDue = reassessmentDue(new Date("2026-08-01T00:00:00Z"), new Date("2026-10-24T00:00:00Z"));
    expect(notDue.isDue).toBe(false);
    const due = reassessmentDue(new Date("2026-07-20T00:00:00Z"), new Date("2026-10-24T00:00:00Z"));
    expect(due.isDue).toBe(true);
    expect(due.due.toISOString().slice(0, 10)).toBe("2026-10-18");
  });
});
