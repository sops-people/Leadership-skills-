import { describe, expect, it } from "vitest";
import { toRatingsView, type Rating } from "./anonymity";
import { SAMPLE_RATINGS } from "@/shared/sample-data";

describe("toRatingsView", () => {
  it("shows peers once 3 have rated, and hides 2 direct reports", () => {
    const view = toRatingsView(SAMPLE_RATINGS);
    const comms = view.skills.find((s) => s.skillId === "communication")!;
    expect(comms.self).toBe(4);
    expect(comms.manager).toBe(3);
    expect(comms.peers).toBe(2.7);
    expect(comms.directReports).toBeNull();
    // others = manager 3 + peers 3, 2, 3
    expect(comms.others).toBe(2.8);
    expect(view.hiddenGroups).toEqual(["direct-report"]);
  });

  it("never shows comments from a group below the minimum", () => {
    const view = toRatingsView(SAMPLE_RATINGS);
    expect(view.comments).toEqual(["Clear in meetings, less so in writing."]);
  });

  it("contains no rater ids", () => {
    const json = JSON.stringify(toRatingsView(SAMPLE_RATINGS));
    expect(json).not.toMatch(/peer-1|mgr-1|dr-1/);
  });

  it("counts distinct raters, not ratings", () => {
    const sameRaterThreeTimes: Rating[] = [1, 2, 3].map((score) => ({
      raterId: "peer-1",
      raterType: "peer",
      skillId: "negotiation",
      score,
    }));
    expect(toRatingsView(sameRaterThreeTimes).skills[0].peers).toBeNull();
  });

  it("sorts comments so their order doesn't hint at who wrote them", () => {
    const ratings: Rating[] = ["Zed", "Alpha", "Mid"].map((comment, i) => ({
      raterId: `p${i}`,
      raterType: "peer",
      skillId: "coaching",
      score: 3,
      comment,
    }));
    expect(toRatingsView(ratings).comments).toEqual(["Alpha", "Mid", "Zed"]);
  });
});
