import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/invest/empty-state";
import { PageIntro } from "@/components/invest/page-intro";
import { StatBlock } from "@/components/invest/stat-block";
import { StatusBadge } from "@/components/invest/status-badge";
import { SubscribeForm } from "@/components/invest/subscribe-form";
import { WireCard } from "@/components/invest/wire-card";
import { Button } from "@/components/ui/button";
import type { Offering, Subscription } from "@/db/schema";
import { findCurrentOffering } from "@/data/offerings";
import { getQuestionnaire } from "@/data/questionnaires";
import { getSubscription, statusFromTimestamps, unitsRemaining } from "@/data/subscriptions";
import { formatMoney, formatUnits } from "@/lib/format";
import { DOCUMENTS_HREF, hasCurrentAcknowledgment } from "@/lib/invest-gates";
import { requireInvestor } from "@/lib/session";

export default async function SubscribePage() {
  const offering = await findCurrentOffering();
  if (!offering) redirect("/invest/enter");
  const investor = await requireInvestor(offering.id);

  // An existing request keeps its instructions (wire, e-sign, next steps) in
  // every phase. The phase gate only applies to new requests.
  const subscription = await getSubscription(investor.id, offering.id);
  if (subscription && subscription.cancelledAt === null) {
    return <StatusView offering={offering} subscription={subscription} />;
  }

  if (offering.phase === "preview") redirect("/invest");
  if (offering.phase === "closed") {
    return (
      <Panel title="Offering closed">
        <p>This offering is no longer taking subscriptions. Your records and any updates are on My holdings.</p>
        <HoldingsLink />
      </Panel>
    );
  }

  if (subscription) {
    return (
      <Panel title="Request cancelled">
        <p>
          Your subscription request was cancelled.
          {offering.contactEmail ? (
            <>
              {" "}If you think this is a mistake, email us at{" "}
              <a href={`mailto:${offering.contactEmail}`} className="text-foreground underline">
                {offering.contactEmail}
              </a>
              .
            </>
          ) : null}
        </p>
        <HoldingsLink />
      </Panel>
    );
  }

  if (!(await getQuestionnaire(investor.id, offering.id))) redirect("/invest/questionnaire");
  if (!(await hasCurrentAcknowledgment(investor.id, offering.id))) redirect(DOCUMENTS_HREF);

  const remaining = await unitsRemaining(offering);
  const available = offering.investorUnitsOffered !== null && remaining > 0;

  return (
    <div className="shell flex flex-col gap-10 py-12 md:gap-14 md:py-20">
      <PageIntro title="Subscribe">
        <p>
          Choose how many units to request at <span className="tabular">{formatMoney(offering.pricePerUnitCents)}</span>{" "}
          each. Next you will sign the subscription agreement online and send a bank wire.
        </p>
      </PageIntro>
      <div className="max-w-3xl">
        {available ? (
          <SubscribeForm pricePerUnitCents={offering.pricePerUnitCents} remaining={remaining} />
        ) : (
          <div className="border border-line bg-card">
            <EmptyState
              title="Not available yet"
              description={
                offering.investorUnitsOffered === null
                  ? "The number of units on offer has not been set. We will email you as soon as you can subscribe."
                  : "Every unit offered to investors has been requested. If any become available we will email you."
              }
              action={<HoldingsLink />}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusView({ offering, subscription }: { offering: Offering; subscription: Subscription }) {
  const status = statusFromTimestamps(subscription);
  const steps: { title: string; body: ReactNode; done: boolean }[] = [
    {
      title: "Sign the subscription agreement",
      body: "Open the agreement, check your details and sign it online. It takes a few minutes.",
      done: subscription.signedAt !== null,
    },
    {
      title: "Send your wire",
      body: (
        <>
          Wire <span className="tabular">{formatMoney(subscription.amountCents)}</span> using the details on this page.
          Include your wire reference so we can match it to you.
        </>
      ),
      done: subscription.fundedAt !== null,
    },
    {
      title: "We confirm",
      body: "Once your agreement and wire have both arrived, we confirm your units by email. Your status on My holdings updates as each step completes.",
      done: subscription.fundedAt !== null,
    },
  ];

  return (
    <div className="shell flex flex-col gap-10 py-12 md:gap-14 md:py-20">
      <PageIntro title="Request received" back={{ href: "/invest/holdings", label: "My holdings" }}>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
        </div>
        {offering.phase === "closed" ? (
          <p className="text-[15px] text-muted-foreground">The offering is closed to new requests.</p>
        ) : null}
      </PageIntro>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-2 gap-6">
            <StatBlock label="Units" value={formatUnits(subscription.units)} />
            <StatBlock label="Total" value={formatMoney(subscription.amountCents)} />
          </div>

          <section aria-labelledby="next-heading" className="flex flex-col gap-6">
            <h2 id="next-heading" className="text-3xl">
              What happens next
            </h2>
            <ol className="flex flex-col">
              {steps.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-t border-line py-5">
                  <span aria-hidden="true" className="tabular font-serif text-3xl leading-none text-accent">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-sans text-base font-semibold">
                      {step.title}
                      {step.done ? <span className="ml-2 text-sm font-normal text-accent">Done</span> : null}
                    </h3>
                    <p className="text-[15px] text-muted-foreground">{step.body}</p>
                    {i === 0 && offering.esignUrl && !step.done ? (
                      <Button asChild className="mt-2 self-start">
                        <a href={offering.esignUrl} target="_blank" rel="noopener">
                          Sign the agreement
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </Button>
                    ) : null}
                    {i === 0 && !offering.esignUrl ? (
                      <p className="text-[15px]">We will email you a link to the agreement.</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <WireCard
          wireReference={subscription.wireReference}
          amountCents={subscription.amountCents}
          instructions={offering.wireInstructions}
        />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="shell py-12 md:py-20">
      <div className="flex max-w-2xl flex-col gap-6 border border-line bg-card p-6 md:p-10">
        <h1 className="text-4xl leading-tight md:text-5xl">{title}</h1>
        <div className="flex flex-col gap-6 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function HoldingsLink() {
  return (
    <Button asChild variant="outline" className="self-start">
      <Link href="/invest/holdings">Go to My holdings</Link>
    </Button>
  );
}
