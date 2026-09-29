import Image from "next/image";

type InvestFooterProps = {
  legend: string;
  legalLine: string;
};

export function InvestFooter({ legend, legalLine }: InvestFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-green-deep py-16 text-cream [&_:focus-visible]:outline-gold">
      <div className="shell flex flex-col gap-10">
        <Image
          src="/brand/logo-gold-cream.png"
          alt="Vaulted"
          width={1400}
          height={215}
          className="h-auto w-[120px]"
        />
        <p className="max-w-[36em] text-[15px] leading-relaxed">{legend}</p>
        <div className="flex flex-col gap-4 border-t border-cream/20 pt-6 text-[13px] text-cream/80 md:flex-row md:justify-between md:gap-10">
          <p className="max-w-[36em]">{legalLine}</p>
          <p className="tabular shrink-0">&copy; {year} Vaulted. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
