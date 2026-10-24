// Sample users for local development (seeded by prisma/seed.ts).
// Skills and the gap report come from Darko's code in src/lib/assessment.

/** Three sample users (User profile format, minus system fields). */
export const SAMPLE_USERS = [
  { name: "Alex Sample", email: "alex@example.com", currentRole: "VP", targetRole: "C-level" },
  { name: "Sam Sample", email: "sam@example.com", currentRole: "Director", targetRole: "VP" },
  { name: "Jo Sample", email: "jo@example.com", currentRole: "Manager", targetRole: "Director" },
] as const;
