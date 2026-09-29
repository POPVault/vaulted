import type { KeyTerm } from "@/db/types";

/** Key terms as definition rows: label left, value right. */
export function TermsList({ terms }: { terms: KeyTerm[] }) {
  return (
    <dl className="border-b border-line">
      {terms.map((term) => (
        <div
          key={term.label}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-6 border-t border-line py-4"
        >
          <dt className="text-[15px] text-muted-foreground">{term.label}</dt>
          <dd className="tabular text-[15px]">{term.value}</dd>
        </div>
      ))}
    </dl>
  );
}
