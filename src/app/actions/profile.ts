"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { track } from "@/lib/metrics/track";
import { deleteAccount } from "@/lib/privacy/deletion";
import { SESSION_COOKIE } from "@/lib/session";
import { ROLES, isValidTransition } from "@/shared/roles";

const rolesSchema = z.object({
  currentRole: z.enum(ROLES),
  targetRole: z.enum(ROLES),
});

function parseRoles(formData: FormData) {
  const parsed = rolesSchema.safeParse({
    currentRole: formData.get("currentRole"),
    targetRole: formData.get("targetRole"),
  });
  if (!parsed.success) return { ok: false, error: "Please choose both roles." } as const;
  if (!isValidTransition(parsed.data.currentRole, parsed.data.targetRole)) {
    return { ok: false, error: "Your target role should be your current level or higher." } as const;
  }
  return { ok: true, roles: parsed.data } as const;
}

export async function completeOnboarding(formData: FormData) {
  const user = await requireUser();
  const result = parseRoles(formData);
  if (!result.ok) redirect(`/onboarding?error=${encodeURIComponent(result.error)}`);

  const firstTime = !user.currentRole || !user.targetRole;
  await db.user.update({ where: { id: user.id }, data: result.roles });
  if (firstTime) await track("onboarding-completed", user.id, result.roles);
  redirect("/home");
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = z.string().trim().min(1).max(100).safeParse(formData.get("name"));
  const result = parseRoles(formData);
  if (!name.success) redirect(`/profile?error=${encodeURIComponent("Please enter your name.")}`);
  if (!result.ok) redirect(`/profile?error=${encodeURIComponent(result.error)}`);

  await db.user.update({ where: { id: user.id }, data: { name: name.data, ...result.roles } });
  redirect("/profile?saved=1");
}

export async function deleteMyAccount(formData: FormData) {
  const user = await requireUser();
  if (formData.get("confirm") !== "yes") {
    redirect(`/profile?error=${encodeURIComponent("Tick the box to confirm you want to delete your account.")}`);
  }
  await deleteAccount(user.id);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/?deleted=1");
}
