import { Progress } from "@/components/ui/progress";

type FundingProgressProps = {
  taken: number;
  /** Total units offered to investors; null while the raise size is TBD. */
  total: number | null;
};

const units = new Intl.NumberFormat("en-US");

export function FundingProgress({ taken, total }: FundingProgressProps) {
  const percent = total && total > 0 ? Math.min(100, (taken / total) * 100) : 0;
  const caption = `${units.format(taken)} of ${total === null ? "TBD" : units.format(total)} units taken`;

  return (
    <div className="flex flex-col gap-3">
      <Progress value={percent} aria-label="Units taken" aria-valuetext={caption} />
      <p className="tabular text-[13px] text-muted-foreground">{caption}</p>
    </div>
  );
}
