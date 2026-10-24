import { Button, Card, Field, Input, Notice, PageHeader } from "@/components/ui";
import { RoleFields } from "@/components/role-fields";
import { requireUser } from "@/lib/current-user";
import { deleteMyAccount, updateProfile } from "@/app/actions/profile";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  // requireUser, not requireProfile: someone who never finished onboarding must
  // still be able to delete their account.
  const profile = await requireUser();
  const { error, saved } = await searchParams;
  return (
    <>
      <PageHeader title="Your profile" />
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Saved.</Notice>}

      <Card>
        <form action={updateProfile} className="space-y-6">
          <Field label="Name">
            <Input name="name" defaultValue={profile.name} required maxLength={100} />
          </Field>
          <Field label="Email" hint="You log in with this address.">
            <Input value={profile.email} readOnly disabled />
          </Field>
          <RoleFields currentRole={profile.currentRole} targetRole={profile.targetRole} />
          <Button type="submit">Save changes</Button>
        </form>
      </Card>

      <Card className="mt-8 border-danger/40">
        <h2 className="font-semibold text-ink">Delete your account</h2>
        <p className="mt-2 text-sm text-muted">
          This permanently deletes your profile, your ratings, your gap reports and your learning path. It can&apos;t be
          undone.
        </p>
        <form action={deleteMyAccount} className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" value="yes" required />
            I understand this deletes all my data
          </label>
          <Button type="submit" variant="danger">
            Delete my account
          </Button>
        </form>
      </Card>
    </>
  );
}
