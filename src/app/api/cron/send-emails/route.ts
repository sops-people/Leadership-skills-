import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { processDueEmails } from "@/lib/email/send";
import { AUTO_REMINDER, remindPending } from "@/lib/assessment/invites";

export const dynamic = "force-dynamic";

// Sends scheduled emails (360 reminders, 90-day re-assessment reminders).
// Call it every 15 minutes from the host's scheduler with
// "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  // Darko's automatic 360 reminders queue emails first; then everything due is sent.
  const reminded = await remindPending({ rules: AUTO_REMINDER });
  const attempted = await processDueEmails();
  return NextResponse.json({ reminded, attempted });
}

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
