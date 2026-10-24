// Use these in server components and server actions to get the signed-in user.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE, readSessionToken } from "./session";
import { userProfileSchema, type UserProfile } from "@/shared/formats";

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const userId = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
}

/** Signed in, onboarding not required. Redirects to log-in otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/log-in");
  return user;
}

/** Signed in and onboarded. Returns the shared User profile format. */
export async function requireProfile(): Promise<UserProfile> {
  const user = await requireUser();
  const profile = toUserProfile(user);
  if (!profile) redirect("/onboarding");
  return profile;
}

/** Null until the user has set both roles in onboarding. */
export function toUserProfile(user: User): UserProfile | null {
  const parsed = userProfileSchema.safeParse({
    userId: user.id,
    name: user.name,
    email: user.email,
    currentRole: user.currentRole,
    targetRole: user.targetRole,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
  return parsed.success ? parsed.data : null;
}
