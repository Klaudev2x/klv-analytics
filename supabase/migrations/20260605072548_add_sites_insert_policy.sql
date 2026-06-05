-- Allow authenticated users to create sites where they are the owner
CREATE POLICY "Owner can insert own sites"
  ON analytics_sites FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());
