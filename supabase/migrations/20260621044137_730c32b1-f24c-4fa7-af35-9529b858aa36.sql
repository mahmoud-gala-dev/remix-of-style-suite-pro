CREATE INDEX IF NOT EXISTS idx_bookings_branch_start_at ON public.bookings (branch_id, start_at);
CREATE INDEX IF NOT EXISTS idx_queue_items_branch_status ON public.queue_items (branch_id, status);