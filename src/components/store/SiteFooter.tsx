import { Link } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/catalog";
import { Logo } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-linen">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Small-batch crochet pieces, hooked by hand in our home studio with natural fibers and a lot of tea.
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-serif text-lg">Shop</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {CATEGORIES.map((c) => (
              <li key={c.value}>
                <Link to="/" search={{ category: c.value }} hash="collection" className="hover:text-foreground">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-serif text-lg">Our promise</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Free shipping on every order</li>
            <li>Gift wrapping with a handwritten note</li>
            <li>Natural, skin-friendly yarns</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} WarmStitch · Handmade with warmth
      </div>
    </footer>
  );
}
