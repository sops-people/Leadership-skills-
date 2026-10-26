import type { Metadata } from "next";
import { isDemo } from "@/lib/config";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leadership Skills",
  description: "Find your leadership blind spots and a learning path to close them.",
  // Keep the test site out of search engines.
  ...(isDemo() && { robots: { index: false, follow: false } }),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
