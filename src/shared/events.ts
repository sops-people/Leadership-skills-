// Events that feed the four success metrics (PRD section 9).
// Record them with track() from "@/lib/metrics/track". Where each is sent from:
//
//   signed-up, onboarding-completed      platform (sign-up, onboarding)
//   self-assessment-completed            assessment (Darko's code)
//   gap-report-created, 360-cycle-closed assessment (Darko's code)
//   path-created, item-status-changed    learning path (Sops's code)

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
    status: "not_started" | "in_progress" | "done";
  };
};

export type EventName = keyof EventProps;

export type StoredEvent<N extends EventName = EventName> = {
  name: N;
  userId: string | null;
  props: EventProps[N];
  createdAt: Date;
};
