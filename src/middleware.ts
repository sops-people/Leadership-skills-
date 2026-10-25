import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

const SIGNED_IN_PATHS = ["/home", "/onboarding", "/profile", "/assessment", "/gap-report", "/learning-path"];

// 1. Demo mode: one shared password in front of the whole app, because log-in links
//    are shown on screen instead of emailed. The cron route has its own secret.
// 2. Fast check at the edge: no valid session cookie means no signed-in pages.
//    Pages still look the user up (requireUser), which catches deleted accounts.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const demoPassword = process.env.DEMO_PASSWORD;
  if (demoPassword && !pathname.startsWith("/api/cron/") && !hasDemoPassword(request, demoPassword)) {
    return new NextResponse("Password required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Leadership Skills demo"' },
    });
  }

  if (!SIGNED_IN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  const userId = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (userId) return NextResponse.next();
  return NextResponse.redirect(new URL("/log-in", request.url));
}

/** Browser password prompt (HTTP Basic auth). Any user name; the password must match. */
function hasDemoPassword(request: NextRequest, expected: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice("Basic ".length));
    return decoded.slice(decoded.indexOf(":") + 1) === expected;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
