import { FileText } from "lucide-react";
import type { Document } from "@/db/schema";
import { EmptyState } from "@/components/invest/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

type DocumentsListProps = {
  documents: Pick<Document, "id" | "title" | "version" | "date">[];
  /** Ids of documents that changed since the investor's last acknowledgment. */
  updatedIds: ReadonlySet<number>;
};

export function DocumentsList({ documents, updatedIds }: DocumentsListProps) {
  if (documents.length === 0) {
    return (
      <div className="border-y border-line">
        <EmptyState title="No documents yet" description="The offering documents will be listed here before the offering opens." />
      </div>
    );
  }

  return (
    <ul className="border-b border-line">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-start justify-between gap-4 border-t border-line py-5">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-serif text-[22px] leading-[1.2] font-medium">{doc.title}</p>
              {updatedIds.has(doc.id) ? <Badge variant="accent">Updated</Badge> : null}
            </div>
            <p className="tabular text-[13px] text-muted-foreground">
              Version {doc.version}, {formatDate(doc.date)}
            </p>
          </div>
          <a
            href={`/invest/documents/${doc.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 pt-1 text-[15px] font-medium text-primary underline"
          >
            <FileText className="size-4" aria-hidden="true" />
            Open PDF<span className="sr-only">: {doc.title} (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
