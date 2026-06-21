
REVOKE EXECUTE ON FUNCTION public.user_has_branch(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.audit_trigger() FROM PUBLIC, anon, authenticated;
