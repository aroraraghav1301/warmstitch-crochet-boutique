import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryLabel, imageUrl, maxQuantity, stockStatus, type Product } from "@/lib/catalog";
import { discountPercent, unitPrice } from "@/lib/pricing";
import { useCart } from "@/lib/cart";
import { PriceTag } from "./PriceTag";
import { StockBadge } from "./StockBadge";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const status = stockStatus(product);
  const off = discountPercent(product);
  const soldOut = status === "sold-out";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block aspect-[4/5] overflow-hidden bg-linen">
        <img
          src={imageUrl(product.images[0], 700)}
          alt={product.name}
          loading="lazy"
          className={cn(
            "size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]",
            soldOut && "opacity-60 grayscale-[35%]",
          )}
        />
        {off > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-soft">
            −{off}% Sale
          </span>
        )}
        <StockBadge status={status} className="absolute bottom-3 left-3 bg-card/90 backdrop-blur" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sage">{categoryLabel(product.category)}</p>
        <Link to="/product/$slug" params={{ slug: product.slug }} className="font-serif text-xl leading-snug text-foreground hover:text-primary">
          {product.name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <PriceTag price={product.price} salePrice={product.sale_price} />
          <Button
            size="sm"
            variant={soldOut ? "outline" : "default"}
            disabled={soldOut}
            className="rounded-full"
            onClick={() =>
              addItem({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                image: product.images[0] ?? "",
                color: product.colors[0] ?? null,
                unitPrice: unitPrice(product),
                regularPrice: product.price,
                quantity: 1,
                maxQty: maxQuantity(product),
              })
            }
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to cart`}
          >
            {soldOut ? "Sold Out" : (
              <>
                <ShoppingBag className="size-4" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
