// Passwordless log-in: we email a one-time link, store only its hash, and
// accept it once within LOGIN_LINK_MINUTES.
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { appUrl } from "./config";
import { requestEmail } from "./email/send";

export const LOGIN_LINK_MINUTES = 15;

export function newLoginToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendLoginLink(user: { id: string; name: string; email: string }) {
  const token = newLoginToken();
  await db.loginToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + LOGIN_LINK_MINUTES * 60_000),
    },
  });
  await requestEmail({
    recipient: user.email,
    template: "login-link",
    links: [`${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`],
    variables: { name: user.name },
    requestedBy: "platform",
    userId: user.id,
  });
}

/** Marks the token used and returns its user id, or null if it is unknown, used or expired. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  // Single conditional update, so the same link can't be used twice at once.
  const { count } = await db.loginToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count !== 1) return null;
  const row = await db.loginToken.findUnique({ where: { tokenHash } });
  return row?.userId ?? null;
}
