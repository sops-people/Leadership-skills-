import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { LOGIN_LINK_MINUTES } from "@/lib/auth";
import { isProduction } from "@/lib/config";

export default function CheckEmailPage() {
  return (
    <>
      <PageHeader title="Check your email" />
      <Card>
        <p>
          If that address has an account, a log-in link is on its way. It works once and expires in{" "}
          {LOGIN_LINK_MINUTES} minutes.
        </p>
        {!isProduction() && (
          <p className="mt-4 text-sm text-muted">
            Running locally? Emails aren&apos;t sent. Open the{" "}
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
