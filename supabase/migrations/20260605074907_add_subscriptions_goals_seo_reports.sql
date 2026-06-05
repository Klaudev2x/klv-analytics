-- Subscription tiers and conversion goals for KLV.AI Analytics

-- Subscription tiers table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business', 'agency')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Conversion goals table
CREATE TABLE IF NOT EXISTS analytics_conversion_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal_type text NOT NULL DEFAULT 'page_view' CHECK (goal_type IN ('page_view', 'event', 'duration', 'custom')),
  target_url text,
  target_event text,
  target_duration_seconds int,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_conversion_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view goals"
  ON analytics_conversion_goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_conversion_goals.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert goals"
  ON analytics_conversion_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_conversion_goals.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update goals"
  ON analytics_conversion_goals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_conversion_goals.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete goals"
  ON analytics_conversion_goals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_conversion_goals.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

-- Email reports config
CREATE TABLE IF NOT EXISTS analytics_email_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  email text NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  is_active boolean DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_email_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view email reports"
  ON analytics_email_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_email_reports.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert email reports"
  ON analytics_email_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_email_reports.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update email reports"
  ON analytics_email_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_email_reports.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete email reports"
  ON analytics_email_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_email_reports.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

-- SEO metadata for pages
CREATE TABLE IF NOT EXISTS analytics_seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  page_url text NOT NULL,
  page_title text,
  meta_description text,
  h1_count int DEFAULT 0,
  has_meta_description boolean DEFAULT false,
  has_og_tags boolean DEFAULT false,
  has_canonical boolean DEFAULT false,
  word_count int DEFAULT 0,
  internal_links int DEFAULT 0,
  external_links int DEFAULT 0,
  last_crawled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(site_id, page_url)
);

ALTER TABLE analytics_seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view SEO pages"
  ON analytics_seo_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_seo_pages.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert SEO pages"
  ON analytics_seo_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_seo_pages.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update SEO pages"
  ON analytics_seo_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_seo_pages.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_conversion_goals_site ON analytics_conversion_goals(site_id);
CREATE INDEX IF NOT EXISTS idx_email_reports_site ON analytics_email_reports(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_pages_site ON analytics_seo_pages(site_id, page_url);
