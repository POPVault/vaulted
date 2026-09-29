import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AddInvestorForm } from "@/components/admin/add-investor-form";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { CloseDateForm } from "@/components/admin/close-date-form";
import { DocumentStatus } from "@/components/admin/document-status";
import { InvestorTable } from "@/components/admin/investor-table";
import { PhaseForm } from "@/components/admin/phase-form";
import { TotalsPanel } from "@/components/admin/totals-panel";
import { PhaseBadge } from "@/components/invest/status-badge";
import { formDClock, totals } from "@/data/admin";
import { listDocuments, verifyDocumentFiles } from "@/data/documents";
import { listInvestorsWithFunnel } from "@/data/investors";
import { findCurrentOffering } from "@/data/offerings";
import { getAdminOrNull, requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Absolute origin for personal links, from the request (the trusted proxy sets x-forwarded-*). */
function requestOrigin(h: Headers): string {
  const host = h.get("x-forwarded-host")?.split(",").at(-1)?.trim() || h.get("host") || "localhost";
  const proto =
    h.get("x-forwarded-proto")?.split(",").at(-1)?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-6 border-t border-foreground pt-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl leading-tight md:text-4xl">{title}</h2>
        {description ? <p className="max-w-[60ch] text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default async function AdminPage() {
  if (!(await getAdminOrNull())) {
    return (
      <div className="shell py-16 md:py-24">
        <section className="flex max-w-md flex-col gap-8">
          <h1 className="text-4xl leading-tight md:text-5xl">Admin</h1>
          <AdminLoginForm />
        </section>
      </div>
    );
  }
  await requireAdmin();

  const offering = await findCurrentOffering();
  if (!offering) {
    return (
      <div className="shell py-16 md:py-24">
        <h1 className="text-4xl leading-tight md:text-5xl">No offering yet</h1>
        <p className="mt-4 text-muted-foreground">Run pnpm seed to load the offering, then reload this page.</p>
      </div>
    );
  }

  const [documents, checks, offeringTotals, clock, rows] = await Promise.all([
    listDocuments(offering.id),
    verifyDocumentFiles(offering.id),
    totals(offering.id),
    formDClock(offering.id),
    listInvestorsWithFunnel(offering.id),
  ]);
  const origin = requestOrigin(await headers());

  return (
    <div className="shell flex flex-col gap-16 py-12 md:py-16">
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">{offering.code}</span>
            <PhaseBadge phase={offering.phase} />
          </div>
          <h1 className="text-4xl leading-tight md:text-6xl">{offering.name}</h1>
        </div>
        <div className="grid grid-cols-1 gap-10 border border-line bg-card p-6 md:grid-cols-3 md:p-8">
          <PhaseForm phase={offering.phase} />
          <CloseDateForm closeDate={offering.closeDate} />
          <DocumentStatus documents={documents} checks={checks} />
        </div>
      </section>

      <Section title="Totals">
        <TotalsPanel totals={offeringTotals} />
      </Section>

      <Section title="Form D" description="Form D is due 15 days after the first accepted subscription.">
        {clock ? (
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:max-w-2xl">
            <div className="flex flex-col gap-1 border-t border-line pt-4">
              <dt className="text-sm text-muted-foreground">First accepted</dt>
              <dd className="font-serif text-3xl">
                <time dateTime={clock.firstAcceptedAt}>{formatDate(clock.firstAcceptedAt)}</time>
              </dd>
            </div>
            <div className="flex flex-col gap-1 border-t border-accent pt-4">
              <dt className="text-sm text-muted-foreground">Due by</dt>
              <dd className="font-serif text-3xl">
                <time dateTime={clock.dueAt}>{formatDate(clock.dueAt)}</time>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm">No accepted subscription yet, so the clock has not started.</p>
        )}
      </Section>

      <Section
        title="Add investor"
        description="Only add people we already know. The note is our record of that relationship."
      >
        <div className="md:max-w-3xl">
          <AddInvestorForm />
        </div>
      </Section>

      <Section
        title="Investors"
        description="Send each person their own link directly. Links are personal and must not be shared."
      >
        <div className="min-w-0 border border-line bg-card">
          <InvestorTable rows={rows} origin={origin} />
        </div>
      </Section>

      <Section title="Exports" description="CSV files for the records. They include IP addresses and personal details, so store them securely.">
        <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium">
          <li>
            <a href="/admin/export/investors" className="underline underline-offset-[6px]" download>
              Download investors CSV
            </a>
          </li>
          <li>
            <a href="/admin/export/acknowledgments" className="underline underline-offset-[6px]" download>
              Download acknowledgments CSV
            </a>
          </li>
        </ul>
      </Section>
    </div>
  );
}
