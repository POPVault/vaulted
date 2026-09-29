"use client";

import { useActionState } from "react";
import { updatePhase, type AdminActionState } from "@/actions/admin";
import { SubmitButton } from "@/components/invest/submit-button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Phase } from "@/components/invest/status-badge";
import { ActionNotice } from "./action-notice";

const OPTIONS: { value: Phase; label: string; hint: string }[] = [
  { value: "preview", label: "Preview", hint: "Investors see the offering and can register interest." },
  { value: "open", label: "Open", hint: "Investors can complete the questionnaire and subscribe." },
  { value: "closed", label: "Closed", hint: "The offering page says it is closed. Nothing can be submitted." },
];

export function PhaseForm({ phase }: { phase: Phase }) {
  const [state, action] = useActionState<AdminActionState, FormData>(updatePhase, {
    status: "idle",
    message: null,
  });

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">Phase</legend>
        <RadioGroup name="phase" defaultValue={phase} className="gap-3" aria-label="Phase">
          {OPTIONS.map((option) => (
            <div key={option.value} className="flex items-start gap-3">
              <RadioGroupItem value={option.value} id={`phase-${option.value}`} className="mt-1" />
              <Label htmlFor={`phase-${option.value}`} className="flex flex-col items-start gap-0.5 font-normal">
                <span className="font-medium">{option.label}</span>
                <span className="text-[13px] text-muted-foreground">{option.hint}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>
      <div className="flex flex-col gap-3">
        <SubmitButton size="sm" pendingLabel="Saving..." className="self-start">
          Save phase
        </SubmitButton>
        <ActionNotice state={state} />
      </div>
    </form>
  );
}
