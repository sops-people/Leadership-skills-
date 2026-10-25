import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { LOGIN_LINK_MINUTES } from "@/lib/auth";
import { showsOutbox } from "@/lib/config";

// Rendered per request: whether the outbox link shows depends on runtime settings (demo mode).
export const dynamic = "force-dynamic";

export default function CheckEmailPage() {
  return (
    <>
      <PageHeader title="Check your email" />
      <Card>
        <p>
          If that address has an account, a log-in link is on its way. It works once and expires in{" "}
          {LOGIN_LINK_MINUTES} minutes.
        </p>
        {showsOutbox() && (
          <p className="mt-4 text-sm text-muted">
            Emails aren&apos;t sent in this version. Open the{" "}
            <Link href="/dev/outbox" className="font-semibold text-brand">
              dev outbox
            </Link>{" "}
            to click the link.
          </p>
        )}
      </Card>
    </>
  );
}
