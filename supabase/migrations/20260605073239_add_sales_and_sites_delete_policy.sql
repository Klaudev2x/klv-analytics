-- Sales tracking for KLV.AI Analytics
CREATE TABLE IF NOT EXISTS analytics_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  order_id text,
  product_name text,
  product_category text,
  revenue numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  quantity int NOT NULL DEFAULT 1,
  discount numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  payment_method text,
  conversion_source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view sales"
  ON analytics_sales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_sales.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert sales"
  ON analytics_sales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_sales.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

-- Also add DELETE policy for analytics_sites
CREATE POLICY "Owner can delete own sites"
  ON analytics_sites FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_analytics_sales_site_created ON analytics_sales(site_id, created_at DESC);
