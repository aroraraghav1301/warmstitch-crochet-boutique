import { describe, expect, it } from "vitest";
import { computeTotals, couponDiscount, unitPrice } from "./pricing";

describe("pricing rules", () => {
  it("WELCOME10 takes 10% off the subtotal", () => {
    const t = computeTotals([{ unitPrice: 85, quantity: 1 }, { unitPrice: 32, quantity: 1 }], {
      code: "WELCOME10",
      discount_type: "percent",
      value: 10,
    });
    expect(t.subtotal).toBe(117);
    expect(t.discount).toBe(11.7);
    expect(t.total).toBe(105.3);
  });

  it("a fixed-dollar coupon never discounts more than the subtotal", () => {
    expect(couponDiscount(18, { code: "BIG", discount_type: "fixed", value: 25 })).toBe(18);
    expect(couponDiscount(45, { code: "FIVE", discount_type: "fixed", value: 5 })).toBe(5);
  });

  it("charges the sale price when it is lower than the regular price", () => {
    expect(unitPrice({ price: 100, sale_price: 85 })).toBe(85);
    expect(unitPrice({ price: 32, sale_price: null })).toBe(32);
    expect(unitPrice({ price: 30, sale_price: 40 })).toBe(30);
  });
});
