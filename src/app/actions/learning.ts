"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/current-user";
import { gapReportFor, startReassessment } from "@/lib/assessment/data";
import { searchSkills } from "@/lib/learning/cache";
import { gapItems } from "@/lib/learning/path";
import { isItemStatus, isSkillStatus, setItemStatus, setSkillStatus, vote } from "@/lib/learning/progress";

// Declared with an explicit `never` return so TypeScript narrows after `if (...) back()`.
function back(error?: string): never {
  redirect(error ? `/learning-path?error=${encodeURIComponent(error)}` : "/learning-path");
}

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

export async function updateSkillStatus(formData: FormData) {
  const profile = await requireProfile();
  const skillId = field(formData, "skillId");
  const status = field(formData, "status");
  if (!skillId || !isSkillStatus(status)) back("Choose a valid status.");
  await setSkillStatus(profile.userId, skillId, status);
  back();
}

export async function updateItemStatus(formData: FormData) {
  const profile = await requireProfile();
  const skillId = field(formData, "skillId");
  const itemId = field(formData, "itemId");
  const status = field(formData, "status");
  if (!skillId || !itemId || !isItemStatus(status)) back("Choose a valid status.");
  const { round } = await gapReportFor(profile.userId, profile.targetRole);
  if (!round) back("Finish your self-assessment first.");
  await setItemStatus(profile.userId, skillId, itemId, status, round.id);
  back();
}

export async function voteItem(formData: FormData) {
  const profile = await requireProfile();
  const itemId = field(formData, "itemId");
  if (!itemId) back();
  await vote(profile.userId, itemId, field(formData, "useful") === "1");
  back();
}

/** Searches content for the skills on the user's path, one skill at a time. Can take a minute. */
export async function findTraining(formData: FormData) {
  const profile = await requireProfile();
  const refresh = field(formData, "refresh") === "1";
  const { report } = await gapReportFor(profile.userId, profile.targetRole);
  await searchSkills(
    gapItems(report).map((g) => ({ id: g.skillId, name: g.name })),
    refresh,
  );
  back();
}

export async function startReassessmentAction() {
  const profile = await requireProfile();
  await startReassessment(profile.userId);
  redirect("/assessment");
}
