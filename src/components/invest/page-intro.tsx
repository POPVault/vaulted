import Link from "next/link";
import type { ReactNode } from "react";

type PageIntroProps = {
  title: string;
  children?: ReactNode;
  /** Shown above the title; defaults to a link back to the offering. */
  back?: { href: string; label: string } | null;
};

/** The heading block shared by the investor flow pages. */
export function PageIntro({ title, children, back = { href: "/invest", label: "Back to the offering" } }: PageIntroProps) {
  return (
    <div className="flex flex-col gap-4">
      {back ? (
        <Link href={back.href} className="self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {back.label}
        </Link>
      ) : null}
      <h1 className="text-4xl leading-tight md:text-6xl">{title}</h1>
      {children ? <div className="flex max-w-[40em] flex-col gap-3 text-muted-foreground">{children}</div> : null}
    </div>
  );
}
