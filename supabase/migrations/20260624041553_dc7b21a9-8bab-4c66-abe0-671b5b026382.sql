
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'SAR';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SAR';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS exchange_rate numeric(14,6) NOT NULL DEFAULT 1;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SAR';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SAR';
CREATE INDEX IF NOT EXISTS idx_invoices_currency ON public.invoices(currency);
