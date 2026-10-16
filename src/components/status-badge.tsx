import { Badge } from "@/components/ui";
import { nl } from "@/lib/nl";
import { CheckCircle2, Clock, AlertTriangle, Circle } from "lucide-react";

type Status = keyof typeof nl.status;

export function StatusBadge({ status }: { status: Status }) {
  const tone = ({ OPEN: "neutral", SUBMITTED: "warn", APPROVED: "brand", DISPUTED: "danger" } as const)[status];
  const Icon = { OPEN: Circle, SUBMITTED: Clock, APPROVED: CheckCircle2, DISPUTED: AlertTriangle }[status];
  return (
    <Badge tone={tone}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {nl.status[status]}
    </Badge>
  );
}

/** Summary status for a fixture based on its matches. */
export function fixtureStatus(statuses: string[]): Status {
  if (statuses.some((s) => s === "DISPUTED")) return "DISPUTED";
  if (statuses.length > 0 && statuses.every((s) => s === "APPROVED")) return "APPROVED";
  if (statuses.some((s) => s === "SUBMITTED" || s === "APPROVED")) return "SUBMITTED";
  return "OPEN";
}
