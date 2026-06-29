
-- 1) Lock down chat tables: signed-in users only, ownership scoped via user_id
DROP POLICY IF EXISTS chat_sessions_read ON public.chat_sessions;
DROP POLICY IF EXISTS chat_sessions_insert ON public.chat_sessions;
DROP POLICY IF EXISTS chat_sessions_update ON public.chat_sessions;
DROP POLICY IF EXISTS chat_messages_read ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_update ON public.chat_messages;

REVOKE ALL ON public.chat_sessions FROM anon;
REVOKE ALL ON public.chat_messages FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;

CREATE POLICY chat_sessions_owner_select ON public.chat_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY chat_sessions_owner_insert ON public.chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY chat_sessions_owner_update ON public.chat_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY chat_messages_owner_select ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id
      AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY chat_messages_owner_insert ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (sender = 'user' AND EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY chat_messages_admin_update ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Remove permissive INSERT/UPDATE on incomplete_orders & orders (server uses admin client)
DROP POLICY IF EXISTS incomplete_insert_any ON public.incomplete_orders;
DROP POLICY IF EXISTS incomplete_update_any ON public.incomplete_orders;
DROP POLICY IF EXISTS orders_insert_any ON public.orders;
DROP POLICY IF EXISTS order_items_insert ON public.order_items;

REVOKE ALL ON public.incomplete_orders FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;

-- 3) Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END
$$;

-- 4) has_role is for internal RLS use only — revoke direct EXECUTE
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
