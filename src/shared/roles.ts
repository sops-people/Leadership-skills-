// Roles. Current role can be any of ROLES; target role must be in TARGET_ROLES,
// because Darko's role bars cover Director, VP and C-level only.
export const ROLES = ["Manager", "Director", "VP", "C-level"] as const;
export const TARGET_ROLES = ["Director", "VP", "C-level"] as const;

export type Role = (typeof ROLES)[number];
export type TargetRole = (typeof TARGET_ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isTargetRole(value: unknown): value is TargetRole {
  return typeof value === "string" && (TARGET_ROLES as readonly string[]).includes(value);
}

/** A target role must be the same level as the current role or higher. */
export function isValidTransition(current: Role, target: TargetRole): boolean {
  return ROLES.indexOf(target) >= ROLES.indexOf(current);
}
