"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { investorRowAction, type AdminActionState } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import type { StatusAction } from "@/db/schema";
import { ActionNotice } from "./action-notice";

const LABELS: Record<StatusAction, string> = {
  set_accepted: "Accept",
  clear_accepted: "Undo accept",
  set_signed: "Mark signed",
  clear_signed: "Undo signed",
  set_funded: "Mark funded",
  clear_funded: "Undo funded",
  cancel: "Cancel",
  uncancel: "Restore",
};

const FORWARD = new Set<StatusAction>(["set_accepted", "set_signed", "set_funded", "uncancel"]);

type RowActionsProps = {
  investorId: number;
  investorName: string;
  subscriptionId: number | null;
  actions: StatusAction[];
  revoked: boolean;
};

export function RowActions({ investorId, investorName, subscriptionId, actions, revoked }: RowActionsProps) {
  const [state, action] = useActionState<AdminActionState, FormData>(investorRowAction, {
    status: "idle",
    message: null,
  });

  return (
    <div className="flex w-[15rem] flex-col gap-2">
      {subscriptionId !== null && actions.length > 0 ? (
        <form action={action} className="flex flex-wrap gap-1.5">
          <input type="hidden" name="subscriptionId" value={subscriptionId} />
          <StatusButtons actions={actions} name={investorName} />
        </form>
      ) : null}
      {revoked ? null : (
        <details className="group text-sm">
          <summary className="cursor-pointer text-[13px] text-muted-foreground underline-offset-4 hover:underline">
            Revoke link
          </summary>
          <form action={action} className="mt-2 flex flex-col items-start gap-2">
            <input type="hidden" name="investorId" value={investorId} />
            <p className="text-[13px] whitespace-normal text-muted-foreground">
              Their link and session stop working immediately. This cannot be undone.
            </p>
            <RevokeButton name={investorName} />
          </form>
        </details>
      )}
      <ActionNotice state={state} />
    </div>
  );
}

function StatusButtons({ actions, name }: { actions: StatusAction[]; name: string }) {
  const { pending, data } = useFormStatus();
  const active = pending ? data?.get("action") : null;
  return actions.map((a) => (
    <Button
      key={a}
      type="submit"
      name="action"
      value={a}
      size="xs"
      variant={FORWARD.has(a) ? "default" : a === "cancel" ? "destructive" : "outline"}
      disabled={pending}
      aria-label={`${LABELS[a]}: ${name}`}
    >
      {active === a ? "Saving..." : LABELS[a]}
    </Button>
  ));
}

function RevokeButton({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" name="action" value="revoke" size="xs" variant="destructive" disabled={pending} aria-label={`Revoke link for ${name}`}>
      {pending ? "Revoking..." : "Confirm revoke"}
    </Button>
  );
}
