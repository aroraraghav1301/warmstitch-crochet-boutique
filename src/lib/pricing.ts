// Pure pricing rules shared by the cart (preview) and the server (authoritative).

export type DiscountType = "percent" | "fixed";
export type CouponRule = { code: string; discount_type: DiscountType; value: number };

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** The price a shopper pays per unit: the sale price when it is lower than the regular price. */
export function unitPrice(p: { price: number; sale_price: number | null }) {
  if (p.sale_price != null && p.sale_price < p.price) return p.sale_price;
  return p.price;
}

export function discountPercent(p: { price: number; sale_price: number | null }) {
  const u = unitPrice(p);
  if (u >= p.price || p.price <= 0) return 0;
  return Math.round(((p.price - u) / p.price) * 100);
}

export function couponDiscount(subtotal: number, coupon: CouponRule | null | undefined) {
  if (!coupon || subtotal <= 0) return 0;
  if (coupon.discount_type === "percent") {
    const pct = Math.min(Math.max(coupon.value, 0), 100);
    return round2((subtotal * pct) / 100);
  }
  return round2(Math.min(Math.max(coupon.value, 0), subtotal));
}

export function computeTotals(
  lines: { unitPrice: number; quantity: number }[],
  coupon?: CouponRule | null,
) {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const discount = couponDiscount(subtotal, coupon);
  const total = round2(subtotal - discount);
  return { subtotal, discount, total };
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}
