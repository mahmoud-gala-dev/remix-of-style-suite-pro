import { describe, it, expect } from "vitest";
import { calcSubtotal, calcDiscount, calcTax, calcTotal, calcInvoice } from "@/lib/billing";

describe("calcSubtotal", () => {
  it("multiplies price by quantity", () => {
    expect(calcSubtotal(50, 3)).toBe(150);
  });
  it("clamps negatives to 0", () => {
    expect(calcSubtotal(-10, 3)).toBe(0);
    expect(calcSubtotal(10, -3)).toBe(0);
  });
});

describe("calcDiscount", () => {
  it("returns 0 when no coupon", () => {
    expect(calcDiscount(100, null)).toBe(0);
  });
  it("applies percent coupon", () => {
    expect(calcDiscount(200, { kind: "percent", value: 10 })).toBe(20);
  });
  it("applies amount coupon", () => {
    expect(calcDiscount(200, { kind: "amount", value: 25 })).toBe(25);
  });
  it("never exceeds subtotal", () => {
    expect(calcDiscount(50, { kind: "amount", value: 999 })).toBe(50);
  });
});

describe("calcTax", () => {
  it("computes tax on discounted base", () => {
    expect(calcTax(100, 20, 10)).toBe(8);
  });
  it("returns 0 when base goes negative", () => {
    expect(calcTax(50, 100, 10)).toBe(0);
  });
});

describe("calcTotal", () => {
  it("sums subtotal minus discount plus tax", () => {
    expect(calcTotal(100, 20, 8)).toBe(88);
  });
});

describe("calcInvoice", () => {
  it("composes a full invoice with percent coupon", () => {
    const r = calcInvoice({ unitPrice: 100, qty: 2, taxPct: 14, coupon: { kind: "percent", value: 10 } });
    expect(r.subtotal).toBe(200);
    expect(r.discount).toBe(20);
    expect(r.tax).toBeCloseTo(25.2, 5);
    expect(r.total).toBeCloseTo(205.2, 5);
  });
  it("composes a full invoice with no coupon", () => {
    const r = calcInvoice({ unitPrice: 80, qty: 1, taxPct: 0 });
    expect(r).toEqual({ subtotal: 80, discount: 0, tax: 0, total: 80 });
  });
});