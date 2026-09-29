"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerInterest, type InterestedState } from "@/actions/interested";
import { FieldError } from "@/components/invest/field-error";
import { SubmitButton } from "@/components/invest/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, formatUnits } from "@/lib/format";
import { INTEREST_MAX_UNITS, INTEREST_NOTE_MAX } from "@/lib/validation/interested";

type InterestedFormProps = {
  pricePerUnitCents: number;
  /** The investor's saved interest, if any. */
  initial: { units: number; note: string } | null;
};

/** Units typed so far as a whole number, or null while it is not one. */
function wholeUnits(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value.trim());
  return n >= 1 && n <= INTEREST_MAX_UNITS ? n : null;
}

export function InterestedForm({ pricePerUnitCents, initial }: InterestedFormProps) {
  const [state, action] = useActionState<InterestedState, FormData>(registerInterest, { status: "idle" });
  // Which response the investor has dismissed with "Change the amount".
  const [dismissed, setDismissed] = useState<number | undefined>(undefined);

  const showSuccess = state.status === "success" && state.saved && dismissed !== state.submissionId;
  if (showSuccess && state.saved) {
    return (
      <div role="status" className="flex flex-col gap-6 border border-line bg-card p-6 md:p-10">
        <p className="font-serif text-3xl leading-tight md:text-4xl">
          Thanks, we have noted your interest in {formatUnits(state.saved.units)}{" "}
          {state.saved.units === 1 ? "unit" : "units"} ({formatMoney(state.saved.amountCents)}). We will email you when
          the offering opens.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button asChild>
            <Link href="/invest/holdings">Go to My holdings</Link>
          </Button>
          <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={() => {
              setDismissed(state.submissionId);
            }}
          >
            Change the amount
          </Button>
        </div>
      </div>
    );
  }

  const defaults = {
    units: state.values?.units ?? (initial ? String(initial.units) : ""),
    note: state.values?.note ?? initial?.note ?? "",
  };

  return (
    <InterestedFields
      // Remount after each response so fields refill with what was sent.
      key={state.submissionId ?? "initial"}
      action={action}
      state={state}
      defaults={defaults}
      pricePerUnitCents={pricePerUnitCents}
      isUpdate={initial !== null || state.status === "success"}
    />
  );
}

function InterestedFields({
  action,
  state,
  defaults,
  pricePerUnitCents,
  isUpdate,
}: {
  action: (formData: FormData) => void;
  state: InterestedState;
  defaults: { units: string; note: string };
  pricePerUnitCents: number;
  isUpdate: boolean;
}) {
  const [units, setUnits] = useState(defaults.units);
  const whole = wholeUnits(units);
  // Hide the server error once the investor edits the value it was about.
  const unitsError = units === (state.values?.units ?? "") ? state.fieldErrors?.units : undefined;
  const noteError = state.fieldErrors?.note;

  return (
    <form action={action} noValidate className="flex flex-col gap-8 border border-line bg-card p-6 md:p-10">
      {state.status === "error" && state.message ? (
        <p role="alert" className="border-l-2 border-destructive pl-4 text-[15px] text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
        <div>
          <Label htmlFor="units">How many units might you want?</Label>
          <Input
            id="units"
            name="units"
            type="number"
            inputMode="numeric"
            min={1}
            max={INTEREST_MAX_UNITS}
            step={1}
            required
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className="tabular mt-2"
            aria-invalid={unitsError ? true : undefined}
            aria-describedby={unitsError ? "units-help units-error" : "units-help"}
          />
          <p id="units-help" className="mt-2 text-[13px] text-muted-foreground">
            Whole units, {formatMoney(pricePerUnitCents)} each.
          </p>
          <FieldError id="units-error" errors={unitsError} />
        </div>
        <div className="border-t border-line pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <p className="text-sm text-muted-foreground">Total</p>
          <output htmlFor="units" aria-live="polite" className="mt-1 block font-serif text-4xl leading-none md:text-5xl">
            {whole === null ? formatMoney(0) : formatMoney(whole * pricePerUnitCents)}
          </output>
        </div>
      </div>

      <div>
        <Label htmlFor="note">Anything we should know? (optional)</Label>
        <Textarea
          id="note"
          name="note"
          maxLength={INTEREST_NOTE_MAX}
          defaultValue={defaults.note}
          className="mt-2"
          aria-invalid={noteError ? true : undefined}
          aria-describedby={noteError ? "note-error" : undefined}
        />
        <FieldError id="note-error" errors={noteError} />
      </div>

      <div className="flex flex-col gap-3">
        <SubmitButton pendingLabel="Saving..." className="self-start">
          {isUpdate ? "Update my interest" : "Save my interest"}
        </SubmitButton>
        <p className="text-[13px] text-muted-foreground">
          This is not a commitment and nothing is charged. You can change it until the offering opens.
        </p>
      </div>
    </form>
  );
}
