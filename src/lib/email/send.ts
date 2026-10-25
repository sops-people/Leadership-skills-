// The one way to send email in this app. Darko and Sops: call requestEmail()
// with the shared Email request format. Leave sendAt empty to send now, or set it
// to schedule a reminder; /api/cron/send-emails sends scheduled ones.
import type { EmailRequest } from "@prisma/client";
import { db } from "../db";
import { isDemo, isProduction } from "../config";
import { deliver } from "./provider";
import { missingVariables, renderEmail } from "./templates";
import { emailRequestInputSchema, type EmailRequestInput, type EmailTemplate } from "@/shared/formats";

export async function requestEmail(input: EmailRequestInput): Promise<EmailRequest> {
  const data = emailRequestInputSchema.parse(input);
  const missing = missingVariables(data.template, data.variables);
  if (missing.length) {
    throw new Error(`Email "${data.template}" is missing variables: ${missing.join(", ")}`);
  }

  const row = await db.emailRequest.create({
    data: {
      recipient: data.recipient,
      template: data.template,
      links: JSON.stringify(data.links),
      variables: JSON.stringify(data.variables),
      sendAt: data.sendAt ?? null,
      requestedBy: data.requestedBy,
      relatedId: data.relatedId ?? null,
      userId: data.userId ?? null,
    },
  });

  if (!data.sendAt || data.sendAt <= new Date()) return sendNow(row);
  return row;
}

const STALE_SENDING_MINUTES = 10;

/** Sends every queued email whose time has come. Returns how many were attempted. */
export async function processDueEmails(limit = 100): Promise<number> {
  // A crash mid-send leaves a row "sending"; put it back in the queue after a while.
  await db.emailRequest.updateMany({
    where: { status: "sending", claimedAt: { lt: new Date(Date.now() - STALE_SENDING_MINUTES * 60_000) } },
    data: { status: "queued" },
  });

  const due = await db.emailRequest.findMany({
    where: { status: "queued", OR: [{ sendAt: null }, { sendAt: { lte: new Date() } }] },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const row of due) await sendNow(row);
  return due.length;
}

/**
 * Privacy: removes recipient details (rater emails, personal links) for a group of
 * emails, e.g. when a 360 cycle closes. Darko calls this with the cycle id he passed
 * as relatedId. Queued emails in the group are cancelled.
 */
export async function purgeRecipientData(relatedId: string): Promise<number> {
  const { count } = await db.emailRequest.updateMany({
    where: { relatedId },
    data: { recipient: "[removed]", links: "[]", variables: "{}" },
  });
  await db.emailRequest.updateMany({
    where: { relatedId, status: "queued" },
    data: { status: "failed", error: "Cancelled: recipient data removed" },
  });
  return count;
}

async function sendNow(row: EmailRequest): Promise<EmailRequest> {
  // Claim the row first, so two overlapping runs never send the same email twice.
  const { count } = await db.emailRequest.updateMany({
    where: { id: row.id, status: "queued" },
    data: { status: "sending", claimedAt: new Date() },
  });
  if (count !== 1) return (await db.emailRequest.findUnique({ where: { id: row.id } })) ?? row;

  let result: Awaited<ReturnType<typeof deliver>>;
  try {
    const email = renderEmail(
      row.template as EmailTemplate,
      JSON.parse(row.variables) as Record<string, string>,
      JSON.parse(row.links) as string[],
    );
    result = await deliver(row.recipient, email);
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // A stored log-in link would let anyone with database access log in, which defeats
  // hashing the token. Drop it once used, except where /dev/outbox needs it (local dev, demo mode).
  const scrub = row.template === "login-link" && (!!process.env.RESEND_API_KEY || (isProduction() && !isDemo()));
  const scrubbed = scrub ? { links: "[]" } : {};

  return db.emailRequest.update({
    where: { id: row.id },
    data: result.ok
      ? { status: "sent", sentAt: new Date(), error: null, ...scrubbed }
      : { status: "failed", error: result.error, ...scrubbed },
  });
}
