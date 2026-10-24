// Shared data formats, agreed in week 1. Each format has one owner; the others
// build against it. Change a format only with its owner.
//
//   User profile     Maria  (final draft, below)
//   Email request    Maria  (final draft, below)
//   Skill taxonomy   Darko  (placeholder)
//   Gap report       Darko  (placeholder)
//   Progress update  Sops   (placeholder)

import { z } from "zod";
import { ROLES } from "./roles";

// ---------- User profile (owner: Maria) ----------

export const userProfileSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  currentRole: z.enum(ROLES),
  targetRole: z.enum(ROLES),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// ---------- Email request (owner: Maria) ----------

export const EMAIL_TEMPLATES = [
  "login-link",
  "rater-invite",
  "rater-reminder",
  "reassessment-reminder",
] as const;

export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export const emailRequestInputSchema = z.object({
  recipient: z.string().email(),
  template: z.enum(EMAIL_TEMPLATES),
  /** Personal links, e.g. the rater page. Each should be unique to the recipient and expire. */
  links: z.array(z.string().url()).min(1),
  variables: z.record(z.string()).default({}),
  /** Leave empty to send now. Set it to schedule a reminder. */
  sendAt: z.coerce.date().optional(),
  requestedBy: z.enum(["platform", "assessment", "learning-path"]),
  /** Groups emails for clean-up, e.g. the 360 cycle id. See purgeRecipientData(). */
  relatedId: z.string().optional(),
  /** The app user this email is about, if any. */
  userId: z.string().uuid().optional(),
});

export type EmailRequestInput = z.input<typeof emailRequestInputSchema>;

// ---------- Placeholders for the other owners to replace ----------

/** Owner: Darko. Placeholder shape so sample data and metrics compile. */
export type Skill = {
  skillId: string;
  name: string;
  category: "hard" | "soft";
};

/** Owner: Darko. Placeholder: gap = role bar minus self rating, positive means a gap. */
export type GapReport = {
  reportId: string;
  userId: string;
  cycle: number;
  createdAt: Date;
  gaps: { skillId: string; roleGap: number; selfVs360Gap: number | null }[];
};

/** Owner: Sops. Placeholder, using the PRD's statuses. */
export type ProgressUpdate = {
  userId: string;
  pathId: string;
  itemId: string;
  skillId: string;
  status: "not-started" | "in-progress" | "improved";
  updatedAt: Date;
};
