import Link from "next/link";

type LegalMicroLinkProps = {
  href: string;
  children: React.ReactNode;
  subtle?: boolean;
  className?: string;
};

export default function LegalMicroLink({
  href,
  children,
  subtle = true,
  className = "",
}: LegalMicroLinkProps) {
  const styles = subtle
    ? "text-[9px] text-slate-500/40 hover:text-slate-500/70 dark:text-slate-400/35 dark:hover:text-slate-400/60"
    : "text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200";

  return (
    <Link href={href} className={`transition-colors ${styles} ${className}`}>
      {children}
    </Link>
  );
}
