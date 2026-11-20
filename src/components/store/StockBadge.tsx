import { cn } from "@/lib/utils";
import { STOCK_LABEL, type StockStatus } from "@/lib/catalog";

const styles: Record<StockStatus, string> = {
  "in-stock": "bg-sage-soft text-secondary-foreground",
  "made-to-order": "bg-accent text-accent-foreground",
  "sold-out": "bg-muted text-muted-foreground line-through decoration-1",
};

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        styles[status],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "in-stock" && "bg-sage",
          status === "made-to-order" && "bg-primary",
          status === "sold-out" && "bg-muted-foreground",
        )}
      />
      {STOCK_LABEL[status]}
    </span>
  );
}
