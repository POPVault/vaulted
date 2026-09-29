"use client";

import { useActionState } from "react";
import { addInvestor, type AdminActionState } from "@/actions/admin";
import { FieldError } from "@/components/invest/field-error";
import { SubmitButton } from "@/components/invest/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionNotice } from "./action-notice";

export function AddInvestorForm() {
  const [state, action] = useActionState<AdminActionState, FormData>(addInvestor, {
    status: "idle",
    message: null,
  });
  const errors = state.fieldErrors ?? {};
  // React resets the form after each submit; after an error the fields come back
  // with what was typed, after a success they are empty.
  const values = state.values ?? {};

  const describedBy = (field: string) => (errors[field] ? `${field}-error` : undefined);

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            defaultValue={values.name}
            name="name"
            autoComplete="off"
            maxLength={120}
            required
            className="mt-2"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("name")}
          />
          <FieldError id="name-error" errors={errors.name} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            defaultValue={values.email}
            name="email"
            type="email"
            autoComplete="off"
            maxLength={254}
            required
            className="mt-2"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
          />
          <FieldError id="email-error" errors={errors.email} />
        </div>
      </div>
      <div>
        <Label htmlFor="relationshipNote">How we know them</Label>
        <Textarea
          id="relationshipNote"
          defaultValue={values.relationshipNote}
          name="relationshipNote"
          maxLength={500}
          required
          rows={3}
          className="mt-2"
          aria-invalid={errors.relationshipNote ? true : undefined}
          aria-describedby={["relationshipNote-hint", describedBy("relationshipNote")].filter(Boolean).join(" ")}
        />
        <p id="relationshipNote-hint" className="mt-2 text-[13px] text-muted-foreground">
          Our record of the existing relationship. For example: college roommate of Charles, known since 2012.
        </p>
        <FieldError id="relationshipNote-error" errors={errors.relationshipNote} />
      </div>
      <div className="flex flex-col gap-3">
        <SubmitButton pendingLabel="Adding..." className="self-start">
          Add investor
        </SubmitButton>
        <ActionNotice state={state} />
      </div>
    </form>
  );
}
