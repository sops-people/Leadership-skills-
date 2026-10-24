import { describe, expect, it } from "vitest";
import { AUTO_REMINDER, MANUAL_REMINDER, shouldRemind } from "./invites";

const DAY = 24 * 60 * 60 * 1000;
const created = new Date("2026-10-01T00:00:00Z");
const invite = (patch: Partial<Parameters<typeof shouldRemind>[0]> = {}) => ({
  createdAt: created,
  completedAt: null,
  reminders: 0,
  lastRemindedAt: null,
  ...patch,
});

describe("shouldRemind", () => {
  it("automatic reminders wait 3 days after the invite", () => {
    expect(shouldRemind(invite(), created.getTime() + 2 * DAY, AUTO_REMINDER)).toBe(false);
    expect(shouldRemind(invite(), created.getTime() + 4 * DAY, AUTO_REMINDER)).toBe(true);
  });

  it("stops after the maximum and respects the cooldown", () => {
    const now = created.getTime() + 10 * DAY;
    expect(shouldRemind(invite({ reminders: 2 }), now, AUTO_REMINDER)).toBe(false);
    expect(shouldRemind(invite({ reminders: 1, lastRemindedAt: new Date(now - DAY) }), now, AUTO_REMINDER)).toBe(false);
    expect(shouldRemind(invite({ reminders: 1, lastRemindedAt: new Date(now - 4 * DAY) }), now, AUTO_REMINDER)).toBe(true);
  });

  it("never reminds someone who has responded", () => {
    expect(shouldRemind(invite({ completedAt: new Date() }), created.getTime() + 10 * DAY, AUTO_REMINDER)).toBe(false);
  });

  it("the manual button works at once but only once a day", () => {
    expect(shouldRemind(invite(), created.getTime(), MANUAL_REMINDER)).toBe(true);
    const now = created.getTime() + DAY / 2;
    expect(shouldRemind(invite({ reminders: 1, lastRemindedAt: created }), now, MANUAL_REMINDER)).toBe(false);
  });
});
