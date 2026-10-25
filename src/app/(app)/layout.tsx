import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <nav className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3 text-sm">
          <Link href="/home" className="font-semibold text-brand">
            Leadership Skills
          </Link>
          <Link href="/home" className="text-muted hover:text-ink">
            Home
          </Link>
          <Link href="/profile" className="text-muted hover:text-ink">
            Profile
          </Link>
          <span className="ml-auto text-muted">{user.name}</span>
          <form method="post" action="/auth/sign-out">
            <button type="submit" className="text-muted hover:text-ink">
              Log out
            </button>
          </form>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
    </div>
  );
}
