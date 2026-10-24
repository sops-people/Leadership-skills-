// Progress tracking, usefulness votes and the 90-day re-assessment.
// Owner: Sops (converted from learning/progress.py). State now lives in the database;
// the re-assessment email is scheduled when the self-assessment is completed.
import { db } from "../db";
import { track } from "../metrics/track";
import type { Votes } from "./types";

export const SKILL_STATUSES = ["not_started", "in_progress", "improved"] as const;
export const ITEM_STATUSES = ["not_started", "in_progress", "done"] as const;
export const REASSESS_AFTER_DAYS = 90;

export type SkillStatus = (typeof SKILL_STATUSES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const SKILL_LABELS: Record<SkillStatus, string> = { not_started: "Not started", in_progress: "In progress", improved: "Improved" };
export const ITEM_LABELS: Record<ItemStatus, string> = { not_started: "Not started", in_progress: "In progress", done: "Done" };

export function isSkillStatus(value: unknown): value is SkillStatus {
  return typeof value === "string" && (SKILL_STATUSES as readonly string[]).includes(value);
}

export function isItemStatus(value: unknown): value is ItemStatus {
  return typeof value === "string" && (ITEM_STATUSES as readonly string[]).includes(value);
}

/** Starting any item moves a not-started skill to in progress. */
export function nextSkillStatus(current: SkillStatus, itemStatus: ItemStatus): SkillStatus {
  return itemStatus !== "not_started" && current === "not_started" ? "in_progress" : current;
}

export function reassessmentDue(selfCompletedAt: Date, now = new Date()): { due: Date; isDue: boolean } {
  const due = new Date(selfCompletedAt.getTime() + REASSESS_AFTER_DAYS * 86_400_000);
  return { due, isDue: now >= due };
}

export async function loadState(userId: string) {
  const [skills, items, votes] = await Promise.all([
    db.skillProgress.findMany({ where: { userId } }),
    db.itemProgress.findMany({ where: { userId } }),
    db.itemVote.findMany({ where: { userId } }),
  ]);
  return {
    skills: Object.fromEntries(skills.map((s) => [s.skillId, s.status as SkillStatus])) as Record<string, SkillStatus>,
    /** Keyed by `${skillId}/${itemId}`. */
    items: Object.fromEntries(items.map((i) => [`${i.skillId}/${i.itemId}`, i.status as ItemStatus])) as Record<string, ItemStatus>,
    feedback: Object.fromEntries(votes.map((v) => [v.itemId, { useful: v.useful, notUseful: v.notUseful }])) as Record<string, Votes>,
  };
}

export async function setSkillStatus(userId: string, skillId: string, status: string) {
  if (!isSkillStatus(status)) throw new Error(`status must be one of ${SKILL_STATUSES.join(", ")}`);
  await db.skillProgress.upsert({
    where: { userId_skillId: { userId, skillId } },
    update: { status },
    create: { userId, skillId, status },
  });
}

export async function setItemStatus(userId: string, skillId: string, itemId: string, status: string, pathId: string) {
  if (!isItemStatus(status)) throw new Error(`status must be one of ${ITEM_STATUSES.join(", ")}`);
  await db.itemProgress.upsert({
    where: { userId_skillId_itemId: { userId, skillId, itemId } },
    update: { status },
    create: { userId, skillId, itemId, status },
  });
  const skill = await db.skillProgress.findUnique({ where: { userId_skillId: { userId, skillId } } });
  const current = (skill?.status as SkillStatus | undefined) ?? "not_started";
  const next = nextSkillStatus(current, status);
  if (next !== current) await setSkillStatus(userId, skillId, next);
  await track("item-status-changed", userId, { pathId, itemId, status });
}

export async function vote(userId: string, itemId: string, useful: boolean) {
  await db.itemVote.upsert({
    where: { userId_itemId: { userId, itemId } },
    update: useful ? { useful: { increment: 1 } } : { notUseful: { increment: 1 } },
    create: { userId, itemId, useful: useful ? 1 : 0, notUseful: useful ? 0 : 1 },
  });
}
