// 360 invites and reminders. Owner: Darko (rules unchanged; storage and email now use the platform).
import { randomBytes } from "node:crypto";
import { db } from "../db";
import { appUrl } from "../config";
import { requestEmail } from "../email/send";

export const RELATIONSHIPS = [
  { id: "manager", name: "Manager" },
  { id: "peer", name: "Peer" },
  { id: "direct_report", name: "Direct report" },
  { id: "other", name: "Other" },
] as const;

export const relationshipName = (id: string) => RELATIONSHIPS.find((r) => r.id === id)?.name ?? id;

const DAY = 24 * 60 * 60 * 1000;

export type ReminderRules = { minAgeMs: number; cooldownMs: number; maxReminders: number };

// Automatic reminders: first one 3 days after the invite, then every 3 days, at most 2.
export const AUTO_REMINDER: ReminderRules = { minAgeMs: 3 * DAY, cooldownMs: 3 * DAY, maxReminders: 2 };
// "Remind now" button: no waiting period, but at most once a day per rater.
export const MANUAL_REMINDER: ReminderRules = { minAgeMs: 0, cooldownMs: DAY, maxReminders: 5 };

export const raterLink = (token: string) => `${appUrl()}/rate/${token}`;

type InviteTiming = {
  createdAt: Date;
  completedAt: Date | null;
  reminders: number;
  lastRemindedAt: Date | null;
};

export function shouldRemind(invite: InviteTiming, now: number, rules: ReminderRules): boolean {
  if (invite.completedAt || invite.reminders >= rules.maxReminders) return false;
  if (now - invite.createdAt.getTime() < rules.minAgeMs) return false;
  if (invite.lastRemindedAt && now - invite.lastRemindedAt.getTime() < rules.cooldownMs) return false;
  return true;
}

export async function sendInvite({
  roundId,
  userId,
  userName,
  raterName,
  raterEmail,
  relationship,
}: {
  roundId: string;
  /** The user being rated; deleting their account deletes these emails too. */
  userId: string;
  userName: string;
  raterName: string;
  raterEmail: string;
  relationship: string;
}) {
  const invite = await db.raterInvite.create({
    data: { token: randomBytes(16).toString("hex"), roundId, raterName, raterEmail, relationship },
  });
  await requestEmail({
    recipient: raterEmail,
    template: "rater-invite",
    links: [raterLink(invite.token)],
    variables: { userName, raterName },
    requestedBy: "assessment",
    relatedId: roundId,
    userId,
  });
  return invite;
}

/**
 * Sends reminders to raters who have not responded. Returns how many were sent.
 * Pass userId to limit to one user's raters (the "Remind now" button).
 */
export async function remindPending({
  userId,
  rules = AUTO_REMINDER,
  now = Date.now(),
}: { userId?: string; rules?: ReminderRules; now?: number } = {}): Promise<number> {
  const invites = await db.raterInvite.findMany({
    where: { completedAt: null, raterEmail: { not: "[removed]" }, ...(userId ? { round: { userId } } : {}) },
    include: { round: { include: { user: true } } },
  });
  let sent = 0;
  for (const invite of invites) {
    if (!shouldRemind(invite, now, rules)) continue;
    await requestEmail({
      recipient: invite.raterEmail,
      template: "rater-reminder",
      links: [raterLink(invite.token)],
      variables: { userName: invite.round.user.name, raterName: invite.raterName },
      requestedBy: "assessment",
      relatedId: invite.roundId,
      userId: invite.round.userId,
    });
    await db.raterInvite.update({
      where: { token: invite.token },
      data: { reminders: invite.reminders + 1, lastRemindedAt: new Date(now) },
    });
    sent++;
  }
  return sent;
}
