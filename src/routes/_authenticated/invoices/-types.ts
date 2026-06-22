export type Invoice = {
  id: string; number: string; customer_id: string | null; branch_id: string | null;
  subtotal: number; discount: number; tax: number; total: number;
  status: string; issued_at: string;
};

export type InvoiceItem = {
  id: string; invoice_id: string; description: string; qty: number;
  unit_price: number; total: number;
};