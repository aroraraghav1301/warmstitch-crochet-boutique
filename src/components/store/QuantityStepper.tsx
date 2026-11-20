import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  max,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  onChange: (n: number) => void;
  max: number | null;
  size?: "sm" | "md";
  label?: string;
}) {
  const upper = max == null ? 20 : Math.min(max, 20);
  const btn = cn(
    "inline-flex items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent",
    size === "sm" ? "size-8" : "size-10",
  );
  return (
    <div className="inline-flex items-center rounded-full border border-input bg-card" role="group" aria-label={label}>
      <button type="button" className={cn(btn, "rounded-l-full")} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Minus className="size-3.5" />
      </button>
      <span className={cn("min-w-8 text-center font-medium tabular-nums", size === "sm" ? "text-sm" : "text-base")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={cn(btn, "rounded-r-full")} onClick={() => onChange(value + 1)} disabled={value >= upper} aria-label="Increase quantity">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
