CREATE POLICY "own generation files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'generations' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own generation files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generations' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own generation files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'generations' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'generations' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own generation files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'generations' AND auth.uid()::text = (storage.foldername(name))[1]);