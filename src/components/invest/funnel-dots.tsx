import { cn } from "@/lib/utils";

export type FunnelStep = { label: string; done: boolean };

type FunnelDotsProps = {
  /** Five steps in order. Labels are read by screen readers only. */
  steps: FunnelStep[];
  label?: string;
};

export function FunnelDots({ steps, label = "Progress" }: FunnelDotsProps) {
  return (
    <ol aria-label={label} className="flex items-center gap-1.5">
      {steps.map((step) => (
        <li key={step.label}>
          <span
            aria-hidden="true"
            className={cn("block size-2.5 rounded-full border border-accent", step.done && "bg-accent")}
          />
          <span className="sr-only">
            {step.label}: {step.done ? "done" : "not yet"}
          </span>
        </li>
      ))}
    </ol>
  );
}
