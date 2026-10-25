import { NextResponse, type NextRequest } from "next/server";
import { consumeLoginToken } from "@/lib/auth";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { sameOrigin } from "@/lib/same-origin";

// The "Log in" button on /auth/verify posts here. A route handler (not a server
// action) sets the session cookie on its own response, which works with or without
// JavaScript in the browser.
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });

  const token = (await request.formData()).get("token");
  const userId = typeof token === "string" && token ? await consumeLoginToken(token) : null;
  if (!userId) {
    const url = new URL("/log-in", request.url);
    url.searchParams.set("error", "That link has expired or was already used. Please ask for a new one.");
    return NextResponse.redirect(url, 303);
  }

  // /home sends users who haven't finished onboarding on to /onboarding.
  const response = NextResponse.redirect(new URL("/home", request.url), 303);
  response.cookies.set(SESSION_COOKIE, await createSessionToken(userId), sessionCookieOptions);
  return response;
}
