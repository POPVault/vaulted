import Image from "next/image";
import Link from "next/link";
import { InvestNav } from "./invest-nav";

export function InvestHeader() {
  return (
    <header className="border-b border-line py-5 md:py-6">
      <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <Link href="/invest" aria-label="Vaulted, offering home" className="shrink-0">
          <Image
            src="/brand/logo-black.png"
            alt="Vaulted"
            width={1400}
            height={215}
            priority
            className="h-auto w-[112px] md:w-[140px]"
          />
        </Link>
        <InvestNav />
      </div>
    </header>
  );
}
