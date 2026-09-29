import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/invest/empty-state";
import { PageIntro } from "@/components/invest/page-intro";
import { StatBlock } from "@/components/invest/stat-block";
import { StatusBadge, statusLabel } from "@/components/invest/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { latestAcknowledgment } from "@/data/acknowledgments";
import { listDocuments } from "@/data/documents";
import { getInterest } from "@/data/interests";
import { findCurrentOffering } from "@/data/offerings";
import { getQuestionnaire } from "@/data/questionnaires";
import { getSubscription, holdingsStatus } from "@/data/subscriptions";
import { listUpdates } from "@/data/updates";
import { formatDate, formatMoney, formatUnits } from "@/lib/format";
import { requireInvestor } from "@/lib/session";
import { statusLabelFor } from "@/lib/validation/questionnaire";

type RecordRow = { key: string; label: string; at: string; detail: ReactNode };

/** Document versions from an acknowledgment's stored manifest, titled where we can. */
function acknowledgedVersions(documentsJson: string, titles: Map<string, string>): string[] {
  try {
    const entries = JSON.parse(documentsJson) as { filePath?: string; version?: string }[];
    return entries.map((e) => `${titles.get(e.filePath ?? "") ?? e.filePath ?? "Document"}, version ${e.version ?? "unknown"}`);
  } catch {
    return [];
  }
}

export default async function HoldingsPage() {
  const offering = await findCurrentOffering();
  if (!offering) redirect("/invest/enter");
  const investor = await requireInvestor(offering.id);

  const [interest, questionnaire, acknowledgment, subscription, documents, updates] = await Promise.all([
    getInterest(investor.id, offering.id),
    getQuestionnaire(investor.id, offering.id),
    latestAcknowledgment(investor.id, offering.id),
    getSubscription(investor.id, offering.id),
    listDocuments(offering.id),
    listUpdates(offering.id),
  ]);

  const status = holdingsStatus(subscription, interest);
  const live = subscription && subscription.cancelledAt === null ? subscription : null;
  const units = live?.units ?? interest?.units ?? null;
  const tentative = !live && interest !== null;
  const amountCents = live ? live.amountCents : units !== null ? units * offering.pricePerUnitCents : null;

  const titles = new Map(documents.map((d) => [d.filePath, d.title]));
  const records: RecordRow[] = [];
  if (interest) {
    records.push({
      key: "interest",
      label: "Interest registered",
      at: interest.updatedAt,
      detail: `${formatUnits(interest.units)} ${interest.units === 1 ? "unit" : "units"}, not binding`,
    });
  }
  if (questionnaire) {
    records.push({
      key: "questionnaire",
      label: "Questionnaire signed",
      at: questionnaire.createdAt,
      detail: statusLabelFor(questionnaire.investorStatus),
    });
  }
  if (acknowledgment) {
    const versions = acknowledgedVersions(acknowledgment.documentsJson, titles);
    records.push({
      key: "acknowledgment",
      label: "Documents acknowledged",
      at: acknowledgment.createdAt,
      detail: versions.length ? (
        <ul className="flex flex-col gap-1">
          {versions.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      ) : (
        "Offering documents"
      ),
    });
  }
  if (subscription) {
    const subDetail = `${formatUnits(subscription.units)} units, ${formatMoney(subscription.amountCents)}`;
    records.push({ key: "requested", label: "Subscription requested", at: subscription.createdAt, detail: subDetail });
    const steps = [
      { key: "accepted", at: subscription.acceptedAt, label: "Accepted by Vaulted" },
      { key: "signed", at: subscription.signedAt, label: "Agreement signed" },
      { key: "funded", at: subscription.fundedAt, label: "Wire received" },
      { key: "cancelled", at: subscription.cancelledAt, label: "Subscription cancelled" },
    ] as const;
    for (const step of steps) {
      if (step.at) records.push({ key: step.key, label: step.label, at: step.at, detail: subDetail });
    }
  }

  return (
    <div className="shell flex flex-col gap-14 py-12 md:gap-20 md:py-20">
      <PageIntro title="My holdings">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          <span className="text-[15px]">{offering.name}</span>
        </div>
      </PageIntro>

      <section aria-label="Summary" className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <StatBlock
          label="Units"
          value={units === null ? "None" : formatUnits(units)}
          caption={tentative ? "Tentative. Registered interest, not a commitment." : live ? statusLabel(status) : undefined}
        />
        <StatBlock
          label="Total"
          value={amountCents === null ? "None" : formatMoney(amountCents)}
          caption={`${formatMoney(offering.pricePerUnitCents)} per unit`}
        />
        {live ? (
          <StatBlock
            label="Wire reference"
            value={<span className="break-all">{live.wireReference}</span>}
            caption={
              <Link href="/invest/subscribe" className="underline">
                Wire details and next steps
              </Link>
            }
          />
        ) : null}
      </section>

      <section aria-labelledby="record-heading" className="flex flex-col gap-6">
        <h2 id="record-heading" className="text-3xl md:text-4xl">
          Your record
        </h2>
        <div className="border border-line bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4 md:pl-6">Step</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="pr-4 md:pr-6">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <EmptyState
                  colSpan={3}
                  title="Nothing recorded yet"
                  description="Each step you take on this offering is listed here with its date."
                />
              ) : (
                records.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="pl-4 align-top whitespace-normal md:pl-6">{r.label}</TableCell>
                    <TableCell className="align-top">
                      <time dateTime={r.at}>{formatDate(r.at)}</time>
                    </TableCell>
                    <TableCell className="pr-4 align-top whitespace-normal text-muted-foreground md:pr-6">{r.detail}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="updates-heading" className="flex flex-col gap-6">
        <h2 id="updates-heading" className="text-3xl md:text-4xl">
          Updates
        </h2>
        {updates.length === 0 ? (
          <div className="border border-line bg-card">
            <EmptyState title="No updates yet" description="News about the collection and the offering will appear here." />
          </div>
        ) : (
          <ol className="flex flex-col">
            {updates.map((u) => (
              <li key={u.id} className="grid gap-2 border-t border-line py-6 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
                <time dateTime={u.date} className="tabular text-sm text-muted-foreground">
                  {formatDate(u.date)}
                </time>
                <div className="flex max-w-[40em] flex-col gap-2">
                  <h3 className="text-2xl">{u.title}</h3>
                  <p className="text-[15px] whitespace-pre-line">{u.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div>
        <Button asChild variant="outline">
          <Link href="/invest">View the offering</Link>
        </Button>
      </div>
    </div>
  );
}
