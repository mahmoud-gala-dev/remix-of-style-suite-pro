
-- 1) Add salon_type + privacy default to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS salon_type text NOT NULL DEFAULT 'unisex'
    CHECK (salon_type IN ('barbershop','women_salon','unisex','spa'));

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS staff_photos_public boolean NOT NULL DEFAULT true;

-- 2) Auto-apply privacy default when salon_type becomes women_salon
CREATE OR REPLACE FUNCTION public.apply_salon_type_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.salon_type = 'women_salon'
     AND (TG_OP = 'INSERT' OR OLD.salon_type IS DISTINCT FROM NEW.salon_type) THEN
    NEW.staff_photos_public := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_salon_type_defaults ON public.tenants;
CREATE TRIGGER trg_apply_salon_type_defaults
  BEFORE INSERT OR UPDATE OF salon_type ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.apply_salon_type_defaults();

-- 3) Helper to seed service templates per salon type (idempotent per tenant+branch)
CREATE OR REPLACE FUNCTION public.seed_service_templates(
  _tenant_id uuid,
  _branch_id uuid,
  _salon_type text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_inserted int := 0;
  v_template jsonb;
  v_templates jsonb;
BEGIN
  IF _salon_type IS NULL THEN
    SELECT salon_type INTO v_type FROM public.tenants WHERE id = _tenant_id;
  ELSE
    v_type := _salon_type;
  END IF;

  v_templates := CASE v_type
    WHEN 'barbershop' THEN '[
      {"name_en":"Haircut","name_ar":"قص شعر","duration":30,"price":50},
      {"name_en":"Beard Trim","name_ar":"تهذيب لحية","duration":20,"price":30},
      {"name_en":"Shave","name_ar":"حلاقة","duration":25,"price":40},
      {"name_en":"Hair + Beard","name_ar":"شعر و لحية","duration":50,"price":75}
    ]'::jsonb
    WHEN 'women_salon' THEN '[
      {"name_en":"Haircut & Style","name_ar":"قص و تصفيف","duration":60,"price":120},
      {"name_en":"Hair Color","name_ar":"صبغة شعر","duration":120,"price":300},
      {"name_en":"Blow Dry","name_ar":"سشوار","duration":45,"price":80},
      {"name_en":"Manicure","name_ar":"مانيكير","duration":45,"price":70},
      {"name_en":"Pedicure","name_ar":"باديكير","duration":60,"price":90},
      {"name_en":"Facial","name_ar":"تنظيف بشرة","duration":60,"price":150}
    ]'::jsonb
    WHEN 'spa' THEN '[
      {"name_en":"Swedish Massage","name_ar":"مساج سويدي","duration":60,"price":200},
      {"name_en":"Deep Tissue","name_ar":"مساج عميق","duration":60,"price":250},
      {"name_en":"Facial","name_ar":"تنظيف بشرة","duration":60,"price":180},
      {"name_en":"Body Scrub","name_ar":"تقشير الجسم","duration":45,"price":160}
    ]'::jsonb
    ELSE '[
      {"name_en":"Haircut","name_ar":"قص شعر","duration":30,"price":60},
      {"name_en":"Hair Color","name_ar":"صبغة شعر","duration":90,"price":200},
      {"name_en":"Beard Trim","name_ar":"تهذيب لحية","duration":20,"price":30},
      {"name_en":"Manicure","name_ar":"مانيكير","duration":45,"price":70}
    ]'::jsonb
  END;

  FOR v_template IN SELECT * FROM jsonb_array_elements(v_templates)
  LOOP
    INSERT INTO public.services (branch_id, name_en, name_ar, duration_min, price, active)
    SELECT _branch_id,
           v_template->>'name_en',
           v_template->>'name_ar',
           (v_template->>'duration')::int,
           (v_template->>'price')::numeric,
           true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.services
      WHERE branch_id = _branch_id
        AND name_en = v_template->>'name_en'
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_service_templates(uuid, uuid, text) TO authenticated;
