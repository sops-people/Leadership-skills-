// Events that feed the four success metrics (PRD section 9).
// Record them with track() from "@/lib/metrics/track". Who sends each one:
//
//   signed-up, onboarding-completed      Maria (already wired in)
//   self-assessment-completed            Darko
//   gap-report-created, 360-cycle-closed Darko
//   path-created, item-status-changed    Sops

export type EventProps = {
  "signed-up": Record<string, never>;
  "onboarding-completed": { currentRole: string; targetRole: string };
  "self-assessment-completed": { assessmentId: string };
  /** gaps: skillId -> role bar minus self rating (positive = gap). */
  "gap-report-created": { reportId: string; cycle: number; gaps: Record<string, number> };
  /** One entry per skill: the user's self rating and the visible average of others' ratings. */
  "360-cycle-closed": { cycle: number; pairs: { skillId: string; self: number; others: number }[] };
  "path-created": { pathId: string; itemCount: number };
  "item-status-changed": {
    pathId: string;
    itemId: string;
    status: "not-started" | "in-progress" | "improved";
  };
};

export type EventName = keyof EventProps;

export type StoredEvent<N extends EventName = EventName> = {
  name: N;
  userId: string | null;
  props: EventProps[N];
  createdAt: Date;
};
