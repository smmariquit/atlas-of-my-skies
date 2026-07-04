import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using atlas of my skies.",
};

export default function TermsPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-10 pb-16 text-slate-800 dark:text-slate-200">
      <Link
        href="/"
        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-8 inline-block"
      >
        ← home
      </Link>

      <header className="mb-6">
        <h1 className="text-xl font-serif font-bold">Terms</h1>
        <p className="text-xs text-slate-500 mt-1">Last updated: July 4, 2026</p>
      </header>

      <article className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        <p>
          By viewing this site, you agree to use it for personal, non-commercial
          browsing. Photographs and text are © the site author unless otherwise noted.
        </p>
        <p>
          Do not scrape, hotlink, or redistribute images at scale without permission.
          The site is provided &quot;as is&quot; without warranties.
        </p>
        <p>Content and availability may change without notice.</p>
      </article>
    </main>
  );
}
