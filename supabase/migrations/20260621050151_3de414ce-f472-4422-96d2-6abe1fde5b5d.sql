
DROP POLICY IF EXISTS "Authed read customer avatars" ON storage.objects;
CREATE POLICY "Authed read customer avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'customer-avatars');
DROP POLICY IF EXISTS "Authed write customer avatars" ON storage.objects;
CREATE POLICY "Authed write customer avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'customer-avatars');
DROP POLICY IF EXISTS "Authed delete customer avatars" ON storage.objects;
CREATE POLICY "Authed delete customer avatars" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'customer-avatars');

DROP POLICY IF EXISTS "Authed read service images" ON storage.objects;
CREATE POLICY "Authed read service images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'service-images');
DROP POLICY IF EXISTS "Authed write service images" ON storage.objects;
CREATE POLICY "Authed write service images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-images');
DROP POLICY IF EXISTS "Authed delete service images" ON storage.objects;
CREATE POLICY "Authed delete service images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'service-images');
