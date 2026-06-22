
-- Realtime
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.queue_items REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='bookings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='queue_items') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_items';
  END IF;
END $$;

-- Double-booking prevention
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('cancelled','no_show') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.employee_id = NEW.employee_id
      AND b.id <> NEW.id
      AND b.status NOT IN ('cancelled','no_show','completed')
      AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Booking overlaps with an existing booking for this employee'
      USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_booking_overlap ON public.bookings;
CREATE TRIGGER trg_check_booking_overlap
BEFORE INSERT OR UPDATE OF employee_id, start_at, end_at, status
ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.check_booking_overlap();
