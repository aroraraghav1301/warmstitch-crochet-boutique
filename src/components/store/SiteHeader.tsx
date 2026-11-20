import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, ShoppingBag } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { CATEGORIES, isCategory, type Category } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2", className)} aria-label="WarmStitch home">
      <svg viewBox="0 0 32 32" className="size-8 text-primary" aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M6 13c5 3 15 3 20 0M5 19c6 3.5 16 3.5 22 0M12 4c-3 7-3 17 0 24M20 4c3 7 3 17 0 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
        <path d="M26 24c2 1.5 3 3 3 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-serif text-2xl font-semibold tracking-tight text-foreground">
        Warm<span className="italic text-primary">Stitch</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const { count, setOpen, hydrated } = useCart();
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as { category?: string; q?: string } });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState(search.q ?? "");

  useEffect(() => {
    setQ(search.q ?? "");
  }, [search.q]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate({
      to: "/",
      search: { q: term || undefined, category: isCategory(search.category) ? search.category : undefined },
      hash: "collection",
    });
  }

  const activeCat = pathname === "/" ? (search.category ?? "all") : null;
  const navItems = [{ value: "all", label: "All" }, ...CATEGORIES];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Categories">
          {navItems.map((c) => (
            <Link
              key={c.value}
              to="/"
              search={c.value === "all" ? {} : { category: c.value as Category }}
              hash="collection"
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                activeCat === c.value && "bg-terracotta-soft text-accent-foreground",
              )}
            >
              {c.label}
            </Link>
          ))}
        </nav>
        <form onSubmit={onSearch} className="ml-auto hidden w-full max-w-xs items-center md:flex" role="search">
          <label htmlFor="site-search" className="sr-only">Search the shop</label>
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="site-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search blankets, bears, totes…"
              maxLength={80}
              className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </form>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative ml-auto inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted md:ml-2"
          aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
        >
          <ShoppingBag className="size-5" />
          {hydrated && count > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </div>
      {/* Mobile: search + categories */}
      <div className="border-t border-border px-4 pb-3 pt-2 lg:hidden">
        <form onSubmit={onSearch} className="mb-2 md:hidden" role="search">
          <label htmlFor="site-search-mobile" className="sr-only">Search the shop</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="site-search-mobile"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the shop"
              maxLength={80}
              className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
        </form>
        <nav className="-mx-1 flex gap-1 overflow-x-auto" aria-label="Categories">
          {navItems.map((c) => (
            <Link
              key={c.value}
              to="/"
              search={c.value === "all" ? {} : { category: c.value as Category }}
              hash="collection"
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground",
                activeCat === c.value && "bg-terracotta-soft text-accent-foreground",
              )}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
