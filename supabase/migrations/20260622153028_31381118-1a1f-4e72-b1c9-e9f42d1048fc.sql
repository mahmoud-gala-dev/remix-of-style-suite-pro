-- Cycle #8 — E: Audit log tamper-evident hash chain
-- Add hash + prev_hash columns and a BEFORE INSERT trigger that computes
-- sha256(prev_hash || row_payload). Verification: each row's prev_hash must
-- equal the previous row's hash (ordered by at, id).

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS hash text;

CREATE INDEX IF NOT EXISTS audit_log_at_id_idx ON public.audit_log (at, id);

CREATE OR REPLACE FUNCTION public.audit_log_hash_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev text;
  v_payload text;
BEGIN
  SELECT hash INTO v_prev
    FROM public.audit_log
   ORDER BY at DESC, id DESC
   LIMIT 1;
  NEW.prev_hash := COALESCE(v_prev, '');
  v_payload := COALESCE(NEW.prev_hash,'') || '|' ||
               COALESCE(NEW.actor::text,'') || '|' ||
               COALESCE(NEW.table_name,'') || '|' ||
               COALESCE(NEW.row_id,'') || '|' ||
               COALESCE(NEW.action,'') || '|' ||
               COALESCE(NEW.diff::text,'') || '|' ||
               COALESCE(NEW.at::text,'');
  NEW.hash := encode(digest(v_payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_hash_chain_trg ON public.audit_log;
CREATE TRIGGER audit_log_hash_chain_trg
  BEFORE INSERT ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_hash_chain();

-- Verification RPC: returns rows whose hash does not match recomputation
-- or whose prev_hash does not match the prior row's hash.
CREATE OR REPLACE FUNCTION public.verify_audit_chain(p_limit int DEFAULT 10000)
RETURNS TABLE(id uuid, at timestamptz, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_prev text := '';
  v_expected text;
  v_payload text;
BEGIN
  FOR r IN
    SELECT * FROM public.audit_log
    ORDER BY at ASC, id ASC
    LIMIT p_limit
  LOOP
    IF COALESCE(r.prev_hash,'') <> v_prev THEN
      id := r.id; at := r.at; reason := 'prev_hash_mismatch'; RETURN NEXT;
    END IF;
    v_payload := COALESCE(r.prev_hash,'') || '|' ||
                 COALESCE(r.actor::text,'') || '|' ||
                 COALESCE(r.table_name,'') || '|' ||
                 COALESCE(r.row_id,'') || '|' ||
                 COALESCE(r.action,'') || '|' ||
                 COALESCE(r.diff::text,'') || '|' ||
                 COALESCE(r.at::text,'');
    v_expected := encode(digest(v_payload,'sha256'),'hex');
    IF r.hash IS DISTINCT FROM v_expected THEN
      id := r.id; at := r.at; reason := 'hash_mismatch'; RETURN NEXT;
    END IF;
    v_prev := r.hash;
  END LOOP;
END;
$$;