import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { CATEGORY_VALUES, slugify, type Product } from "./catalog";

type ConsoleSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "ws-console",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

function passcodeMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

const requireAdmin = createServerOnlyFn(async () => {
  const session = await useSession<ConsoleSession>(sessionConfig());
  if (!session.data.unlocked) throw new Error("Console is locked");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
});

export const getConsoleStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<ConsoleSession>(sessionConfig());
  return { unlocked: !!session.data.unlocked };
});

export const unlockConsole = createServerFn({ method: "POST" })
  .inputValidator((input: { passcode: string }) => z.object({ passcode: z.string().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSCODE"];
    if (!expected) throw new Error("ADMIN_PASSCODE is not set");
    if (!passcodeMatches(data.passcode, expected)) return { ok: false as const };
    const session = await useSession<ConsoleSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockConsole = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<ConsoleSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

/* ---------------- Products ---------------- */

export const adminListProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const sb = await requireAdmin();
  const { data, error } = await sb.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
});

const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Name is required").max(120),
    category: z.enum(CATEGORY_VALUES),
    description: z.string().trim().max(4000).default(""),
    materials: z.string().trim().max(1000).default(""),
    images: z.array(z.string().url().max(2000)).max(10),
    colors: z.array(z.string().trim().min(1).max(40)).max(12),
    price: z.number().min(0).max(100000),
    sale_price: z.number().min(0).max(100000).nullable(),
    stock: z.number().int().min(0).max(100000),
    made_to_order: z.boolean(),
    sold_out: z.boolean(),
  })
  .refine((p) => p.sale_price == null || p.sale_price < p.price, {
    message: "Sale price must be lower than the regular price",
    path: ["sale_price"],
  });

export type ProductInput = z.infer<typeof productSchema>;

export const adminSaveProduct = createServerFn({ method: "POST" })
  .inputValidator((input: ProductInput) => productSchema.parse(input))
  .handler(async ({ data }) => {
    const sb = await requireAdmin();
    const { id, ...fields } = data;
    if (id) {
      const { error } = await sb.from("products").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
    const base = slugify(fields.name) || "item";
    let slug = base;
    for (let n = 2; n < 50; n++) {
      const { data: existing } = await sb.from("products").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${base}-${n}`;
    }
    const { error } = await sb.from("products").insert({ ...fields, slug });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminSetSoldOut = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; soldOut: boolean }) =>
    z.object({ id: z.string().uuid(), soldOut: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await requireAdmin();
    const { error } = await sb.from("products").update({ sold_out: data.soldOut }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sb = await requireAdmin();
    const { error } = await sb.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

export const adminCreateUpload = createServerFn({ method: "POST" })
  .inputValidator((input: { filename: string }) => z.object({ filename: z.string().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const sb = await requireAdmin();
    const ext = (data.filename.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) throw new Error("Please upload a JPG, PNG, WEBP, GIF or AVIF image");
    const path = `products/${crypto.randomUUID()}.${ext}`;
    const { data: signed, error } = await sb.storage.from("product-images").createSignedUploadUrl(path);
    if (error || !signed) throw new Error("Could not prepare upload");
    return { path: signed.path, token: signed.token };
  });

export const adminFinishUpload = createServerFn({ method: "POST" })
  .inputValidator((input: { path: string }) =>
    z.object({ path: z.string().regex(/^products\/[\w-]+\.[a-z]+$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await requireAdmin();
    // Long-lived link so the photo keeps showing on the storefront.
    const { data: signed, error } = await sb.storage
      .from("product-images")
      .createSignedUrl(data.path, 60 * 60 * 24 * 365 * 10);
    if (error || !signed) throw new Error("Could not finish upload");
    return { url: signed.signedUrl };
  });

/* ---------------- Coupons ---------------- */

export type CouponRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  value: number;
  active: boolean;
  created_at: string;
};

export const adminListCoupons = createServerFn({ method: "GET" }).handler(async (): Promise<CouponRow[]> => {
  const sb = await requireAdmin();
  const { data, error } = await sb.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CouponRow[];
});

export const adminCreateCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; discount_type: "percent" | "fixed"; value: number; active: boolean }) =>
    z
      .object({
        code: z
          .string()
          .trim()
          .min(2)
          .max(40)
          .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dashes or underscores"),
        discount_type: z.enum(["percent", "fixed"]),
        value: z.number().positive().max(100000),
        active: z.boolean(),
      })
      .refine((c) => c.discount_type !== "percent" || c.value <= 100, {
        message: "A percentage can't be more than 100",
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await requireAdmin();
    const { error } = await sb.from("coupons").insert({ ...data, code: data.code.toUpperCase() });
    if (error) {
      if (error.code === "23505") return { ok: false as const, error: "That code already exists" };
      throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const adminSetCouponActive = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; active: boolean }) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await requireAdmin();
    const { error } = await sb.from("coupons").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const sb = await requireAdmin();
    const { error } = await sb.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- Orders ---------------- */

export type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  note: string | null;
  items: {
    productId: string;
    name: string;
    image: string;
    color: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  total: number;
  status: "pending" | "completed";
  created_at: string;
};

export const adminListOrders = createServerFn({ method: "GET" }).handler(async (): Promise<OrderRow[]> => {
  const sb = await requireAdmin();
  const { data, error } = await sb.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OrderRow[];
});

export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; status: "pending" | "completed" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "completed"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    const sb = await requireAdmin();
    const { error } = await sb.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
