import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type OfferingSectionProps = {
  id: string;
  title: string;
  intro?: ReactNode;
  /** split: heading left, content right from md up (the site's Template B). stacked: heading above content. */
  layout?: "split" | "stacked";
  className?: string;
  children: ReactNode;
};

/** One section of the offering page, using the public site's section patterns. */
export function OfferingSection({ id, title, intro, layout = "split", className, children }: OfferingSectionProps) {
  const headingId = `${id}-heading`;
  const split = layout === "split";

  return (
    <section id={id} aria-labelledby={headingId} className={cn("py-16 md:py-24", className)}>
      <div className={cn("shell grid grid-cols-1 gap-10", split && "md:grid-cols-12 md:gap-x-8")}>
        <header className={cn("flex flex-col gap-4", split && "md:sticky md:top-10 md:col-span-5 md:self-start")}>
          <h2 id={headingId} className="text-[clamp(36px,4.5vw,56px)] leading-[1.05]">
            {title}
          </h2>
          {intro ? <div className="max-w-[36em] text-muted-foreground">{intro}</div> : null}
        </header>
        <div className={cn("min-w-0", split && "md:col-span-7 md:col-start-6 lg:col-span-6 lg:col-start-7")}>{children}</div>
      </div>
    </section>
  );
}
