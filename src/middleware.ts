import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

// Fast check at the edge: no valid session cookie means no app pages.
// Pages still look the user up (requireUser), which catches deleted accounts.
export async function middleware(request: NextRequest) {
  const userId = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (userId) return NextResponse.next();
  return NextResponse.redirect(new URL("/log-in", request.url));
}

export const config = {
  matcher: [
    "/home",
    "/onboarding",
    "/profile",
    "/assessment/:path*",
    "/gap-report/:path*",
    "/learning-path/:path*",
  ],
};
