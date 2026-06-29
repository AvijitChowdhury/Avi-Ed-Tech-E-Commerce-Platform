
-- orders: authenticated users can only create orders attributed to themselves; admins always allowed.
CREATE POLICY orders_self_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- incomplete_orders: authenticated users can only insert/update rows linked to themselves; admins always allowed.
CREATE POLICY incomplete_self_insert ON public.incomplete_orders
  FOR INSERT TO authenticated
  WITH CHECK ((user_id IS NOT NULL AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY incomplete_self_update ON public.incomplete_orders
  FOR UPDATE TO authenticated
  USING ((user_id IS NOT NULL AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK ((user_id IS NOT NULL AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- user_roles: admins only for writes (fail-closed, explicit).
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
