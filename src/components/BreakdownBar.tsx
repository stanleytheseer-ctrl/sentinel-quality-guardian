import { cn } from "@/lib/utils";

interface BreakdownBarProps {
  label: string;
  value: number;
  max?: number;
  inverted?: boolean;
}

export function BreakdownBar({ label, value, max = 100, inverted = false }: BreakdownBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const displayValue = inverted ? value : value;

  const barColor = inverted
    ? value <= 10 ? "bg-success" : value <= 25 ? "bg-warning" : "bg-destructive"
    : value >= 75 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-secondary-foreground capitalize">{label}</span>
        <span className="font-mono text-muted-foreground">{displayValue}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
