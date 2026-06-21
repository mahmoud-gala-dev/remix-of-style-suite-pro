CREATE INDEX IF NOT EXISTS idx_bookings_branch_start ON public.bookings(branch_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_created ON public.invoices(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_at ON public.audit_log(table_name, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_at ON public.audit_log(at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_created ON public.webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_items_branch_status_pos ON public.queue_items(branch_id, status, position);
CREATE INDEX IF NOT EXISTS idx_customers_branch_phone ON public.customers(branch_id, phone);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

CREATE TABLE IF NOT EXISTS public.alert_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_key text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  snooze_until timestamptz,
  UNIQUE(user_id, alert_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_dismissals TO authenticated;
GRANT ALL ON public.alert_dismissals TO service_role;
ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own dismissals" ON public.alert_dismissals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_items;
ALTER TABLE public.queue_items REPLICA IDENTITY FULL;