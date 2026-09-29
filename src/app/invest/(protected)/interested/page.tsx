import { redirect } from "next/navigation";
import { InterestedForm } from "@/components/invest/interested-form";
import { PageIntro } from "@/components/invest/page-intro";
import { getInterest } from "@/data/interests";
import { findCurrentOffering } from "@/data/offerings";
import { formatMoney } from "@/lib/format";
import { requireInvestor } from "@/lib/session";

export default async function InterestedPage() {
  const offering = await findCurrentOffering();
  if (!offering) redirect("/invest/enter");
  const investor = await requireInvestor(offering.id);
  if (offering.phase !== "preview") redirect("/invest");

  const interest = await getInterest(investor.id, offering.id);

  return (
    <div className="shell flex flex-col gap-10 py-12 md:gap-14 md:py-20">
      <PageIntro title={interest ? "Your interest" : "Register your interest"}>
        <p>
          {offering.name} is not open yet. Tell us roughly how many units you might want at{" "}
          <span className="tabular">{formatMoney(offering.pricePerUnitCents)}</span> each, and we will email you when it
          opens.
        </p>
        <p>It is not a commitment and you will not be charged.</p>
      </PageIntro>
      <div className="max-w-3xl">
        <InterestedForm
          pricePerUnitCents={offering.pricePerUnitCents}
          initial={interest ? { units: interest.units, note: interest.note } : null}
        />
      </div>
    </div>
  );
}
