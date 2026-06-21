// Pure billing math. Tested in tests/calc.test.ts.
export type Coupon =
  | { kind: "percent"; value: number }
  | { kind: "amount"; value: number }
  | null;

export function calcSubtotal(unitPrice: number, qty: number): number {
  return Math.max(0, Number(unitPrice) || 0) * Math.max(0, Number(qty) || 0);
}

export function calcDiscount(subtotal: number, coupon: Coupon): number {
  if (!coupon) return 0;
  const v = Number(coupon.value) || 0;
  const raw = coupon.kind === "percent" ? (subtotal * v) / 100 : v;
  return Math.min(Math.max(0, raw), subtotal);
}

export function calcTax(subtotal: number, discount: number, taxPct: number): number {
  const base = Math.max(0, subtotal - discount);
  return (base * (Math.max(0, Number(taxPct) || 0))) / 100;
}

export function calcTotal(subtotal: number, discount: number, tax: number): number {
  return Math.max(0, subtotal - discount + tax);
}

export function calcInvoice(opts: {
  unitPrice: number;
  qty: number;
  taxPct: number;
  coupon?: Coupon;
}) {
  const subtotal = calcSubtotal(opts.unitPrice, opts.qty);
  const discount = calcDiscount(subtotal, opts.coupon ?? null);
  const tax = calcTax(subtotal, discount, opts.taxPct);
  const total = calcTotal(subtotal, discount, tax);
  return { subtotal, discount, tax, total };
}