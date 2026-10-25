import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { showsOutbox } from "@/lib/config";
import { renderEmail } from "@/lib/email/templates";
import type { EmailTemplate } from "@/shared/formats";

export const dynamic = "force-dynamic";

// Local development only: shows emails the app would have sent.
export default async function OutboxPage() {
  if (!showsOutbox()) notFound();

  const emails = await db.emailRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Dev outbox" intro="The last 50 emails. Nothing here was actually sent." />
      <div className="space-y-4">
        {emails.length === 0 && <p className="text-muted">No emails yet.</p>}
        {emails.map((email) => {
          const links = JSON.parse(email.links) as string[];
          let subject = "(could not render)";
          let body = email.error ?? "";
          try {
            const rendered = renderEmail(
              email.template as EmailTemplate,
              JSON.parse(email.variables) as Record<string, string>,
              links,
            );
            subject = rendered.subject;
            body = rendered.text;
          } catch {
            // Purged or invalid emails can't be rendered; show what we have.
          }
          return (
            <Card key={email.id}>
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
                <span>
                  To {email.recipient} · {email.template} · {email.status}
                </span>
                <span>{email.createdAt.toISOString()}</span>
              </div>
              <h2 className="mt-2 font-semibold">{subject}</h2>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted">{body}</pre>
              {links[0] && (
                <a href={links[0]} className="mt-2 inline-block text-sm font-semibold text-brand">
                  Open link
                </a>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
