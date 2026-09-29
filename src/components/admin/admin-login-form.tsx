"use client";

import { useActionState } from "react";
import { adminLogin, type AdminLoginState } from "@/actions/admin";
import { FieldError } from "@/components/invest/field-error";
import { SubmitButton } from "@/components/invest/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const [state, action] = useActionState<AdminLoginState, FormData>(adminLogin, { error: null });

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <div>
        <Label htmlFor="code">Admin code</Label>
        <Input
          id="code"
          name="code"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          className="mt-2"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "code-error" : undefined}
        />
        <FieldError id="code-error" errors={state.error ?? undefined} />
      </div>
      <SubmitButton pendingLabel="Checking..." className="self-start">
        Log in
      </SubmitButton>
    </form>
  );
}
