
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_staff_role(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_tenants() TO PUBLIC;
GRANT USAGE ON TYPE public.app_role TO PUBLIC;
NOTIFY pgrst, 'reload schema';
