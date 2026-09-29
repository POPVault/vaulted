import type { ReactNode } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** When set, renders as a full-width table row spanning this many columns. */
  colSpan?: number;
};

export function EmptyState({ title, description, action, colSpan }: EmptyStateProps) {
  const body = (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-serif text-2xl leading-tight">{title}</p>
      {description ? (
        <p className="max-w-[36em] text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );

  if (colSpan === undefined) return body;

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0 whitespace-normal">
        {body}
      </TableCell>
    </TableRow>
  );
}
