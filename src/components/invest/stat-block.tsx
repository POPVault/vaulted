import type { ReactNode } from "react";

type StatBlockProps = {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
};

export function StatBlock({ label, value, caption }: StatBlockProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-5">
      <p className="eyebrow">{label}</p>
      <p className="tabular font-serif text-4xl leading-none md:text-5xl">{value}</p>
      {caption ? <p className="text-[13px] text-muted-foreground">{caption}</p> : null}
    </div>
  );
}
