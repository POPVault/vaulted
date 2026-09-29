"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Copies an investor's personal link for the admin. The only copy control in the app. */
export function CopyLinkButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2000);
  }

  return (
    <Button type="button" size="xs" variant="outline" onClick={copy} aria-label={`Copy ${label}`}>
      <span aria-live="polite">{copied === "copied" ? "Copied" : copied === "failed" ? "Select and copy" : "Copy"}</span>
    </Button>
  );
}
