import type { FaqEntry } from "@/db/types";

/** Native details and summary, styled like the public site's FAQ. */
export function Faq({ entries, contactEmail }: { entries: FaqEntry[]; contactEmail: string }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="border-b border-line">
        {entries.map((entry) => (
          <details key={entry.q} className="group border-t border-line">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-6 [&::-webkit-details-marker]:hidden">
              <span className="font-serif text-[26px] leading-[1.2] font-medium">{entry.q}</span>
              <span aria-hidden="true" className="flex-none font-serif text-[26px] leading-[1.2] text-accent">
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">{"−"}</span>
              </span>
            </summary>
            <p className="max-w-[36em] pb-6">{entry.a}</p>
          </details>
        ))}
      </div>
      {contactEmail ? (
        <p className="max-w-[36em]">
          Have a question that is not answered here? Email{" "}
          <a href={`mailto:${contactEmail}`} className="font-medium text-primary underline">
            {contactEmail}
          </a>{" "}
          and we will answer before you decide.
        </p>
      ) : null}
    </div>
  );
}
