// Role list for current and target role. Proposed in the kickoff doc from PRD
// sections 5 and 8 (managers through C-level). Darko's role bars use the same list.
export const ROLES = ["Manager", "Director", "VP", "C-level"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** A target role must be the same level as the current role or higher. */
export function isValidTransition(current: Role, target: Role): boolean {
  return ROLES.indexOf(target) >= ROLES.indexOf(current);
}
