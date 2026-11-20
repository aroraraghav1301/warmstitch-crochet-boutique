// Shared, browser-safe catalog types and helpers.

export const CATEGORIES = [
  { value: "wearables", label: "Wearables" },
  { value: "amigurumi", label: "Amigurumi & Toys" },
  { value: "home-decor", label: "Home Decor" },
  { value: "accessories", label: "Accessories" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];
export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORY_VALUES as string[]).includes(value);
}

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  materials: string;
  images: string[];
  colors: string[];
  price: number;
  sale_price: number | null;
  stock: number;
  made_to_order: boolean;
  sold_out: boolean;
  popularity: number;
  created_at: string;
};

export type StockStatus = "in-stock" | "made-to-order" | "sold-out";

export function stockStatus(p: Pick<Product, "stock" | "made_to_order" | "sold_out">): StockStatus {
  if (p.sold_out) return "sold-out";
  if (p.made_to_order) return "made-to-order";
  return p.stock > 0 ? "in-stock" : "sold-out";
}

export const STOCK_LABEL: Record<StockStatus, string> = {
  "in-stock": "In Stock",
  "made-to-order": "Made to Order",
  "sold-out": "Sold Out",
};

/** Max quantity a shopper may add; null = unlimited (made to order). */
export function maxQuantity(p: Pick<Product, "stock" | "made_to_order" | "sold_out">): number | null {
  const s = stockStatus(p);
  if (s === "sold-out") return 0;
  if (s === "made-to-order") return null;
  return p.stock;
}

/** Resize Unsplash photos; leave other URLs untouched. */
export function imageUrl(url: string | undefined, width = 800) {
  if (!url) return "";
  if (url.startsWith("https://images.unsplash.com/")) {
    const base = url.split("?")[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=80`;
  }
  return url;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 80);
}
