
CREATE TABLE public.employee_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  UNIQUE (employee_id, weekday, start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_shifts TO authenticated;
GRANT SELECT ON public.employee_shifts TO anon;
GRANT ALL ON public.employee_shifts TO service_role;
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shifts readable by all" ON public.employee_shifts FOR SELECT USING (true);
CREATE POLICY "Shifts writable by admins" ON public.employee_shifts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.employee_days_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_days_off TO authenticated;
GRANT SELECT ON public.employee_days_off TO anon;
GRANT ALL ON public.employee_days_off TO service_role;
ALTER TABLE public.employee_days_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Days off readable by all" ON public.employee_days_off FOR SELECT USING (true);
CREATE POLICY "Days off writable by admins" ON public.employee_days_off FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_employee_shifts_emp ON public.employee_shifts (employee_id, weekday);
CREATE INDEX idx_employee_days_off_emp ON public.employee_days_off (employee_id, day);
