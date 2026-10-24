// Assessment storage: rounds, self ratings and rater answers, plus the events and
// emails that follow from them. Each re-assessment is a new round.
import type { AssessmentRound } from "@prisma/client";
import { db } from "../db";
import { appUrl } from "../config";
import { requestEmail, purgeRecipientData } from "../email/send";
import { track } from "../metrics/track";
import { buildGapReport, MIN_RATERS, type GapReport, type RaterResponse } from "./scoring";
import { NOT_OBSERVED } from "./scale";
import type { TargetRole } from "@/shared/roles";

const REASSESS_AFTER_DAYS = 90;

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
    userId: user.id,
  });
}

/** After a rater responds: when completed raters reach exactly MIN_RATERS, the 360 cycle closes. */
export async function afterRaterResponse(roundId: string) {
  const round = await db.assessmentRound.findUnique({ where: { id: roundId }, include: { user: true } });
  if (!round) return;
  const completed = await db.raterInvite.count({ where: { roundId, completedAt: { not: null } } });
  if (completed !== MIN_RATERS || !round.user.targetRole) return;

  const { report } = await gapReportFor(round.userId, round.user.targetRole as TargetRole);
  await track("360-cycle-closed", round.userId, {
    cycle: round.number,
    pairs: report.items
      .filter((i) => i.self !== null && i.othersAvg !== null)
      .map((i) => ({ skillId: i.skillId, self: i.self as number, others: i.othersAvg as number })),
  });
}

/** Starts the next round. Removes rater emails from the previous one (privacy rule). */
export async function startReassessment(userId: string): Promise<AssessmentRound> {
  const prev = await latestRound(userId);
  if (prev) {
    await purgeRecipientData(prev.id);
    await db.raterInvite.updateMany({ where: { roundId: prev.id }, data: { raterEmail: "[removed]" } });
  }
  return db.assessmentRound.create({ data: { userId, number: (prev?.number ?? 0) + 1 } });
}
