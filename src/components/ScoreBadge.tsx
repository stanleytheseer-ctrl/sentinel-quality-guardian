import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const color =
    score >= 75
      ? "text-success border-success/30 bg-success/10"
      : score >= 50
      ? "text-warning border-warning/30 bg-warning/10"
      : "text-destructive border-destructive/30 bg-destructive/10";

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-3xl font-bold", color, className)}>
      {score}
      <span className="text-sm font-medium opacity-70">/100</span>
    </div>
  );
}
