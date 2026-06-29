
DROP POLICY IF EXISTS "product_images_public_select" ON storage.objects;
CREATE POLICY "product_images_public_select" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'::public.app_role));
