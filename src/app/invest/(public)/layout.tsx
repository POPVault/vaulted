import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InvestFooter } from "@/components/invest/invest-footer";
import { InvestHeader } from "@/components/invest/invest-header";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// No offering text here: these pages render without a session.
export default function PublicInvestLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <InvestHeader />
      <main className="flex-1">{children}</main>
      <InvestFooter />
    </>
  );
}
