import { redirect } from "next/navigation";
import { AcknowledgeForm } from "@/components/invest/acknowledge-form";
import { CompsTable } from "@/components/invest/comps-table";
import { DocumentsList } from "@/components/invest/documents-list";
import { Faq } from "@/components/invest/faq";
import { FundingProgress } from "@/components/invest/funding-progress";
import { Gallery } from "@/components/invest/gallery";
import { HowItWorks } from "@/components/invest/how-it-works";
import { OfferingSection } from "@/components/invest/offering-section";
import { PrimaryAction } from "@/components/invest/primary-action";
import { StatBlock } from "@/components/invest/stat-block";
import { PhaseBadge } from "@/components/invest/status-badge";
import { TermsList } from "@/components/invest/terms-list";
import { acknowledgmentIsOutdated, latestAcknowledgment } from "@/data/acknowledgments";
import { computeDocumentsHash } from "@/data/documents";
import { findCurrentOffering, getOfferingContent } from "@/data/offerings";
import { unitsTaken } from "@/data/subscriptions";
import type { Acknowledgment, Document } from "@/db/schema";
import { formatDate, formatMoney, formatUnits } from "@/lib/format";
import { requireInvestor, touchLastViewed } from "@/lib/session";

type ManifestEntry = { filePath: string; version: string; date: string; contentHash: string | null };

/** Documents whose { filePath, version, date, contentHash } differ from the acknowledged snapshot. */
function changedSince(ack: Acknowledgment, docs: Document[]): Set<number> {
  let snapshot: ManifestEntry[] = [];
  try {
    const parsed: unknown = JSON.parse(ack.documentsJson);
    if (Array.isArray(parsed)) snapshot = parsed as ManifestEntry[];
  } catch {
    // An unreadable snapshot marks every document as updated.
  }
  const byPath = new Map(snapshot.map((entry) => [entry.filePath, entry]));
  const changed = new Set<number>();
  for (const doc of docs) {
    const seen = byPath.get(doc.filePath);
    if (
      !seen ||
      seen.version !== doc.version ||
      seen.date !== doc.date ||
      (seen.contentHash ?? null) !== (doc.contentHash ?? null)
    ) {
      changed.add(doc.id);
    }
  }
  return changed;
}

export default async function OfferingPage({ searchParams }: PageProps<"/invest">) {
  const { notice } = await searchParams;
  const showDocumentsNotice = notice === "documents";
  const current = await findCurrentOffering();
  if (!current) redirect("/invest/enter");
  const investor = await requireInvestor(current.id);

  const [{ offering, items, comps, documents }, taken, latest] = await Promise.all([
    getOfferingContent(current.id),
    unitsTaken(current.id),
    latestAcknowledgment(investor.id, current.id),
    touchLastViewed(investor.id),
  ]);

  const documentsHash = computeDocumentsHash(documents);
  const acknowledged = documents.length > 0 && latest?.documentsHash === documentsHash;
  const outdated = documents.length > 0 && acknowledgmentIsOutdated(latest, documentsHash);
  const updatedIds = outdated && latest ? changedSince(latest, documents) : new Set<number>();

  const offeringValueCents =
    offering.totalUnits === null ? null : offering.totalUnits * offering.pricePerUnitCents;
  const closeCaption = offering.closeDate
    ? `Closes ${formatDate(offering.closeDate)}`
    : "Close date to be announced";

  return (
    <article>
      {/* 1. Heading */}
      <header className="shell flex flex-col gap-8 pt-16 pb-16 md:pt-24 md:pb-24">
        <div className="flex flex-wrap items-center gap-4">
          <p className="eyebrow">Private offering</p>
          <PhaseBadge phase={offering.phase} />
        </div>
        <h1 className="max-w-[14em] text-[clamp(48px,7vw,88px)] leading-none">{offering.name}</h1>
        <div className="flex max-w-[36em] flex-col gap-4 text-[19px] leading-relaxed">
          {offering.overview.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </header>

      {/* 2. How this works */}
      <OfferingSection id="how-it-works" title="How this works" layout="stacked" className="bg-cream-deep">
        <HowItWorks steps={offering.howItWorks} />
      </OfferingSection>

      {/* 3. Figures */}
      <OfferingSection id="figures" title="The offering at a glance" layout="stacked">
        <div className="flex flex-col gap-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock label="Offering value" value={formatMoney(offeringValueCents)} />
            <StatBlock label="Price per unit" value={formatMoney(offering.pricePerUnitCents)} />
            <StatBlock label="Units offered" value={formatUnits(offering.investorUnitsOffered)} />
            <StatBlock label="Close date" value={formatDate(offering.closeDate)} />
          </div>
          <div className="flex max-w-2xl flex-col gap-2">
            <FundingProgress taken={taken} total={offering.investorUnitsOffered} />
            <p className="tabular text-[13px] text-muted-foreground">{closeCaption}</p>
          </div>
        </div>
      </OfferingSection>

      {/* 4. Gallery */}
      <section id="collection" aria-labelledby="collection-heading" className="bg-green-deep py-16 text-cream md:py-24">
        <div className="shell flex flex-col gap-12">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
            <h2 id="collection-heading" className="text-[clamp(36px,4.5vw,56px)] leading-[1.05]">
              The collection
            </h2>
            {items.length > 0 ? (
              <p className="tabular text-[15px] text-cream/75">
                {items.length} {items.length === 1 ? "photograph" : "photographs"}. Select one to see it full screen.
              </p>
            ) : null}
          </header>
          <div>
            <Gallery items={items} />
          </div>
        </div>
      </section>

      {/* 5. Provenance and custody */}
      <OfferingSection id="provenance" title="Provenance and custody">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h3 className="text-[26px] leading-[1.2] font-medium">Provenance</h3>
            <p className="max-w-[36em] whitespace-pre-line">{offering.provenance}</p>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-8">
            <h3 className="text-[26px] leading-[1.2] font-medium">Custody</h3>
            <p className="max-w-[36em] whitespace-pre-line">{offering.custody}</p>
          </div>
        </div>
      </OfferingSection>

      {/* 6. Comps */}
      <OfferingSection
        id="comps"
        title="Comparable sales"
        intro="Recent public sales of similar items. Past prices do not predict what this collection will sell for."
        className="border-t border-line"
      >
        <CompsTable comps={comps} />
      </OfferingSection>

      {/* 7. Key terms */}
      <OfferingSection id="terms" title="Key terms" className="border-t border-line">
        <TermsList terms={offering.keyTerms} />
      </OfferingSection>

      {/* 8. How you get paid */}
      <OfferingSection id="get-paid" title="How you get paid" className="bg-cream-deep">
        {offering.howYouGetPaid ? (
          <div className="flex flex-col gap-8">
            <p className="max-w-[36em] text-[19px] leading-relaxed">{offering.howYouGetPaid.intro}</p>
            <ol className="flex flex-col border-b border-line">
              {offering.howYouGetPaid.example_steps.map((stepText, index) => (
                <li key={stepText} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 border-t border-line py-4">
                  <span className="tabular font-serif text-[22px] leading-[1.3] text-accent" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="tabular">{stepText}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-muted-foreground">Details of how proceeds are paid out will appear here.</p>
        )}
      </OfferingSection>

      {/* 9. Key risks */}
      <OfferingSection
        id="risks"
        title="Key risks"
        intro="Read these carefully. The offering memorandum describes every risk in full."
      >
        <ul className="border-b border-line">
          {offering.risks.map((risk) => (
            <li key={risk} className="border-t border-line py-4">
              {risk}
            </li>
          ))}
        </ul>
      </OfferingSection>

      {/* 10. FAQ */}
      <OfferingSection id="faq" title="Questions" className="border-t border-line">
        <Faq entries={offering.faq} contactEmail={offering.contactEmail} />
      </OfferingSection>

      {/* 11. Documents and 12. primary action */}
      <OfferingSection
        id="documents"
        title="Offering documents"
        intro="Read each document before you invest. They open in a new tab."
        className="border-t border-line"
      >
        <div className="flex flex-col gap-8">
          {showDocumentsNotice ? (
            <p role="status" className="border-l-2 border-accent bg-card py-3 pr-4 pl-4 text-[15px]">
              Your questionnaire is saved. Confirm you have read the documents below to continue to subscribe.
            </p>
          ) : null}
          {outdated ? (
            <p role="status" className="border-l-2 border-accent bg-card py-3 pr-4 pl-4 text-[15px]">
              The documents have been updated since you last confirmed. Please review and confirm again.
            </p>
          ) : null}
          <DocumentsList documents={documents} updatedIds={updatedIds} />
          <AcknowledgeForm
            key={documentsHash}
            documentsHash={documentsHash}
            recordedAt={acknowledged && latest ? latest.createdAt : null}
            disabled={documents.length === 0}
          />
          <div id="invest" className="border-t border-line pt-8">
            <PrimaryAction phase={offering.phase} acknowledged={acknowledged} />
          </div>
        </div>
      </OfferingSection>

      {/* 13. Legal line */}
      {offering.legalLine ? (
        <div className="shell pb-16 md:pb-24">
          <p className="max-w-[36em] border-t border-line pt-6 text-[13px] text-muted-foreground">{offering.legalLine}</p>
        </div>
      ) : null}
    </article>
  );
}
