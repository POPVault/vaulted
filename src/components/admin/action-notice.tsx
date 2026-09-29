import type { AdminActionState } from "@/actions/admin";
import { cn } from "@/lib/utils";

/** The result of an admin action in plain language. Always rendered, so screen readers hear changes. */
export function ActionNotice({ state, className }: { state: AdminActionState; className?: string }) {
  return (
    <div aria-live="polite" className={cn(!state.message && "sr-only", className)}>
      {state.message ? (
        <p
          className={cn(
            "text-[13px] font-medium whitespace-normal",
            state.status === "error" ? "text-destructive" : "text-foreground",
          )}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
