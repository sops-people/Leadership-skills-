// Assessment storage: rounds, self ratings and rater answers, plus the events and
// emails that follow from them. Each re-assessment is a new round.
import { Prisma, type AssessmentRound } from "@prisma/client";
import { db } from "../db";
import { appUrl } from "../config";
import { requestEmail, purgeRecipientData } from "../email/send";
import { track } from "../metrics/track";
import { buildGapReport, MIN_RATERS, type GapReport, type RaterResponse } from "./scoring";
import { NOT_OBSERVED } from "./scale";
import { REASSESS_AFTER_DAYS, reassessmentDue } from "../learning/progress";
import type { TargetRole } from "@/shared/roles";

export async function latestRound(userId: string): Promise<AssessmentRound | null> {
  return db.assessmentRound.findFirst({ where: { userId }, orderBy: { number: "desc" } });
}

export async function getOrCreateRound(userId: string): Promise<AssessmentRound> {
  const round = await latestRound(userId);
  if (round) return round;
  try {
    return await db.assessmentRound.create({ data: { userId, number: 1 } });
  } catch {
    // Two requests created round 1 at once; use the one that won.
    return db.assessmentRound.findFirstOrThrow({ where: { userId }, orderBy: { number: "desc" } });
  }
}

export async function selfRatingsFor(roundId: string): Promise<Record<string, number>> {
  const rows = await db.selfRating.findMany({ where: { roundId } });
  return Object.fromEntries(rows.map((r) => [r.skillId, r.score]));
}

async function raterResponsesFor(roundId: string): Promise<RaterResponse[]> {
  const invites = await db.raterInvite.findMany({ where: { roundId }, include: { ratings: true } });
  return invites.map((i) => ({
    completedAt: i.completedAt,
    ratings: Object.fromEntries(i.ratings.map((r) => [r.skillId, r.score ?? NOT_OBSERVED])),
  }));
}

export async function gapReportFor(
  userId: string,
  targetRole: TargetRole,
): Promise<{ round: AssessmentRound | null; report: GapReport }> {
  const round = await latestRound(userId);
  const report = buildGapReport({
    user: { id: userId, targetRole },
    selfRatings: round ? await selfRatingsFor(round.id) : {},
    raterResponses: round ? await raterResponsesFor(round.id) : [],
  });
  return { round, report };
}

/** Saves self ratings; keeps partial answers. */
export async function saveSelfRatings(roundId: string, ratings: Record<string, number>) {
  await db.$transaction(
    Object.entries(ratings).map(([skillId, score]) =>
      db.selfRating.upsert({
        where: { roundId_skillId: { roundId, skillId } },
        update: { score },
        create: { roundId, skillId, score },
      }),
    ),
  );
}

/** First completion of a round's self-assessment: record it, log metrics, schedule the 90-day reminder. */
export async function completeSelfAssessment(
  round: AssessmentRound,
  user: { id: string; name: string; email: string; targetRole: TargetRole },
) {
  const { count } = await db.assessmentRound.updateMany({
    where: { id: round.id, selfCompletedAt: null },
    data: { selfCompletedAt: new Date() },
  });
  if (count !== 1) return;

  const { report } = await gapReportFor(user.id, user.targetRole);
  await track("self-assessment-completed", user.id, { assessmentId: round.id });
  await track("gap-report-created", user.id, {
    reportId: round.id,
    cycle: round.number,
    gaps: Object.fromEntries(report.items.filter((i) => i.roleGap !== null).map((i) => [i.skillId, i.roleGap as number])),
  });
  await requestEmail({
    recipient: user.email,
    template: "reassessment-reminder",
    links: [`${appUrl()}/assessment`],
    variables: { name: user.name },
    sendAt: new Date(Date.now() + REASSESS_AFTER_DAYS * 24 * 60 * 60 * 1000),
    requestedBy: "assessment",
    // Tied to the round, so starting a re-assessment cancels this reminder.
    relatedId: round.id,
    userId: user.id,
  });
}

/** After a rater responds: once completed raters reach MIN_RATERS, the 360 cycle closes (once per round). */
export async function afterRaterResponse(roundId: string) {
  const round = await db.assessmentRound.findUnique({ where: { id: roundId }, include: { user: true } });
  if (!round || !round.user.targetRole) return;
  const completed = await db.raterInvite.count({ where: { roundId, completedAt: { not: null } } });
  if (completed < MIN_RATERS) return;
  // Conditional update, so two raters finishing at once can't skip or double the event.
  const { count } = await db.assessmentRound.updateMany({
    where: { id: roundId, cycleClosedAt: null },
    data: { cycleClosedAt: new Date() },
  });
  if (count !== 1) return;

  const { report } = await gapReportFor(round.userId, round.user.targetRole as TargetRole);
  await track("360-cycle-closed", round.userId, {
    cycle: round.number,
    pairs: report.items
      .filter((i) => i.self !== null && i.othersAvg !== null)
      .map((i) => ({ skillId: i.skillId, self: i.self as number, others: i.othersAvg as number })),
  });
}

/**
 * Starts the next round, only once the previous one is 90 days past its self-assessment.
 * Removes the previous round's rater emails and cancels its queued emails (privacy rule).
 * Returns the current round unchanged when a re-assessment isn't due.
 */
export async function startReassessment(userId: string): Promise<AssessmentRound | null> {
  const prev = await latestRound(userId);
  if (!prev?.selfCompletedAt || !reassessmentDue(prev.selfCompletedAt).isDue) return prev;
  try {
    const next = await db.assessmentRound.create({ data: { userId, number: prev.number + 1 } });
    await purgeRecipientData(prev.id);
    await db.raterInvite.updateMany({ where: { roundId: prev.id }, data: { raterEmail: "[removed]" } });
    return next;
  } catch (err) {
    // P2002: a double click already created the next round.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return latestRound(userId);
    throw err;
  }
}
