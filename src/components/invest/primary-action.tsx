import Link from "next/link";
import type { Phase } from "@/db/schema";
import { Button } from "@/components/ui/button";

type PrimaryActionProps = {
  phase: Phase;
  /** True when the latest acknowledgment matches the current documents. */
  acknowledged: boolean;
};

/** The one next step for the investor, by offering phase. */
export function PrimaryAction({ phase, acknowledged }: PrimaryActionProps) {
  if (phase === "preview") {
    return (
      <Action help="The offering is not open yet. Let us know how many units you might want.">
        <Button asChild size="lg">
          <Link href="/invest/interested">Register interest</Link>
        </Button>
      </Action>
    );
  }

  if (phase === "closed") {
    return (
      <Action help="This offering is no longer taking new investments.">
        <Button size="lg" disabled>
          Offering closed
        </Button>
      </Action>
    );
  }

  if (!acknowledged) {
    return (
      <Action help="Confirm you have read the documents to continue." helpId="invest-help">
        <Button size="lg" disabled aria-describedby="invest-help">
          Invest
        </Button>
      </Action>
    );
  }

  return (
    <Action help="Choose how many units to buy and complete a short questionnaire.">
      <Button asChild size="lg">
        <Link href="/invest/subscribe">Invest</Link>
      </Button>
    </Action>
  );
}

function Action({ help, helpId, children }: { help: string; helpId?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
      {children}
      <p id={helpId} className="max-w-[28em] text-[15px] text-muted-foreground">
        {help}
      </p>
    </div>
  );
}
