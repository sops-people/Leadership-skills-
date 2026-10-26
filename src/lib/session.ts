// Session cookie: a signed token holding the user id. No Node-only imports here,
// because middleware runs on the edge runtime.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEV_SECRET = "dev-only-secret-change-me-0123456789abcdef";

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to 32 or more characters");
    }
    return new TextEncoder().encode(DEV_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the user id, or null if the token is missing, tampered with or expired. */
export async function readSessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    // Demo-accounts tokens share the secret; they are not sessions.
    return typeof payload.sub === "string" && payload.sub !== "demo-accounts" ? payload.sub : null;
  } catch {
    return null;
  }
}

// Demo mode: a signed list of the accounts created in this browser. The public
// outbox shows only their emails, so visitors can't open each other's log-in links.
export const DEMO_ACCOUNTS_COOKIE = "demo_accounts";
const MAX_DEMO_ACCOUNTS = 20;

export async function createDemoAccountsToken(userIds: string[]): Promise<string> {
  return new SignJWT({ ids: userIds.slice(-MAX_DEMO_ACCOUNTS) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("demo-accounts")
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the account ids, or an empty list if the token is missing, tampered with or expired. */
export async function readDemoAccountsToken(token: string | undefined): Promise<string[]> {
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"], subject: "demo-accounts" });
    return Array.isArray(payload.ids) ? payload.ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
