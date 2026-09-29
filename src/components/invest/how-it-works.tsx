import type { HowItWorksStep } from "@/db/types";

/** Numbered steps in the public site's card style: hairline rule, number, serif title, muted text. */
export function HowItWorks({ steps }: { steps: HowItWorksStep[] }) {
  return (
    <ol className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex flex-col gap-2 border-t border-line pt-6">
          <p className="tabular eyebrow" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="text-[26px] leading-[1.2] font-medium">{step.title}</h3>
          <p className="text-muted-foreground">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
