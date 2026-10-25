// Delivers a rendered email. Uses Resend when RESEND_API_KEY is set; otherwise
// logs it, and the email stays visible at /dev/outbox.
import { isDemo } from "../config";
import type { RenderedEmail } from "./templates";

export type DeliveryResult = { ok: true } | { ok: false; error: string };

export async function deliver(to: string, email: RenderedEmail): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Never log email bodies (they can hold log-in links) outside local dev.
    if (process.env.NODE_ENV === "production" && !isDemo()) return { ok: false, error: "RESEND_API_KEY is not set" };
    console.info(`[email:dev] to=${to} subject="${email.subject}"\n${email.text}`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Leadership App <noreply@example.com>",
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
