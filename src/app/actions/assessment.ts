"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireProfile } from "@/lib/current-user";
import { CATEGORIES, SKILLS } from "@/lib/assessment/taxonomy";
import { parseRating, type Rating } from "@/lib/assessment/scale";
import { MANUAL_REMINDER, RELATIONSHIPS, remindPending, sendInvite } from "@/lib/assessment/invites";
import {
  afterRaterResponse,
  completeSelfAssessment,
  getOrCreateRound,
  saveSelfRatings as storeSelfRatings,
  selfRatingsFor,
} from "@/lib/assessment/data";
import type { TargetRole } from "@/shared/roles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function saveSelfRatings(category: string, formData: FormData) {
  const profile = await requireProfile();
  const index = CATEGORIES.findIndex((c) => c.id === category);
  if (index < 0) redirect("/assessment");

  const round = await getOrCreateRound(profile.userId);
  const ratings: Record<string, number> = {};
  const missing: string[] = [];
  for (const skill of SKILLS.filter((s) => s.category === category)) {
    const r = parseRating(formData.get(skill.id));
    if (typeof r === "number") ratings[skill.id] = r;
    else missing.push(skill.id);
  }
  // Keep what was answered even if the step is incomplete, so nothing is lost.
  await storeSelfRatings(round.id, ratings);
  if (missing.length) redirect(`/assessment/${category}?missing=${missing.join(",")}`);

  const next = CATEGORIES[index + 1];
  if (next) redirect(`/assessment/${next.id}`);

  const saved = await selfRatingsFor(round.id);
  const firstMissing = CATEGORIES.find((c) => SKILLS.some((s) => s.category === c.id && saved[s.id] === undefined));
  if (firstMissing) redirect(`/assessment/${firstMissing.id}`);

  await completeSelfAssessment(round, {
    id: profile.userId,
    name: profile.name,
    email: profile.email,
    targetRole: profile.targetRole as TargetRole,
  });
  const invites = await db.raterInvite.count({ where: { roundId: round.id } });
  redirect(invites ? "/gap-report" : "/assessment/invites");
}

export async function addInvite(formData: FormData) {
  const profile = await requireProfile();
  const round = await getOrCreateRound(profile.userId);
  const raterName = String(formData.get("raterName") ?? "").trim();
  const raterEmail = String(formData.get("raterEmail") ?? "").trim().toLowerCase();
  const relationship = String(formData.get("relationship") ?? "");

  let error: string | undefined;
  if (!raterName || !EMAIL_RE.test(raterEmail)) error = "Enter the person’s name and a valid email.";
  else if (raterEmail === profile.email.toLowerCase())
    error = "You can’t invite yourself. Your own ratings come from the self-assessment.";
  else if (await db.raterInvite.findFirst({ where: { roundId: round.id, raterEmail } }))
    error = `${raterEmail} has already been invited.`;
  else if (!RELATIONSHIPS.some((r) => r.id === relationship)) error = "Choose how this person works with you.";
  if (error) redirect(`/assessment/invites?error=${encodeURIComponent(error)}`);

  await sendInvite({ roundId: round.id, userId: profile.userId, userName: profile.name, raterName, raterEmail, relationship });
  redirect("/assessment/invites?msg=sent");
}

export async function remindNow() {
  const profile = await requireProfile();
  const n = await remindPending({ userId: profile.userId, rules: MANUAL_REMINDER });
  redirect(n ? `/assessment/invites?msg=reminded&n=${n}` : "/assessment/invites?msg=none");
}

export async function submitRaterRatings(token: string, formData: FormData) {
  const invite = await db.raterInvite.findUnique({ where: { token } });
  if (!invite || invite.raterEmail === "[removed]") redirect(`/rate/${token}`);
  if (invite.completedAt) redirect(`/rate/${token}`);

  const ratings: Record<string, Rating> = {};
  const missing: string[] = [];
  for (const skill of SKILLS) {
    const r = parseRating(formData.get(skill.id), { allowNotObserved: true });
    if (r === null) missing.push(skill.id);
    else ratings[skill.id] = r;
  }
  if (missing.length) redirect(`/rate/${token}?missing=${missing.join(",")}`);

  // Completion and answers are written together: a double submit can't record two
  // sets, and a failed insert can't leave a "completed" invite with no answers.
  const recorded = await db.$transaction(async (tx) => {
    const { count } = await tx.raterInvite.updateMany({
      where: { token, completedAt: null },
      data: { completedAt: new Date() },
    });
    if (count !== 1) return false;
    await tx.raterRating.createMany({
      data: Object.entries(ratings).map(([skillId, r]) => ({
        inviteToken: token,
        skillId,
        score: typeof r === "number" ? r : null,
      })),
    });
    return true;
  });
  if (recorded) await afterRaterResponse(invite.roundId);
  redirect(`/rate/${token}?done=1`);
}
