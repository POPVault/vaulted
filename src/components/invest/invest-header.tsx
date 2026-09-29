import Image from "next/image";
import Link from "next/link";
import { InvestNav } from "./invest-nav";

type InvestHeaderProps = {
  /** Signed-in pages show the nav; public pages (enter) show the logo only. */
  nav?: boolean;
};

export function InvestHeader({ nav = false }: InvestHeaderProps) {
  const logo = (
    <Image
      src="/brand/logo-black.png"
      alt="Vaulted"
      width={1400}
      height={215}
      priority
      className="h-auto w-[112px] md:w-[140px]"
    />
  );

  return (
    <header className="border-b border-line py-5 md:py-6">
      <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        {nav ? (
          <Link href="/invest" aria-label="Vaulted, offering home" className="shrink-0">
            {logo}
          </Link>
        ) : (
          <div className="shrink-0">{logo}</div>
        )}
        {nav ? <InvestNav /> : null}
      </div>
    </header>
  );
}
