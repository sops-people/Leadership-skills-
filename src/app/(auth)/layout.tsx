import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="text-sm font-semibold text-brand">
        Leadership Skills
      </Link>
      <div className="mt-6">{children}</div>
    </main>
  );
}
