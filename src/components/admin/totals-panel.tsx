import { EmptyState } from "@/components/invest/empty-state";
import { StatBlock } from "@/components/invest/stat-block";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OfferingTotals } from "@/data/admin";
import { formatMoney, formatUnits } from "@/lib/format";

export function TotalsPanel({ totals }: { totals: OfferingTotals }) {
  const atCap = totals.sophisticatedAccepted >= totals.sophisticatedCap;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Units sold" value={formatUnits(totals.unitsSold)} caption="Live subscriptions, not cancelled" />
        <StatBlock
          label="Units remaining"
          value={formatUnits(totals.unitsRemaining)}
          caption={totals.unitsRemaining === null ? "Units offered is not set yet" : "Still available to investors"}
        />
        <StatBlock
          label="To the partner if closed now"
          value={formatUnits(totals.unitsToPartner)}
          caption="Unsold units stay with the partner"
        />
        <StatBlock
          label="Non-accredited accepted"
          value={
            <>
              {formatUnits(totals.sophisticatedAccepted)}
              <span className="text-2xl text-muted-foreground md:text-3xl"> of {totals.sophisticatedCap} max</span>
            </>
          }
          caption="Sophisticated investors with an accepted subscription"
        />
        <StatBlock label="Committed" value={formatMoney(totals.dollarsCommittedCents)} caption="Live subscriptions" />
        <StatBlock label="Received" value={formatMoney(totals.dollarsReceivedCents)} caption="Marked funded" />
        <StatBlock
          label="Interest"
          value={formatUnits(totals.interestCount)}
          caption={`${formatUnits(totals.interestUnits)} units registered, tentative`}
        />
      </div>

      {atCap ? (
        <Alert variant="destructive" className="border-destructive px-4 py-3">
          <AlertTitle>The non-accredited limit is reached</AlertTitle>
          <AlertDescription>
            {totals.sophisticatedAccepted} of {totals.sophisticatedCap} non-accredited investors are accepted. No more
            sophisticated investors can be accepted in this offering.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 md:max-w-md">
        <h3 className="font-sans text-sm font-medium">Investors by state</h3>
        <p className="text-[13px] text-muted-foreground">From questionnaires of investors with a live subscription. Used for state notice filings.</p>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>State</TableHead>
              <TableHead className="text-right">Investors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totals.investorsByState.length === 0 ? (
              <EmptyState colSpan={2} title="No subscriptions yet" description="States appear here once investors subscribe." />
            ) : (
              totals.investorsByState.map((row) => (
                <TableRow key={row.state}>
                  <TableCell>{row.state}</TableCell>
                  <TableCell className="text-right">{formatUnits(row.count)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
