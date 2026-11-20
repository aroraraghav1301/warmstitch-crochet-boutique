import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HandHeart, Leaf, Sparkles, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from "@/components/store/ProductCard";
import { CATEGORIES, categoryLabel, imageUrl, isCategory, type Category } from "@/lib/catalog";
import { unitPrice } from "@/lib/pricing";
import { productsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

type ShopSearch = { category?: Category | undefined; q?: string | undefined; sort?: Sort | undefined };

const HERO_IMAGE = "https://images.unsplash.com/photo-1668072587859-f0f30c8fa938";
const HERO_SECOND = "https://images.unsplash.com/photo-1693387359607-f48d0a824b1e";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): ShopSearch => ({
    category: isCategory(s["category"]) ? s["category"] : undefined,
    q: typeof s["q"] === "string" && s["q"].trim() ? s["q"].trim().slice(0, 80) : undefined,
    sort: SORTS.some((x) => x.value === s["sort"]) ? (s["sort"] as Sort) : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  head: () => ({
    meta: [
      { title: "WarmStitch — Handmade crochet, one stitch at a time" },
      {
        name: "description",
        content: "Shop cozy handmade crochet blankets, amigurumi toys, granny square totes, beanies and home decor from the WarmStitch studio.",
      },
      { property: "og:title", content: "WarmStitch — Handmade with warmth" },
      { property: "og:description", content: "Cozy handmade crochet blankets, toys, totes and wearables." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: imageUrl(HERO_IMAGE, 1200) },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: imageUrl(HERO_IMAGE, 1200) },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Hero />
      <Promise />
      <Collection />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-weave">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:px-8">
        <div className="space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sage">
            <span className="size-1.5 rounded-full bg-primary" /> Small-batch · Hand-hooked
          </p>
          <h1 className="font-serif text-5xl leading-[1.04] text-foreground sm:text-6xl lg:text-7xl">
            Handmade with warmth, <em className="font-normal italic text-primary">one stitch</em> at a time.
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            Every blanket, bear and tote is crocheted by hand in our little studio — with soft natural fibers,
            patient hours, and the kind of care you can feel the moment you hold it.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7 text-base shadow-lift">
              <Link to="/" hash="collection">Shop Collection</Link>
            </Button>
            <Link to="/" search={{ category: "amigurumi" }} hash="collection" className="px-3 text-sm font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary">
              Meet the amigurumi →
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-border shadow-lift">
            <img src={imageUrl(HERO_IMAGE, 1100)} alt="Balls of soft cotton yarn in honey, sage and blush with a crochet hook" className="size-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-4 hidden w-44 overflow-hidden rounded-2xl border-4 border-background shadow-lift sm:block lg:-left-10 lg:w-52">
            <img src={imageUrl(HERO_SECOND, 500)} alt="A chunky patchwork crochet blanket in warm tones" className="aspect-square size-full object-cover" />
          </div>
          <div className="absolute -right-2 top-6 rotate-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft sm:-right-6">
            <p className="font-serif text-2xl leading-none text-primary">14 hrs</p>
            <p className="text-xs text-muted-foreground">to hook one blanket</p>
          </div>
        </div>
      </div>
      <div className="stitch-divider mx-auto max-w-7xl" />
    </section>
  );
}

function Promise() {
  const items = [
    { icon: HandHeart, title: "Made by hand", text: "No machines — every stitch is worked with a hook and two hands." },
    { icon: Leaf, title: "Natural fibers", text: "Merino, cotton and recycled cord chosen for softness and longevity." },
    { icon: Sparkles, title: "Gift-ready", text: "Wrapped in tissue with your handwritten note, shipped free." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 rounded-2xl bg-linen p-6">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-soft">
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Collection() {
  const { data: products } = useSuspenseQuery(productsQuery());
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const sort: Sort = search.sort ?? "popular";

  const visible = useMemo(() => {
    const term = search.q?.toLowerCase();
    const list = products.filter((p) => {
      if (search.category && p.category !== search.category) return false;
      if (term) {
        const hay = `${p.name} ${p.description} ${p.materials} ${categoryLabel(p.category)}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => unitPrice(a) - unitPrice(b));
    else if (sort === "price-desc") sorted.sort((a, b) => unitPrice(b) - unitPrice(a));
    else if (sort === "newest") sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else sorted.sort((a, b) => b.popularity - a.popularity);
    return sorted;
  }, [products, search.category, search.q, sort]);

  const pills: { value: Category | undefined; label: string }[] = [
    { value: undefined, label: "All" },
    ...CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
  ];

  return (
    <section id="collection" className="mx-auto max-w-7xl scroll-mt-28 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage">The collection</p>
          <h2 className="mt-2 font-serif text-4xl">
            {search.category ? categoryLabel(search.category) : "Everything handmade"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="sort" className="text-sm text-muted-foreground">Sort by</label>
          <Select value={sort} onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, sort: v as Sort }), resetScroll: false })}>
            <SelectTrigger id="sort" className="w-48 rounded-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
        {pills.map((p) => {
          const active = search.category === p.value;
          return (
            <button
              key={p.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => navigate({ search: (prev) => ({ ...prev, category: p.value }), resetScroll: false })}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/50",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {search.q && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-linen px-3 py-1.5 text-sm">
          Results for “{search.q}”
          <button type="button" aria-label="Clear search" className="rounded-full p-0.5 hover:bg-card" onClick={() => navigate({ search: (prev) => ({ ...prev, q: undefined }), resetScroll: false })}>
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="font-serif text-2xl">Nothing on the hook here yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Try another category or search term.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
