import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InvestFooter } from "@/components/invest/invest-footer";
import { InvestHeader } from "@/components/invest/invest-header";

export const metadata: Metadata = {
  title: "Vaulted",
  robots: { index: false, follow: false },
};

// Session enforcement and real legend/legal content arrive in later pieces.
export default function InvestLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <InvestHeader />
      <main className="flex-1">{children}</main>
      <InvestFooter
        legend="Confidentiality legend placeholder. Replaced by the offering content."
        legalLine="Legal line placeholder. Replaced by the offering content."
      />
    </>
  );
}
