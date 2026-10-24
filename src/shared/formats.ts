// Shared data formats. Each format has one owner; the others build against it.
// Change a format only with its owner.
//
//   User profile     Maria  below
//   Email request    Maria  below
//   Skill taxonomy   Darko  src/lib/assessment/taxonomy.ts
//   Gap report       Darko  src/lib/assessment/scoring.ts (buildGapReport)
//   Progress update  Sops   src/lib/learning

import { z } from "zod";
import { ROLES, TARGET_ROLES } from "./roles";

// ---------- User profile (owner: Maria) ----------

export const userProfileSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  currentRole: z.enum(ROLES),
  targetRole: z.enum(TARGET_ROLES),
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

// The other three formats live with their owners' code (see the table above).
