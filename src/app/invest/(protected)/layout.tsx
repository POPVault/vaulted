import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { InvestFooter } from "@/components/invest/invest-footer";
import { InvestHeader } from "@/components/invest/invest-header";
import { findCurrentOffering } from "@/data/offerings";
import { requireInvestor } from "@/lib/session";

export default async function ProtectedInvestLayout({ children }: { children: ReactNode }) {
  // Without an offering nobody can hold access, so fail closed.
  const offering = await findCurrentOffering();
  if (!offering) redirect("/invest/enter");
  await requireInvestor(offering.id);

  return (
    <>
      <InvestHeader nav />
      <main className="flex-1">{children}</main>
      <InvestFooter legend={offering.legend} legalLine={offering.legalLine} />
    </>
  );
}
