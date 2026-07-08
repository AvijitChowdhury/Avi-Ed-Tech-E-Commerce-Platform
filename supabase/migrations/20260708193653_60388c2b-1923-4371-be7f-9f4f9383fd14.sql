
-- Defense-in-depth: prevent non-admin users from inserting/updating their own role rows.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow when there is no session user (trigger from handle_new_user, service_role, etc.)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- Allow admins to manage roles.
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Only admins can modify user_roles';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_role_self_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation_ins ON public.user_roles;
CREATE TRIGGER trg_prevent_role_self_escalation_ins
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation_upd ON public.user_roles;
CREATE TRIGGER trg_prevent_role_self_escalation_upd
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- Lock down SECURITY DEFINER helper/trigger functions so anon/authenticated
-- cannot invoke them directly through the Data API (RPC). Triggers still fire.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_chat_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_chat_session() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role is invoked by RLS policies; keep authenticated EXECUTE, but revoke anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
