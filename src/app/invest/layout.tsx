import type { Metadata } from "next";
import type { ReactNode } from "react";

// Metadata only. Session checks live in (protected)/layout.tsx; the public
// group (enter, invite link, logout) needs none.
export const metadata: Metadata = {
  title: "Vaulted",
  robots: { index: false, follow: false },
};

export default function InvestLayout({ children }: { children: ReactNode }) {
  return children;
}
