import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Vaulted admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-line py-5">
        <div className="shell flex items-center gap-4">
          <Image
            src="/brand/logo-black.png"
            alt="Vaulted"
            width={1400}
            height={215}
            priority
            className="h-auto w-[112px]"
          />
          <p className="eyebrow">Admin</p>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
