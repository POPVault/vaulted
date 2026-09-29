"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { submitQuestionnaire, type QuestionnaireState } from "@/actions/questionnaire";
import { FieldError } from "@/components/invest/field-error";
import { SubmitButton } from "@/components/invest/submit-button";
import { US_STATES } from "@/components/invest/us-states";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INVESTOR_STATUS_OPTIONS, type QuestionnaireField } from "@/lib/validation/questionnaire";

type Defaults = Partial<Record<QuestionnaireField, string>>;

type QuestionnaireFormProps = {
  /** Name, email and today's date, prefilled for the investor. */
  initial: Defaults;
};

export function QuestionnaireForm({ initial }: QuestionnaireFormProps) {
  const [state, action] = useActionState<QuestionnaireState, FormData>(submitQuestionnaire, { status: "idle" });
  const defaults: Defaults = state.values ? { ...state.values } : initial;

  return (
    <QuestionnaireFields
      // Remount after each response so every field refills with what was sent.
      key={state.submissionId ?? "initial"}
      action={action}
      state={state}
      defaults={defaults}
    />
  );
}

function QuestionnaireFields({
  action,
  state,
  defaults,
}: {
  action: (formData: FormData) => void;
  state: QuestionnaireState;
  defaults: Defaults;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState(defaults.investorStatus ?? "");
  const errors = state.fieldErrors ?? {};
  const selected = INVESTOR_STATUS_OPTIONS.find((o) => o.value === status);

  // After a failed submit, move focus to the first field that needs attention.
  useEffect(() => {
    if (state.status !== "error") return;
    const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    (first ?? formRef.current?.querySelector<HTMLElement>("[role='alert']"))?.focus();
  }, [state]);

  const invalid = (field: QuestionnaireField) => (errors[field] ? true : undefined);
  const describedBy = (field: QuestionnaireField, help?: string) =>
    [help, errors[field] ? `${field}-error` : null].filter(Boolean).join(" ") || undefined;

  const text = (
    field: QuestionnaireField,
    label: string,
    props: { autoComplete?: string; type?: string; inputMode?: "tel" | "email" | "numeric"; maxLength: number; help?: string; optional?: boolean },
  ) => (
    <div>
      <Label htmlFor={field}>
        {label}
        {props.optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
      </Label>
      <Input
        id={field}
        name={field}
        type={props.type ?? "text"}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        maxLength={props.maxLength}
        required={!props.optional}
        defaultValue={defaults[field] ?? ""}
        className="mt-2"
        aria-invalid={invalid(field)}
        aria-describedby={describedBy(field, props.help ? `${field}-help` : undefined)}
      />
      {props.help ? (
        <p id={`${field}-help`} className="mt-2 text-[13px] text-muted-foreground">
          {props.help}
        </p>
      ) : null}
      <FieldError id={`${field}-error`} errors={errors[field]} />
    </div>
  );

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-12 border border-line bg-card p-6 md:p-10">
      {state.status === "error" && state.message ? (
        <p role="alert" tabIndex={-1} className="border-l-2 border-destructive pl-4 text-[15px] text-destructive outline-none">
          {state.message}
        </p>
      ) : null}

      <Section title="About you" intro="We use these details to prepare your subscription documents and to contact you.">
        <div className="grid gap-6 md:grid-cols-2">
          {text("name", "Full legal name", { autoComplete: "name", maxLength: 120 })}
          {text("email", "Email", { autoComplete: "email", type: "email", inputMode: "email", maxLength: 254 })}
          {text("phone", "Phone", { autoComplete: "tel", type: "tel", inputMode: "tel", maxLength: 40 })}
        </div>
      </Section>

      <Section
        title="Where you live"
        intro="Your home address. We need your state of residence for the securities filings that follow a sale."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">{text("address1", "Street address", { autoComplete: "address-line1", maxLength: 120 })}</div>
          <div className="md:col-span-2">
            {text("address2", "Apartment, suite or unit", { autoComplete: "address-line2", maxLength: 120, optional: true })}
          </div>
          {text("city", "City", { autoComplete: "address-level2", maxLength: 80 })}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="state">State</Label>
              <Select name="state" defaultValue={defaults.state || undefined}>
                <SelectTrigger
                  id="state"
                  className="mt-2 h-12! w-full bg-card px-4 text-base md:text-[15px]"
                  aria-invalid={invalid("state")}
                  aria-describedby={describedBy("state")}
                >
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {US_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="state-error" errors={errors.state} />
            </div>
            {text("postalCode", "ZIP code", { autoComplete: "postal-code", inputMode: "numeric", maxLength: 12 })}
          </div>
        </div>
      </Section>

      <Section
        title="Investor status"
        intro="This offering is open to accredited investors and to a small number of sophisticated investors. Choose the one that describes you. You do not need to send proof."
      >
        <RadioGroup
          name="investorStatus"
          value={status}
          onValueChange={setStatus}
          aria-label="Investor status"
          aria-invalid={invalid("investorStatus")}
          aria-describedby={describedBy("investorStatus")}
          className="gap-3"
        >
          {INVESTOR_STATUS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-4 border border-line p-4 transition-colors hover:border-foreground has-data-checked:border-primary has-data-checked:bg-cream md:p-5"
            >
              <RadioGroupItem value={option.value} className="mt-1" />
              <span className="flex flex-col gap-1">
                <span className="font-medium">{option.label}</span>
                <span className="text-sm text-muted-foreground">{option.help}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
        <FieldError id="investorStatus-error" errors={errors.investorStatus} />

        {selected ? (
          <fieldset className="mt-6 flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">Which of these applies to you?</legend>
            <RadioGroup
              // A new status starts with no basis chosen.
              key={selected.value}
              name="statusBasis"
              defaultValue={defaults.investorStatus === selected.value ? defaults.statusBasis : undefined}
              aria-invalid={invalid("statusBasis")}
              aria-describedby={describedBy("statusBasis")}
              className="gap-1"
            >
              {selected.bases.map((basis) => (
                <label key={basis.value} className="flex cursor-pointer gap-3 py-2 text-[15px] leading-snug">
                  <RadioGroupItem value={basis.value} className="mt-0.5" />
                  <span>{basis.label}</span>
                </label>
              ))}
            </RadioGroup>
            <FieldError id="statusBasis-error" errors={errors.statusBasis} />
          </fieldset>
        ) : null}
      </Section>

      <Section title="Confirmations" intro="Both are required by the rules for private offerings like this one.">
        <div className="flex flex-col gap-5">
          <Confirm
            name="relationshipConfirmed"
            defaultChecked={defaults.relationshipConfirmed === "on"}
            invalid={invalid("relationshipConfirmed")}
            errors={errors.relationshipConfirmed}
          >
            I have a pre-existing personal or business relationship with Vaulted or its founders.
          </Confirm>
          <Confirm
            name="badActorConfirmed"
            defaultChecked={defaults.badActorConfirmed === "on"}
            invalid={invalid("badActorConfirmed")}
            errors={errors.badActorConfirmed}
          >
            I confirm I am not subject to any disqualifying event (criminal conviction, regulatory order, or similar bad
            actor event) under Rule 506(d).
          </Confirm>
        </div>
      </Section>

      <Section
        title="Signature"
        intro="Type your full name to sign. It has the same effect as signing on paper and confirms that your answers are true."
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {text("signatureName", "Full name", { autoComplete: "name", maxLength: 120 })}
          {text("signatureDate", "Date", { type: "date", maxLength: 10 })}
        </div>
      </Section>

      <div className="flex flex-col gap-3 border-t border-line pt-8">
        <SubmitButton pendingLabel="Saving..." className="self-start">
          Sign and continue
        </SubmitButton>
        <p className="text-[13px] text-muted-foreground">You can only submit this once. Email us if something changes later.</p>
      </div>
    </form>
  );
}

function Section({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="font-serif text-2xl leading-tight md:text-3xl">{title}</legend>
      <p className="mt-2 max-w-[40em] text-[15px] text-muted-foreground">{intro}</p>
      <div className="mt-6">{children}</div>
    </fieldset>
  );
}

function Confirm({
  name,
  defaultChecked,
  invalid,
  errors,
  children,
}: {
  name: QuestionnaireField;
  defaultChecked: boolean;
  invalid: true | undefined;
  errors?: string[];
  children: ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer gap-3 text-[15px] leading-snug">
        <Checkbox
          name={name}
          defaultChecked={defaultChecked}
          className="mt-0.5"
          aria-invalid={invalid}
          aria-describedby={errors ? `${name}-error` : undefined}
        />
        <span>{children}</span>
      </label>
      <FieldError id={`${name}-error`} errors={errors} />
    </div>
  );
}
