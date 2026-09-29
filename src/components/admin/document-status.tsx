import type { DocumentFileCheck } from "@/data/documents";
import type { Document } from "@/db/schema";

const REASONS: Record<NonNullable<DocumentFileCheck["reason"]>, string> = {
  missing_hash: "File missing or not synced",
  missing_file: "File missing",
  hash_mismatch: "File changed since last sync",
};

type DocumentStatusProps = { documents: Document[]; checks: DocumentFileCheck[] };

export function DocumentStatus({ documents, checks }: DocumentStatusProps) {
  const byId = new Map(checks.map((c) => [c.documentId, c]));
  const problems = checks.filter((c) => !c.ok).length;
  const placeholders = checks.filter((c) => c.ok && c.placeholder).length;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium font-sans">Documents on the server</h3>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No documents are set up for this offering. Add them to the offering content and run pnpm seed.
        </p>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {documents.map((doc) => {
            const check = byId.get(doc.id);
            const ok = check?.ok ?? false;
            return (
              <li key={doc.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line py-3 text-sm">
                <span className="min-w-0 break-words">
                  {doc.title} <span className="text-muted-foreground">v{doc.version}</span>
                </span>
                {ok && check?.placeholder ? (
                  <span className="font-medium text-destructive">Placeholder, not a real document</span>
                ) : (
                  <span className={ok ? "text-foreground" : "font-medium text-destructive"}>
                    {ok ? "Verified" : REASONS[check?.reason ?? "missing_file"]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {placeholders > 0 ? (
        <p className="text-[13px] font-medium text-destructive">
          Placeholder PDFs are for local development only. Replace them with the real documents before
          opening; production will not open on placeholders alone.
        </p>
      ) : null}
      {problems > 0 || placeholders > 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Put each PDF in the documents folder (private/documents unless DOCUMENTS_DIR is set) under its
          exact file name, then run{" "}
          <code className="bg-muted px-1 font-mono text-[12px]">pnpm docs:sync</code>.
        </p>
      ) : null}
    </div>
  );
}
