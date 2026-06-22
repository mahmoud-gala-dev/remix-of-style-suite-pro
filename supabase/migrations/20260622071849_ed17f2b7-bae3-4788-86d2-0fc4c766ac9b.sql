
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS no_show_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'no_show' THEN
      UPDATE public.customers
        SET no_show_count = no_show_count + 1,
            blocked = CASE WHEN no_show_count + 1 >= 3 THEN true ELSE blocked END
        WHERE id = NEW.customer_id;
    ELSIF NEW.status = 'completed' THEN
      UPDATE public.customers
        SET no_show_count = 0
        WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_change ON public.bookings;
CREATE TRIGGER trg_booking_status_change
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change();
