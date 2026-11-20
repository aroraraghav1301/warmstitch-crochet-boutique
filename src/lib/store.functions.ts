import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { Product } from "./catalog";
import { stockStatus } from "./catalog";
import { computeTotals, unitPrice, type CouponRule } from "./pricing";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const { data, error } = await publicClient()
    .from("products")
    .select("*")
    .order("popularity", { ascending: false });
  if (error) throw new Error("Could not load products");
  return (data ?? []) as Product[];
});

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }): Promise<{ product: Product | null; related: Product[] }> => {
    const sb = publicClient();
    const { data: product, error } = await sb.from("products").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw new Error("Could not load product");
    if (!product) return { product: null, related: [] };
    const { data: related } = await sb
      .from("products")
      .select("*")
      .neq("id", product.id)
      .order("popularity", { ascending: false })
      .limit(4);
    return { product: product as Product, related: (related ?? []) as Product[] };
  });

const couponCodeSchema = z.string().trim().min(1).max(40);

export const checkCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => z.object({ code: couponCodeSchema }).parse(input))
  .handler(async ({ data }): Promise<{ ok: true; coupon: CouponRule } | { ok: false }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("coupons")
      .select("code, discount_type, value, active")
      .ilike("code", data.code.toUpperCase())
      .maybeSingle();
    if (!row || !row.active) return { ok: false };
    return {
      ok: true,
      coupon: { code: row.code, discount_type: row.discount_type as CouponRule["discount_type"], value: Number(row.value) },
    };
  });

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        color: z.string().trim().max(60).optional().nullable(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(25),
  couponCode: couponCodeSchema.optional().nullable(),
  customer: z.object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    line1: z.string().trim().min(1, "Address is required").max(200),
    line2: z.string().trim().max(200).optional().nullable(),
    city: z.string().trim().min(1, "City is required").max(100),
    state: z.string().trim().min(1, "State / region is required").max(100),
    postalCode: z.string().trim().min(1, "Postal code is required").max(20),
    country: z.string().trim().min(1, "Country is required").max(100),
  }),
  note: z.string().trim().max(1000).optional().nullable(),
  paymentMethod: z.enum(["cod", "upi"]).default("cod"),
});

export type PlaceOrderInput = z.infer<typeof orderSchema>;

export type OrderItem = {
  productId: string;
  name: string;
  slug: string;
  image: string;
  color: string | null;
  quantity: number;
  unitPrice: number;
  regularPrice: number;
  lineTotal: number;
};

export type PlacedOrder = {
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  total: number;
  customerName: string;
  customerEmail: string;
  note: string | null;
  emailSent: boolean;
  paymentMethod: "cod" | "upi";
  paymentStatus: "unpaid" | "paid";
  upiId: string | null;
};

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: PlaceOrderInput) => orderSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; order: PlacedOrder } | { ok: false; error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let upiId: string | null = null;
    if (data.paymentMethod === "upi") {
      const { data: setting } = await (supabaseAdmin as any)
        .from("app_settings")
        .select("value")
        .eq("key", "upi_id")
        .maybeSingle();
      upiId = typeof setting?.value === "string" && setting.value.trim() ? setting.value.trim() : null;
      if (!upiId) return { ok: false, error: "Instant pay isn't set up yet — please choose cash on delivery." };
    }

    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: rows, error } = await supabaseAdmin.from("products").select("*").in("id", ids);
    if (error) return { ok: false, error: "We couldn't load your items. Please try again." };
    const products = new Map((rows ?? []).map((p) => [p.id, p as Product]));

    // Combine quantities per product for stock checks.
    const qtyByProduct = new Map<string, number>();
    for (const i of data.items) qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) ?? 0) + i.quantity);

    for (const [id, qty] of qtyByProduct) {
      const p = products.get(id);
      if (!p) return { ok: false, error: "One of the items in your bag is no longer available." };
      const status = stockStatus(p);
      if (status === "sold-out") return { ok: false, error: `${p.name} is sold out.` };
      if (status === "in-stock" && qty > p.stock)
        return { ok: false, error: `Only ${p.stock} of ${p.name} left — please lower the quantity.` };
    }

    const items: OrderItem[] = data.items.map((i) => {
      const p = products.get(i.productId)!;
      const u = unitPrice(p);
      const color = i.color && p.colors.includes(i.color) ? i.color : (p.colors[0] ?? null);
      return {
        productId: p.id,
        name: p.name,
        slug: p.slug,
        image: p.images[0] ?? "",
        color,
        quantity: i.quantity,
        unitPrice: u,
        regularPrice: p.price,
        lineTotal: Math.round(u * i.quantity * 100) / 100,
      };
    });

    let coupon: CouponRule | null = null;
    if (data.couponCode) {
      const { data: c } = await supabaseAdmin
        .from("coupons")
        .select("code, discount_type, value, active")
        .ilike("code", data.couponCode.toUpperCase())
        .maybeSingle();
      if (!c || !c.active) return { ok: false, error: "That coupon code is no longer valid." };
      coupon = { code: c.code, discount_type: c.discount_type as CouponRule["discount_type"], value: Number(c.value) };
    }

    const totals = computeTotals(items, coupon);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const rand = crypto.getRandomValues(new Uint8Array(6));
    const orderNumber = "WS-" + Array.from(rand, (b) => alphabet[b % alphabet.length]).join("");

    const { error: insertError } = await (supabaseAdmin as any).from("orders").insert({
      order_number: orderNumber,
      customer_name: data.customer.name,
      customer_email: data.customer.email,
      address_line1: data.customer.line1,
      address_line2: data.customer.line2 || null,
      city: data.customer.city,
      state: data.customer.state,
      postal_code: data.customer.postalCode,
      country: data.customer.country,
      note: data.note || null,
      items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      coupon_code: coupon?.code ?? null,
      total: totals.total,
      payment_method: data.paymentMethod,
      payment_status: "unpaid",
    });
    if (insertError) {
      console.error("order insert failed", insertError);
      return { ok: false, error: "We couldn't place your order. Please try again." };
    }

    // Update stock and popularity.
    for (const [id, qty] of qtyByProduct) {
      const p = products.get(id)!;
      const update: Database["public"]["Tables"]["products"]["Update"] = { popularity: p.popularity + qty };
      if (!p.made_to_order) update.stock = Math.max(0, p.stock - qty);
      await supabaseAdmin.from("products").update(update).eq("id", id);
    }

    const order: PlacedOrder = {
      orderNumber,
      items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      couponCode: coupon?.code ?? null,
      total: totals.total,
      customerName: data.customer.name,
      customerEmail: data.customer.email,
      note: data.note || null,
      emailSent: false,
      paymentMethod: data.paymentMethod,
      paymentStatus: "unpaid",
      upiId,
    };

    // Store-owner notification email is wired in once the sender domain is set up.

    return { ok: true, order };
  });
