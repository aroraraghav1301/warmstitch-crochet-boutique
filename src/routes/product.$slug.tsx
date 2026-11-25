import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/store/PriceTag";
import { ProductCard } from "@/components/store/ProductCard";
import { QuantityStepper } from "@/components/store/QuantityStepper";
import { StockBadge } from "@/components/store/StockBadge";
import { useCart } from "@/lib/cart";
import { categoryLabel, imageUrl, maxQuantity, stockStatus, type Product } from "@/lib/catalog";
import { discountPercent, unitPrice } from "@/lib/pricing";
import { productQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data.product) throw notFound();
    return { name: data.product.name, description: data.product.description, image: data.product.images[0] ?? null };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Item unavailable — WarmStitch" }, { name: "robots", content: "noindex" }] };
    }
    const desc = loaderData.description.slice(0, 155);
    const img = loaderData.image ? imageUrl(loaderData.image, 1200) : null;
    return {
      meta: [
        { title: `${loaderData.name} — WarmStitch` },
        { name: "description", content: desc },
        { property: "og:title", content: `${loaderData.name} — WarmStitch` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(img?.startsWith("https://")
          ? [
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
            ]
          : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-serif text-4xl">This piece has unraveled</h1>
      <p className="mt-3 text-muted-foreground">We couldn't find that item. It may have been retired from the shop.</p>
      <Button asChild className="mt-6 rounded-full"><Link to="/">Back to the shop</Link></Button>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  return <ProductDetail key={data.product!.id} data={data} />;
}

function ProductDetail({ data }: { data: { product: Product | null; related: Product[] } }) {
  const product = data.product!;
  const { addItem } = useCart();
  const [active, setActive] = useState(0);
  const [color, setColor] = useState<string | null>(product.colors[0] ?? null);
  const [qty, setQty] = useState(1);

  const status = stockStatus(product);
  const max = maxQuantity(product);
  const soldOut = status === "sold-out";
  const off = discountPercent(product);
  const images = product.images.length ? product.images : [""];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" hash="collection" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to collection
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* Gallery */}
        <div className="flex flex-col-reverse gap-4 sm:flex-row">
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0" role="tablist" aria-label="Product photos">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Photo ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "size-20 shrink-0 overflow-hidden rounded-xl border-2 bg-linen transition-all",
                  i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <img src={imageUrl(src, 200)} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-border bg-linen shadow-soft">
            <img
              src={imageUrl(images[active], 1200)}
              alt={`${product.name} — photo ${active + 1}`}
              className={cn("aspect-[4/5] size-full object-cover", soldOut && "opacity-70")}
            />
            {off > 0 && (
              <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                Save {off}%
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-7">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage">{categoryLabel(product.category)}</p>
            <h1 className="font-serif text-3xl leading-tight sm:text-5xl">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <PriceTag price={product.price} salePrice={product.sale_price} size="lg" />
              <StockBadge status={status} />
            </div>
            {status === "in-stock" && product.stock <= 5 && (
              <p className="text-sm font-medium text-primary">Only {product.stock} left in the studio</p>
            )}
            {status === "made-to-order" && (
              <p className="text-sm text-muted-foreground">Hooked just for you — ships in 1–2 weeks.</p>
            )}
          </div>

          <p className="leading-relaxed text-foreground/85">{product.description}</p>

          {product.colors.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                Color: <span className="font-normal text-muted-foreground">{color}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-pressed={color === c}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-colors",
                      color === c ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={max} />
            <Button
              size="lg"
              disabled={soldOut}
              className="flex-1 rounded-full text-base"
              onClick={() =>
                addItem({
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  image: product.images[0] ?? "",
                  color,
                  unitPrice: unitPrice(product),
                  regularPrice: product.price,
                  quantity: qty,
                  maxQty: max,
                })
              }
            >
              <ShoppingBag className="size-5" /> {soldOut ? "Sold Out" : "Add to Bag"}
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-serif text-lg">Yarn & materials</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.materials || "Details coming soon."}</p>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="size-4 text-sage" /> Free shipping, wrapped by hand in tissue.
          </p>
        </div>
      </div>

      {data.related.length > 0 && (
        <section className="mt-14 sm:mt-24">
          <h2 className="font-serif text-2xl sm:text-3xl">You might also love</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {data.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
