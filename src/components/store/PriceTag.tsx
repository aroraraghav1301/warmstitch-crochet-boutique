import { cn } from "@/lib/utils";
import { formatMoney, unitPrice } from "@/lib/pricing";

export function PriceTag({
  price,
  salePrice,
  size = "md",
  className,
}: {
  price: number;
  salePrice: number | null;
  size?: "md" | "lg";
  className?: string;
}) {
  const current = unitPrice({ price, sale_price: salePrice });
  const onSale = current < price;
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-semibold text-foreground", size === "lg" ? "text-2xl" : "text-lg", onSale && "text-primary")}>
        {formatMoney(current)}
      </span>
      {onSale && (
        <span className={cn("text-muted-foreground line-through", size === "lg" ? "text-base" : "text-sm")}>
          {formatMoney(price)}
        </span>
      )}
    </div>
  );
}
