"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acknowledgeDocuments } from "@/actions/acknowledge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type AcknowledgeFormProps = {
  /** The manifest hash of the documents rendered on this page. */
  documentsHash: string;
  /** When the current documents were acknowledged, or null if they have not been. */
  recordedAt: string | null;
  /** No documents means nothing to acknowledge yet. */
  disabled?: boolean;
};

export function AcknowledgeForm({ documentsHash, recordedAt, disabled = false }: AcknowledgeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doneAt = recordedAt ?? confirmedAt;
  const locked = doneAt !== null;

  const onCheckedChange = (checked: boolean | "indeterminate") => {
    if (checked !== true || locked || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await acknowledgeDocuments({ documentsHash });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirmedAt(result.createdAt);
      // Re-renders the server components so the Invest action unlocks without a reload.
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 border border-line bg-card p-5 md:p-6">
      <div className="flex items-start gap-3">
        <Checkbox
          id="acknowledge"
          className={cn("mt-1 size-5", locked && "disabled:cursor-default disabled:opacity-100")}
          checked={locked || pending}
          disabled={locked || pending || disabled}
          aria-busy={pending || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby="acknowledge-status"
          onCheckedChange={onCheckedChange}
        />
        <Label htmlFor="acknowledge" className={cn("text-[17px] leading-snug font-medium", locked && "peer-disabled:cursor-default peer-disabled:opacity-100")}>
          I have received and read the offering documents
        </Label>
      </div>
      <p id="acknowledge-status" role="status" className="tabular pl-8 text-[13px] text-muted-foreground">
        {pending
          ? "Recording your confirmation..."
          : doneAt
            ? `Recorded on ${formatDate(doneAt)}`
            : disabled
              ? "The documents will be available here before the offering opens."
              : "We record the date and the document versions you confirmed."}
      </p>
      {error ? (
        <p role="alert" className="pl-8 text-[13px] font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
