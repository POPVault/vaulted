import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/invest/empty-state";
import { FieldError } from "@/components/invest/field-error";
import { FundingProgress } from "@/components/invest/funding-progress";
import { FunnelDots } from "@/components/invest/funnel-dots";
import { StatBlock } from "@/components/invest/stat-block";
import { PhaseBadge, StatusBadge } from "@/components/invest/status-badge";
import { findCurrentOffering } from "@/data/offerings";
import { requireInvestor } from "@/lib/session";

// Temporary. Replaced by the offering page in piece 6. Everything below the
// heading is a theme check with sample values only.
export default async function InvestPage() {
  const offering = await findCurrentOffering();
  if (!offering) {
    return (
      <div className="shell py-16 md:py-24">
        <h1 className="text-5xl leading-none md:text-7xl">No offering yet</h1>
      </div>
    );
  }
  await requireInvestor(offering.id);

  return (
    <div className="shell flex flex-col gap-16 py-16 md:py-24">
      <section className="flex flex-col gap-4">
        <h1 className="text-5xl leading-none md:text-7xl">{offering.name}</h1>
        <div className="flex flex-wrap gap-2">
          <PhaseBadge phase={offering.phase} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <p className="eyebrow">Theme check (sample values)</p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="none" />
          <StatusBadge status="requested" />
          <StatusBadge status="funded" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Price per unit" value="$100" caption="Class A units" />
        <StatBlock label="Units offered" value="TBD" caption="Sample caption" />
        <StatBlock label="Hold period" value="TBD" />
        <StatBlock label="Sample figure" value="1,234,567" caption="Tabular figures" />
      </section>

      <section className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <FundingProgress taken={1240} total={5000} />
        <FundingProgress taken={0} total={null} />
      </section>

      <section className="flex flex-col gap-6 md:max-w-md">
        <div>
          <Label htmlFor="sample">Sample field</Label>
          <Input id="sample" className="mt-2" aria-invalid aria-describedby="sample-error" />
          <FieldError id="sample-error" errors={["Enter a whole number of units."]} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button>Primary action</Button>
          <Button variant="outline">Secondary</Button>
          <Button disabled>Disabled</Button>
        </div>
        <FunnelDots
          label="Sample funnel"
          steps={[
            { label: "Step one", done: true },
            { label: "Step two", done: true },
            { label: "Step three", done: false },
            { label: "Step four", done: false },
            { label: "Step five", done: false },
          ]}
        />
      </section>

      <section className="border border-line bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <EmptyState colSpan={3} title="Nothing here yet" description="Rows appear here once they exist." />
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
