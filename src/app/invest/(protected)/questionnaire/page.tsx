import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PageIntro } from "@/components/invest/page-intro";
import { QuestionnaireForm } from "@/components/invest/questionnaire-form";
import { usStateName } from "@/components/invest/us-states";
import { Button } from "@/components/ui/button";
import type { Questionnaire } from "@/db/schema";
import { findCurrentOffering } from "@/data/offerings";
import { getQuestionnaire } from "@/data/questionnaires";
import { formatDate } from "@/lib/format";
import { DOCUMENTS_HREF, hasCurrentAcknowledgment } from "@/lib/invest-gates";
import { requireInvestor } from "@/lib/session";
import { basisLabelFor, statusLabelFor } from "@/lib/validation/questionnaire";

export default async function QuestionnairePage() {
  const offering = await findCurrentOffering();
  if (!offering) redirect("/invest/enter");
  const investor = await requireInvestor(offering.id);
  if (offering.phase !== "open") redirect("/invest");

  const questionnaire = await getQuestionnaire(investor.id, offering.id);

  if (questionnaire) {
    const acknowledged = await hasCurrentAcknowledgment(investor.id, offering.id);
    return (
      <div className="shell flex flex-col gap-10 py-12 md:gap-14 md:py-20">
        <PageIntro title="Your questionnaire">
          <p>
            You signed this on <time dateTime={questionnaire.signatureDate}>{formatDate(questionnaire.signatureDate)}</time>.
            {offering.contactEmail ? (
              <>
                {" "}If anything here has changed, email us at{" "}
                <a href={`mailto:${offering.contactEmail}`} className="text-foreground underline">
                  {offering.contactEmail}
                </a>
                .
              </>
            ) : null}
          </p>
        </PageIntro>
        <div className="flex max-w-3xl flex-col gap-8">
          <QuestionnaireSummary questionnaire={questionnaire} />
          <div className="flex flex-col gap-3">
            <Button asChild className="self-start">
              <Link href={acknowledged ? "/invest/subscribe" : DOCUMENTS_HREF}>
                {acknowledged ? "Continue to subscribe" : "Review the documents"}
              </Link>
            </Button>
            {!acknowledged ? (
              <p className="text-[13px] text-muted-foreground">
                Before you subscribe, confirm that you have received and read the current offering documents.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell flex flex-col gap-10 py-12 md:gap-14 md:py-20">
      <PageIntro title="Investor questionnaire">
        <p>
          The law requires us to know a little about each investor before they buy. It takes about five minutes. Your
          answers are private and are kept with the offering records.
        </p>
      </PageIntro>
      <div className="max-w-3xl">
        <QuestionnaireForm
          initial={{
            name: investor.name,
            email: investor.email,
            signatureName: investor.name,
            signatureDate: new Date().toISOString().slice(0, 10),
          }}
        />
      </div>
    </div>
  );
}

function QuestionnaireSummary({ questionnaire: q }: { questionnaire: Questionnaire }) {
  const address = [q.address1, q.address2, `${q.city}, ${usStateName(q.state)} ${q.postalCode}`].filter(Boolean);
  const rows: { label: string; value: ReactNode }[] = [
    { label: "Name", value: q.name },
    { label: "Email", value: q.email },
    { label: "Phone", value: q.phone },
    {
      label: "Address",
      value: (
        <>
          {address.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </>
      ),
    },
    {
      label: "Investor status",
      value: (
        <>
          <span className="block">{statusLabelFor(q.investorStatus)}</span>
          <span className="block text-muted-foreground">{basisLabelFor(q.investorStatus, q.statusBasis)}</span>
        </>
      ),
    },
    {
      label: "Confirmations",
      value: (
        <>
          <span className="block">Pre-existing relationship with Vaulted or its founders: {q.relationshipConfirmed ? "confirmed" : "not confirmed"}</span>
          <span className="block">No disqualifying event under Rule 506(d): {q.badActorConfirmed ? "confirmed" : "not confirmed"}</span>
        </>
      ),
    },
    {
      label: "Signed",
      value: (
        <>
          {q.signatureName}, <time dateTime={q.signatureDate}>{formatDate(q.signatureDate)}</time>
        </>
      ),
    },
  ];

  return (
    <section aria-label="Your answers" className="border border-line bg-card">
      <dl className="divide-y divide-line px-6 md:px-10">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-[15px] break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
