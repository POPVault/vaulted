"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { subscribe, type SubscribeState } from "@/actions/subscribe";
import { FieldError } from "@/components/invest/field-error";
import { SubmitButton } from "@/components/invest/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, formatUnits } from "@/lib/format";

type SubscribeFormProps = {
  pricePerUnitCents: number;
  remaining: number;
};

export function SubscribeForm({ pricePerUnitCents, remaining }: SubscribeFormProps) {
  const [state, action] = useActionState<SubscribeState, FormData>(subscribe, { status: "idle" });
  return (
    <SubscribeFields
      key={state.submissionId ?? "initial"}
      action={action}
      state={state}
      pricePerUnitCents={pricePerUnitCents}
      remaining={remaining}
    />
  );
}

function SubscribeFields({
  action,
  state,
  pricePerUnitCents,
  remaining,
}: SubscribeFormProps & { action: (formData: FormData) => void; state: SubscribeState }) {
  const [units, setUnits] = useState(state.values?.units ?? "");
  const n = /^\d+$/.test(units.trim()) ? Number(units.trim()) : 0;
  const total = n >= 1 ? n * pricePerUnitCents : 0;
  // Hide the server error once the investor edits the value it was about.
  const unitsError = units === (state.values?.units ?? "") ? state.fieldErrors?.units : undefined;

  return (
    <form action={action} noValidate className="flex flex-col gap-8 border border-line bg-card p-6 md:p-10">
      {state.status === "error" && state.message ? (
        <div role="alert" className="flex flex-col gap-2 border-l-2 border-destructive pl-4 text-[15px] text-destructive">
          <p>{state.message}</p>
          {state.documentsLink ? (
            <p>
              <Link href="/invest#documents" className="underline">
                Go to the offering documents
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
        <div>
          <Label htmlFor="units">Number of units</Label>
          <Input
            id="units"
            name="units"
            type="number"
            inputMode="numeric"
            min={1}
            max={remaining}
            step={1}
            required
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className="tabular mt-2"
            aria-invalid={unitsError ? true : undefined}
            aria-describedby={unitsError ? "units-help units-error" : "units-help"}
          />
          <p id="units-help" className="tabular mt-2 text-[13px] text-muted-foreground">
            {formatUnits(remaining)} {remaining === 1 ? "unit" : "units"} remaining, {formatMoney(pricePerUnitCents)} each.
          </p>
          <FieldError id="units-error" errors={unitsError} />
        </div>
        <div className="border-t border-line pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <p className="text-sm text-muted-foreground">You will wire</p>
          <output htmlFor="units" aria-live="polite" className="mt-1 block font-serif text-4xl leading-none md:text-5xl">
            {formatMoney(total)}
          </output>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SubmitButton pendingLabel="Sending request..." className="self-start">
          Request units
        </SubmitButton>
        <p className="max-w-[40em] text-[13px] text-muted-foreground">
          This sends a request. Your units are held for you once you sign the subscription agreement and your wire
          arrives. Nothing is charged online.
        </p>
      </div>
    </form>
  );
}
