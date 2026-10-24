import { Button, Card, Field, Input, Notice, PageHeader, Select } from "@/components/ui";
import { requireProfile } from "@/lib/current-user";
import { db } from "@/lib/db";
import { latestRound } from "@/lib/assessment/data";
import { MIN_RATERS } from "@/lib/assessment/scoring";
import { RELATIONSHIPS, relationshipName } from "@/lib/assessment/invites";
import { addInvite, remindNow } from "@/app/actions/assessment";

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; n?: string; error?: string }>;
}) {
  const profile = await requireProfile();
  const { msg, n, error } = await searchParams;
  const round = await latestRound(profile.userId);
  const invites = round
    ? await db.raterInvite.findMany({ where: { roundId: round.id }, orderBy: { createdAt: "asc" } })
    : [];
  const done = invites.filter((i) => i.completedAt).length;
  const needed = Math.max(MIN_RATERS - done, 0);
  const notice =
    msg === "sent"
      ? "Invite sent."
      : msg === "reminded"
        ? `Reminder sent to ${n} people.`
        : msg === "none"
          ? "Everyone who hasn’t responded was reminded in the last 24 hours. Try again tomorrow."
          : undefined;

  return (
    <>
      <PageHeader
        title="Invite people to rate you"
        intro={`Pick people who see your work regularly: your manager, peers and direct reports. Each person gets a private link. You never see individual answers; averages appear in your report once at least ${MIN_RATERS} people have responded.`}
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <Card className="mb-6">
        <p className="text-lg">
          <strong>{done}</strong> of {invites.length} responded
        </p>
        <p className="mt-1 text-sm text-muted">
          {needed
            ? `${needed} more response${needed > 1 ? "s" : ""} needed before 360 results appear.`
            : "360 results are visible in your gap report."}
        </p>
        {invites.length > done && (
          <form action={remindNow} className="mt-4">
            <Button type="submit" variant="secondary">
              Remind people who haven’t responded
            </Button>
          </form>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Add a rater</h2>
        <form action={addInvite} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="raterName" required />
            </Field>
            <Field label="Email">
              <Input name="raterEmail" type="email" required />
            </Field>
          </div>
          <Field label="How they work with you">
            <Select name="relationship" defaultValue="peer">
              {RELATIONSHIPS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Send invite</Button>
        </form>
      </Card>

      {invites.length > 0 && (
        <section>
          <h2 className="font-semibold">Invited</h2>
          <p className="text-sm text-muted">To protect anonymity, this list does not show who has responded.</p>
          <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-surface">
            {invites.map((i) => (
              <li key={i.token} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span>{i.raterName}</span>
                <span className="text-muted">
                  {relationshipName(i.relationship)} · {i.raterEmail}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
