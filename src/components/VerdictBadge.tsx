import { cn } from "@/lib/utils";

interface VerdictBadgeProps {
  verdict: "ACCEPT" | "REVIEW" | "REJECT";
}

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const styles = {
    ACCEPT: "bg-success/15 text-success border-success/30",
    REVIEW: "bg-warning/15 text-warning border-warning/30",
    REJECT: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const icons = { ACCEPT: "✓", REVIEW: "⟳", REJECT: "✕" };

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-3 py-1 font-mono text-sm font-semibold tracking-wider", styles[verdict])}>
      {icons[verdict]} {verdict}
    </span>
  );
}
