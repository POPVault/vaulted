import type { WireInstructions } from "@/db/types";
import { formatMoney } from "@/lib/format";

type WireCardProps = {
  wireReference: string;
  amountCents: number;
  instructions: WireInstructions | null;
};

/** Bank details for the investor's wire, with their reference set large. */
export function WireCard({ wireReference, amountCents, instructions }: WireCardProps) {
  const rows: { label: string; value: string }[] = instructions
    ? [
        { label: "Bank", value: instructions.bank_name },
        { label: "Account name", value: instructions.account_name },
        { label: "Account number", value: instructions.account_number },
        { label: "Routing number", value: instructions.routing_number },
      ]
    : [];

  return (
    <section aria-labelledby="wire-heading" className="self-start border border-line bg-card">
      <div className="flex flex-col gap-2 bg-green px-6 py-8 text-cream md:px-10">
        <h2 id="wire-heading" className="font-sans text-sm font-medium text-cream/80">
          Your wire reference
        </h2>
        <p className="tabular font-serif text-5xl leading-none tracking-wide break-all md:text-6xl">{wireReference}</p>
        <p className="text-[15px] text-cream/80">Put this in the memo or reference field so we can match your wire.</p>
      </div>
      <dl className="tabular divide-y divide-line px-6 md:px-10">
        <div className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
          <dt className="text-sm text-muted-foreground">Amount</dt>
          <dd className="font-medium">{formatMoney(amountCents)}</dd>
        </div>
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="font-medium break-words">{row.value}</dd>
          </div>
        ))}
        {instructions?.instructions ? (
          <div className="py-4">
            <p className="text-[15px]">{instructions.instructions}</p>
          </div>
        ) : null}
        {!instructions ? (
          <div className="py-4">
            <p className="text-[15px]">We will email you the bank details for your wire.</p>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
