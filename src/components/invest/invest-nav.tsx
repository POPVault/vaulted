"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/invest", label: "Offering" },
  { href: "/invest/holdings", label: "My holdings" },
] as const;

const linkClass =
  "text-sm font-medium text-foreground underline-offset-[6px] hover:underline aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:decoration-2";

export function InvestNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Investor" className="flex items-center gap-x-5 md:gap-x-8">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={linkClass}
        >
          {link.label}
        </Link>
      ))}
      {/* Plain anchor so the logout route is never prefetched. */}
      <a href="/invest/logout" className={linkClass}>
        Log out
      </a>
    </nav>
  );
}
