import type { Comp } from "@/db/schema";
import { EmptyState } from "@/components/invest/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

/** ISO dates are formatted; free text (including TBD) is shown as written. */
function compDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? formatDate(value) : value || "TBD";
}

export function CompsTable({ comps }: { comps: Comp[] }) {
  return (
    <div className="border-y border-line">
      <Table className="text-[15px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground">Sale</TableHead>
            <TableHead className="text-right text-muted-foreground">Price</TableHead>
            <TableHead className="text-muted-foreground">Source</TableHead>
            <TableHead className="text-right text-muted-foreground">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comps.length === 0 ? (
            <EmptyState
              colSpan={4}
              title="No comparable sales yet"
              description="Recent sales of similar items will be listed here."
            />
          ) : (
            comps.map((comp) => (
              <TableRow key={comp.id} className="hover:bg-transparent">
                <TableCell className="min-w-[14em] whitespace-normal">{comp.description}</TableCell>
                <TableCell className="tabular text-right">{comp.price || "TBD"}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{comp.source || "TBD"}</TableCell>
                <TableCell className="tabular text-right">{compDate(comp.date)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
