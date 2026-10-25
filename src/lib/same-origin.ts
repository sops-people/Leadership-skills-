import type { NextRequest } from "next/server";

/**
 * Blocks cross-site form posts (e.g. another site logging someone into an account
 * it controls). Browsers send Origin on form posts; a request without one is allowed,
 * since it can't come from another site's page.
 */
export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
