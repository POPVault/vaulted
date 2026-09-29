"use client";

import { useActionState } from "react";
import { updateCloseDate, type AdminActionState } from "@/actions/admin";
import { FieldError } from "@/components/invest/field-error";
import { SubmitButton } from "@/components/invest/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionNotice } from "./action-notice";

export function CloseDateForm({ closeDate }: { closeDate: string | null }) {
  const [state, action] = useActionState<AdminActionState, FormData>(updateCloseDate, {
    status: "idle",
    message: null,
  });
  const fieldError = state.fieldErrors?.closeDate;

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <div>
        <Label htmlFor="closeDate">Close date</Label>
        <Input
          id="closeDate"
          name="closeDate"
          type="date"
          defaultValue={state.values?.closeDate ?? closeDate ?? ""}
          className="mt-2 max-w-[14rem]"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby="closeDate-hint"
        />
        <p id="closeDate-hint" className="mt-2 text-[13px] text-muted-foreground">
          Leave empty and save to clear it.
        </p>
        <FieldError id="closeDate-error" errors={fieldError} />
      </div>
      <SubmitButton size="sm" pendingLabel="Saving..." className="self-start">
        Save close date
      </SubmitButton>
      {fieldError ? null : <ActionNotice state={state} />}
    </form>
  );
}
