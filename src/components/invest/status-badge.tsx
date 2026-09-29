import { Badge } from "@/components/ui/badge";

export type Phase = "preview" | "open" | "closed";
export type InvestorStatus = "funded" | "signed" | "accepted" | "requested" | "interested" | "none";

const LABELS: Record<Phase | InvestorStatus, string> = {
  preview: "Preview",
  open: "Open",
  closed: "Closed",
  funded: "Funded",
  signed: "Signed",
  accepted: "Accepted",
  requested: "Requested",
  interested: "Interested",
  none: "No activity",
};

export function statusLabel(value: Phase | InvestorStatus): string {
  return LABELS[value];
}

export function PhaseBadge({ phase }: { phase: Phase }) {
  return <Badge variant={phase === "open" ? "accent" : "outline"}>{statusLabel(phase)}</Badge>;
}

export function StatusBadge({ status }: { status: InvestorStatus }) {
  return <Badge variant={status === "none" ? "outline" : "accent"}>{statusLabel(status)}</Badge>;
}
