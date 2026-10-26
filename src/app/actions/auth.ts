"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendLoginLink } from "@/lib/auth";
import { track } from "@/lib/metrics/track";
import { isDemo } from "@/lib/config";
import { rememberDemoAccount } from "@/lib/demo-accounts";

const emailSchema = z.string().trim().toLowerCase().email();
const nameSchema = z.string().trim().min(1).max(100);

export async function signUp(formData: FormData) {
  const name = nameSchema.safeParse(formData.get("name"));
  const email = emailSchema.safeParse(formData.get("email"));
  if (!name.success || !email.success) {
    redirect(`/sign-up?error=${encodeURIComponent("Please enter your name and a valid email address.")}`);
  }

  let user = await db.user.findUnique({ where: { email: email.data } });
  let created = false;
  if (!user) {
    try {
      user = await db.user.create({ data: { name: name.data, email: email.data } });
      created = true;
      await track("signed-up", user.id, {});
    } catch (err) {
      // P2002: a simultaneous sign-up with the same email got there first.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      user = await db.user.findUniqueOrThrow({ where: { email: email.data } });
    }
  }
  // Existing account: just send a log-in link, so we don't reveal who has signed up.
  await sendLoginLink(user);
  // Only new accounts: typing someone else's email must not reveal their log-in link.
  if (created && isDemo()) await rememberDemoAccount(user.id);
  redirect("/check-email");
}

export async function logIn(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) {
    redirect(`/log-in?error=${encodeURIComponent("Please enter a valid email address.")}`);
  }

  const user = await db.user.findUnique({ where: { email: email.data } });
  // Same response whether or not the account exists.
  if (user) await sendLoginLink(user);
  redirect("/check-email");
}
