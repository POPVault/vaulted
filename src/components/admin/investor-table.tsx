import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/invest/empty-state";
import { FunnelDots } from "@/components/invest/funnel-dots";
import { StatusBadge, statusLabel } from "@/components/invest/status-badge";
import type { InvestorFunnelRow } from "@/data/investors";
import { holdingsStatus, statusFromTimestamps } from "@/data/subscriptions";
import type { StatusAction, Subscription } from "@/db/schema";
import { formatDate, formatMoney, formatUnits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CopyLinkButton } from "./copy-link-button";
import { RowActions } from "./row-actions";

const COLUMNS = 8;

/** Only the transitions the current state allows (PLAN.md section 5). */
function nextActions(sub: Subscription | null): StatusAction[] {
  if (!sub) return [];
  if (sub.cancelledAt) return ["uncancel"];
  switch (statusFromTimestamps(sub)) {
    case "requested":
      return ["set_accepted", "cancel"];
    case "accepted":
      return ["set_signed", "clear_accepted", "cancel"];
    case "signed":
      return ["set_funded", "clear_signed", "cancel"];
    case "funded":
      return ["clear_funded", "cancel"];
  }
}

/** "29 Sep 2026, 14:05 UTC" for stored ISO timestamps. */
function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return `${formatDate(date)}, ${date.toISOString().slice(11, 16)} UTC`;
}

type ManifestEntry = { filePath: string; version: string; date: string };

function parseManifest(json: string): ManifestEntry[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? (value as ManifestEntry[]) : [];
  } catch {
    return [];
  }
}

type InvestorTableProps = { rows: InvestorFunnelRow[]; origin: string };

export function InvestorTable({ rows, origin }: InvestorTableProps) {
  // The table is wider than a phone; an empty one would push its message off screen.
  if (rows.length === 0) {
    return <EmptyState title="No investors yet" description="Add someone above to create their personal link." />;
  }

  return (
    <Table className="min-w-[1180px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Investor</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Personal link</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead className="text-right">Units</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <InvestorRows key={row.investor.id} row={row} origin={origin} />
        ))}
      </TableBody>
    </Table>
  );
}

function InvestorRows({ row, origin }: { row: InvestorFunnelRow; origin: string }) {
  const { investor, subscription: sub, interest } = row;
  const revoked = investor.revokedAt !== null;
  const link = `${origin}/invest/i/${investor.inviteToken}`;
  const cancelled = sub?.cancelledAt != null;

  const steps = [
    { label: "Invited", done: true },
    { label: "Viewed", done: row.viewed },
    { label: "Acknowledged documents", done: row.latestAcknowledgment !== null },
    { label: "Questionnaire", done: row.questionnaire !== null },
    { label: "Interested", done: interest !== null },
    { label: "Subscribed", done: sub !== null && !cancelled },
  ];

  const tentative = !sub && interest !== null;
  const units = sub ? sub.units : (interest?.units ?? null);
  const amount = sub ? sub.amountCents : null;

  return (
    <>
      <TableRow className={cn("border-b-0 align-top hover:bg-transparent", revoked && "text-muted-foreground")}>
        <TableCell className="max-w-[18rem] py-4 align-top whitespace-normal">
          <p className="font-medium">{investor.name}</p>
          <p className="break-all text-[13px] text-muted-foreground">{investor.email}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">{investor.relationshipNote}</p>
        </TableCell>
        <TableCell className="py-4 align-top font-mono text-[13px]">{investor.code}</TableCell>
        <TableCell className="py-4 align-top">
          {revoked ? (
            <span className="text-[13px]">No link</span>
          ) : (
            <div className="flex w-[17rem] items-center gap-2">
              <Input
                readOnly
                value={link}
                aria-label={`Personal link for ${investor.name}`}
                className="h-8 min-w-0 flex-1 px-2 font-mono md:text-[12px]"
              />
              <CopyLinkButton value={link} label={`personal link for ${investor.name}`} />
            </div>
          )}
        </TableCell>
        <TableCell className="py-4 align-top">
          <FunnelDots steps={steps} label={`Progress for ${investor.name}`} />
        </TableCell>
        <TableCell className="py-4 text-right align-top">
          <span className={cn(cancelled && "line-through")}>{formatUnits(units ?? 0)}</span>
          {tentative ? <p className="text-[12px] text-muted-foreground">tentative</p> : null}
        </TableCell>
        <TableCell className="py-4 text-right align-top">
          {amount !== null ? (
            <span className={cn(cancelled && "line-through")}>{formatMoney(amount)}</span>
          ) : tentative ? (
            <span className="text-muted-foreground">Interest only</span>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </TableCell>
        <TableCell className="py-4 align-top">
          <div className="flex flex-col items-start gap-1.5">
            {sub && cancelled ? (
              <>
                <Badge variant="destructive">Cancelled</Badge>
                <span className="text-[12px] text-muted-foreground">
                  Restores to {statusLabel(statusFromTimestamps(sub)).toLowerCase()}
                </span>
              </>
            ) : (
              <StatusBadge status={holdingsStatus(sub, interest)} />
            )}
            {revoked ? <Badge variant="outline">Revoked</Badge> : null}
          </div>
        </TableCell>
        <TableCell className="py-4 align-top">
          <RowActions
            investorId={investor.id}
            investorName={investor.name}
            subscriptionId={sub?.id ?? null}
            actions={nextActions(sub)}
            revoked={revoked}
          />
        </TableCell>
      </TableRow>
      <TableRow className={cn("hover:bg-transparent", revoked && "text-muted-foreground")}>
        <TableCell colSpan={COLUMNS} className="px-2 pt-0 pb-4 whitespace-normal">
          <Answers row={row} />
        </TableCell>
      </TableRow>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function Answers({ row }: { row: InvestorFunnelRow }) {
  const q = row.questionnaire;
  const ack = row.latestAcknowledgment;
  const sub = row.subscription;
  const interest = row.interest;
  const manifest = ack ? parseManifest(ack.documentsJson) : [];

  return (
    <details className="sticky left-2 max-w-[calc(100vw-4rem)] text-sm md:max-w-[1100px]">
      <summary className="cursor-pointer text-[13px] font-medium underline-offset-4 hover:underline">
        Answers for {row.investor.name}
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-6 border-l-2 border-accent pl-4 md:grid-cols-2 lg:grid-cols-4">
        <section className="flex flex-col gap-2">
          <h4 className="font-sans text-[13px] font-semibold">Questionnaire</h4>
          {q ? (
            <dl className="flex flex-col gap-2">
              <Field label="Name">{q.name}</Field>
              <Field label="Email">{q.email}</Field>
              <Field label="Phone">{q.phone}</Field>
              <Field label="Address">
                {q.address1}
                {q.address2 ? `, ${q.address2}` : ""}, {q.city}, {q.state} {q.postalCode}
              </Field>
              <Field label="Status">{q.investorStatus === "accredited" ? "Accredited" : "Sophisticated (non-accredited)"}</Field>
              <Field label="Basis">{q.statusBasis}</Field>
              <Field label="Relationship confirmed">{q.relationshipConfirmed ? "Yes" : "No"}</Field>
              <Field label="Bad actor confirmation">{q.badActorConfirmed ? "Yes" : "No"}</Field>
              <Field label="Signed">
                {q.signatureName}, {formatDate(q.signatureDate)}
              </Field>
              <Field label="Submitted">
                {formatTimestamp(q.createdAt)} from {q.ip || "unknown IP"}
              </Field>
            </dl>
          ) : (
            <p className="text-muted-foreground">Not submitted.</p>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h4 className="font-sans text-[13px] font-semibold">Documents acknowledged</h4>
          {ack ? (
            <dl className="flex flex-col gap-2">
              <Field label="When">
                {formatTimestamp(ack.createdAt)} from {ack.ip || "unknown IP"}
              </Field>
              <Field label="Current documents">{row.acknowledgmentCurrent ? "Yes" : "No, documents changed since"}</Field>
              <Field label="Versions">
                <ul>
                  {manifest.map((m) => (
                    <li key={m.filePath}>
                      {m.filePath} v{m.version}
                    </li>
                  ))}
                </ul>
              </Field>
            </dl>
          ) : (
            <p className="text-muted-foreground">Not acknowledged.</p>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h4 className="font-sans text-[13px] font-semibold">Interest</h4>
          {interest ? (
            <dl className="flex flex-col gap-2">
              <Field label="Units">{formatUnits(interest.units)}</Field>
              <Field label="Note">{interest.note || "None"}</Field>
              <Field label="Updated">{formatTimestamp(interest.updatedAt)}</Field>
            </dl>
          ) : (
            <p className="text-muted-foreground">No interest registered.</p>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h4 className="font-sans text-[13px] font-semibold">Subscription</h4>
          {sub ? (
            <dl className="flex flex-col gap-2">
              <Field label="Wire reference">
                <span className="font-mono text-[13px]">{sub.wireReference}</span>
              </Field>
              <Field label="Requested">
                {formatTimestamp(sub.createdAt)} from {sub.ip || "unknown IP"}
              </Field>
              <Field label="Accepted">{formatTimestamp(sub.acceptedAt)}</Field>
              <Field label="Signed">{formatTimestamp(sub.signedAt)}</Field>
              <Field label="Funded">{formatTimestamp(sub.fundedAt)}</Field>
              {sub.cancelledAt ? <Field label="Cancelled">{formatTimestamp(sub.cancelledAt)}</Field> : null}
            </dl>
          ) : (
            <p className="text-muted-foreground">No subscription.</p>
          )}
        </section>
      </div>
    </details>
  );
}
