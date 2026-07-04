import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy practices for atlas of my skies.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-10 pb-16 text-slate-800 dark:text-slate-200">
      <Link
        href="/"
        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-8 inline-block"
      >
        ← home
      </Link>

      <header className="mb-6">
        <h1 className="text-xl font-serif font-bold">Privacy</h1>
        <p className="text-xs text-slate-500 mt-1">Last updated: July 4, 2026</p>
      </header>

      <article className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        <p>
          atlas of my skies is a static photography portfolio. Photos, titles, dates,
          and optional location metadata are served from this site. There are no user
          accounts or comment forms.
        </p>
        <p>
          If analytics are enabled (e.g. Vercel Analytics), anonymous page views may be
          collected to understand traffic. Hosting providers may log IP addresses and
          request metadata for delivery and security.
        </p>
        <p>
          Map thumbnails may be generated via a server route using coordinates from
          photo metadata; no personal identity is sent with those requests.
        </p>
        <p>We do not sell visitor data.</p>
      </article>
    </main>
  );
}
