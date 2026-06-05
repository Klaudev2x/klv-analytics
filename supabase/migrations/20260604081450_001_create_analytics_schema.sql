/*
  # Real-time Analytics Schema for KLA.AI

  1. New Tables
    - `analytics_sites` - Website/app instances to track
    - `analytics_sessions` - User sessions with anonymous IDs
    - `analytics_events` - Individual page views, API calls, errors
    - `analytics_aggregates` - Pre-aggregated metrics for performance
    - `analytics_admin_users` - Admin dashboard access control

  2. Security
    - Enable RLS on all tables
    - Create policies for admin access
    - Restrict event insertion to authenticated edge function
    - Allow public event tracking with rate limiting

  3. Indexes
    - Index on timestamp for time-range queries
    - Index on session_id for session tracking
    - Index on site_id for multi-site support
*/

-- Create sites table
CREATE TABLE IF NOT EXISTS analytics_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL UNIQUE,
  site_key text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own sites"
  ON analytics_sites FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can update own sites"
  ON analytics_sites FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create admin users table
CREATE TABLE IF NOT EXISTS analytics_admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);

ALTER TABLE analytics_admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their sites"
  ON analytics_admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create sessions table
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  user_agent text,
  ip_address text,
  country text,
  city text,
  device_type text,
  browser text,
  os text,
  referrer text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds int,
  page_views int DEFAULT 0,
  events_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(site_id, session_id)
);

ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sessions"
  ON analytics_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_admin_users
      WHERE analytics_admin_users.user_id = auth.uid()
      AND analytics_admin_users.site_id = analytics_sessions.site_id
    )
    OR
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_sessions.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

-- Create events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  event_type text NOT NULL,
  event_name text,
  page_url text,
  page_title text,
  referrer text,
  api_endpoint text,
  api_method text,
  api_status int,
  api_response_time_ms int,
  error_message text,
  custom_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_admin_users
      WHERE analytics_admin_users.user_id = auth.uid()
      AND analytics_admin_users.site_id = analytics_events.site_id
    )
    OR
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_events.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

-- Create aggregates table for fast queries
CREATE TABLE IF NOT EXISTS analytics_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES analytics_sites(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  value numeric NOT NULL,
  data jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(site_id, metric_type, period_start, period_end)
);

ALTER TABLE analytics_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view aggregates"
  ON analytics_aggregates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM analytics_admin_users
      WHERE analytics_admin_users.user_id = auth.uid()
      AND analytics_admin_users.site_id = analytics_aggregates.site_id
    )
    OR
    EXISTS (
      SELECT 1 FROM analytics_sites
      WHERE analytics_sites.id = analytics_aggregates.site_id
      AND analytics_sites.owner_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_site_created ON analytics_sessions(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_site_created ON analytics_events(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_site_period ON analytics_aggregates(site_id, period_start DESC);
