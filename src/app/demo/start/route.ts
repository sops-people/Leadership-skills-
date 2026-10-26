import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isDemo } from "@/lib/config";
import { track } from "@/lib/metrics/track";
import { sameOrigin } from "@/lib/same-origin";
import {
  DEMO_ACCOUNTS_COOKIE,
  SESSION_COOKIE,
  createDemoAccountsToken,
  createSessionToken,
  readDemoAccountsToken,
  sessionCookieOptions,
} from "@/lib/session";

// Demo mode: the "Try it now" button posts here. Creates a guest account and logs
// this browser straight in, skipping the email step. A route handler sets both
// cookies on its own response (see /auth/confirm).
export async function POST(request: NextRequest) {
  if (!isDemo()) return new NextResponse("Not found", { status: 404 });
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });

  const user = await db.user.create({ data: { name: "Guest", email: `guest-${randomUUID()}@example.invalid` } });
  await track("signed-up", user.id, {});

  const ids = await readDemoAccountsToken(request.cookies.get(DEMO_ACCOUNTS_COOKIE)?.value);
  const response = NextResponse.redirect(new URL("/onboarding", request.url), 303);
  response.cookies.set(SESSION_COOKIE, await createSessionToken(user.id), sessionCookieOptions);
  response.cookies.set(DEMO_ACCOUNTS_COOKIE, await createDemoAccountsToken([...ids, user.id]), sessionCookieOptions);
  return response;
}
