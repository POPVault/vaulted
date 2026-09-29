"use client";

import { useActionState } from "react";
import { enterInviteLink, type EnterInviteState } from "@/actions/session";
import { FieldError } from "@/components/invest/field-error";
import { SubmitButton } from "@/components/invest/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EnterForm({ initialError }: { initialError: string | null }) {
  const [state, action] = useActionState<EnterInviteState, FormData>(enterInviteLink, { error: initialError });

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <div>
        <Label htmlFor="link">Invite link</Label>
        <Input
          id="link"
          name="link"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          required
          maxLength={500}
          className="mt-2"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "link-error" : undefined}
        />
        <FieldError id="link-error" errors={state.error ?? undefined} />
      </div>
      <SubmitButton pendingLabel="Checking..." className="self-start">
        Continue
      </SubmitButton>
    </form>
  );
}
