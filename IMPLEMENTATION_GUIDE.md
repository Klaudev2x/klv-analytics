# KLA.AI Analytics - Complete Implementation Guide

## Quick Start (5 Minutes)

### 1. Start Development Server
```bash
npm install
npm run dev
```

### 2. Access Dashboard
- Go to `http://localhost:5173/admin/login`
- Sign up with your email and password

### 3. Create a Site
1. After signing in, you'll see a prompt to create your first site
2. Enter your website name and domain
3. Copy the tracking code provided
4. Paste it into your website's `<head>`

### 4. View Analytics
- Visit your website to start generating events
- Return to dashboard to see real-time metrics

---

## Complete File Structure

```
project/
├── src/
│   ├── components/
│   │   ├── AnalyticsDashboard.tsx      # Main analytics dashboard
│   │   ├── MetricCard.tsx              # KPI metric card component
│   │   ├── TrafficChart.tsx            # 24-hour traffic bar chart
│   │   ├── TopPagesTable.tsx           # Most visited pages table
│   │   ├── ActivityFeed.tsx            # Real-time event feed
│   │   └── SetupWizard.tsx             # Site creation wizard
│   ├── pages/
│   │   ├── AdminLogin.tsx              # Authentication page
│   │   └── AdminDashboard.tsx          # Dashboard container page
│   ├── lib/
│   │   └── analytics.ts                # Supabase client & API helpers
│   ├── App.tsx                         # Main routing component
│   ├── main.tsx                        # React entry point
│   └── index.css                       # Global styles
├── public/
│   └── kla-tracker.js                  # Website tracking script
├── supabase/
│   └── functions/
│       ├── analytics-track/
│       │   └── index.ts                # Event collection endpoint
│       └── analytics-api/
│           └── index.ts                # Admin API (sites & stats)
├── index.html                          # HTML template
├── package.json                        # Dependencies
├── vite.config.ts                      # Vite configuration
├── tsconfig.json                       # TypeScript config
├── tailwind.config.js                  # Tailwind CSS config
├── postcss.config.js                   # PostCSS config
├── .env                                # Supabase credentials
├── ANALYTICS_README.md                 # Feature documentation
├── SETUP_GUIDE.md                      # Installation guide
└── IMPLEMENTATION_GUIDE.md             # This file
```

---

## API Reference

### Tracking Endpoint

**Base URL**: `https://your-project.supabase.co/functions/v1/analytics-track`

#### POST /analytics-track

Receive and store tracking events from the website.

**Request Body**:
```typescript
{
  siteId: string;              // UUID of the site
  sessionId: string;           // Unique session identifier
  eventType: string;           // "page_view" | "api_call" | "error" | "custom" | "session_start" | "session_end"
  eventName?: string;          // Optional event name
  pageUrl?: string;            // URL of the page
  pageTitle?: string;          // Title of the page
  referrer?: string;           // HTTP referrer
  apiEndpoint?: string;        // API endpoint URL
  apiMethod?: string;          // HTTP method
  apiStatus?: number;          // HTTP status code
  apiResponseTime?: number;    // Response time in milliseconds
  errorMessage?: string;       // Error message if applicable
  customData?: Record<string, unknown>; // Custom JSON data
  userAgent?: string;          // Browser user agent
  ipAddress?: string;          // IP address
  country?: string;            // Country code
  device?: string;             // Device type
  browser?: string;            // Browser name
  os?: string;                 // Operating system
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

**Status Codes**:
- `200` - Event received and stored
- `400` - Invalid payload
- `429` - Rate limit exceeded
- `500` - Server error

**Rate Limits**:
- 100 events per minute per session

### Admin API

**Base URL**: `https://your-project.supabase.co/functions/v1/analytics-api`

#### GET /sites

List all sites owned by the authenticated user.

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**:
```typescript
[
  {
    id: string;              // UUID
    name: string;            // Site name
    domain: string;          // Website domain
    site_key: string;        // API key
    owner_id: string;        // Owner UUID
    created_at: string;      // ISO timestamp
    updated_at: string;      // ISO timestamp
  }
]
```

#### POST /sites

Create a new site.

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "My Website",
  "domain": "example.com"
}
```

**Response**:
```typescript
{
  id: string;              // New site UUID
  name: string;
  domain: string;
  site_key: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}
```

#### GET /stats/{siteId}

Get analytics statistics for a site.

**Query Parameters**:
- `period`: "24h" | "7d" | "30d" (default: "24h")

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**:
```typescript
{
  activeUsers: number;         // Currently active sessions
  totalEvents: number;         // Total events in period
  topPages: Array<{
    url: string;              // Page URL
    title: string;            // Page title
    count: number;            // View count
  }>;
  recentErrors: Array<{
    error_message: string;
    created_at: string;
  }>;
}
```

---

## Tracking Script Integration

### How It Works

The `kla-tracker.js` script:

1. **Initializes on page load**
   - Generates or retrieves session ID
   - Loads user agent and device info
   - Sets up event listeners

2. **Tracks page views**
   - On initial load
   - On route changes (SPA support)
   - Captures URL, title, referrer

3. **Intercepts API calls**
   - Wraps `fetch()` function
   - Records endpoint, method, status, response time
   - Only tracks `/api/` endpoints

4. **Captures errors**
   - Global error handler
   - Unhandled promise rejections
   - Failed API calls

5. **Batches events**
   - Queues up to 5 events
   - Sends every 5 seconds or when batch is full
   - Uses `sendBeacon` for reliability

### Installation

In your website's `<head>`:

```html
<script>
  window.KLA_SITE_ID = 'YOUR_SITE_ID';
  window.KLA_API_URL = 'https://your-supabase.supabase.co/functions/v1/analytics-track';
</script>
<script src="/kla-tracker.js"></script>
```

### Configuration

```html
<script>
  window.KLA_SITE_ID = 'YOUR_SITE_ID';
  window.KLA_API_URL = 'YOUR_API_URL';
  
  // Optional configuration
  window.KLA_CONFIG = {
    batchSize: 10,           // Events per batch (default: 5)
    batchTimeout: 3000,      // Milliseconds between sends (default: 5000)
    trackErrors: true,       // Track JS errors (default: true)
    trackAPI: true           // Track fetch calls (default: true)
  };
</script>
<script src="/kla-tracker.js"></script>
```

### Custom Tracking

From your website code:

```javascript
// Track custom event
KLATracker.track({
  eventType: 'custom',
  eventName: 'button_clicked',
  customData: {
    buttonId: 'signup-btn',
    timestamp: Date.now()
  }
});

// Manual page view (for SPAs with complex routing)
KLATracker.trackPageView();

// Manually flush events
KLATracker.flush();
```

### Verify Installation

In browser console:

```javascript
// Check tracker is loaded
console.log(window.KLATracker);

// Check session ID
console.log(KLATracker.state.sessionId);

// Check queued events
console.log(KLATracker.state.queue);

// Manually send test event
KLATracker.track({
  eventType: 'custom',
  eventName: 'test_event'
});
```

---

## Dashboard Features

### Metric Cards

Four key metrics displayed at the top:

1. **Active Users** - Real-time sessions online
   - Counts sessions where `ended_at IS NULL`
   - Updates every 5 seconds

2. **Page Views (24h)** - Total page view events
   - Counts `event_type = 'page_view'`
   - For last 24 hours

3. **Avg Response Time** - Average API response
   - Calculates mean of `api_response_time_ms`
   - For tracked API calls

4. **API Success Rate** - Percentage of 2xx responses
   - Counts status 200-299 as success
   - Counts 400+ as failure

### Traffic Chart

24-hour hourly breakdown of page views.

- **X-axis**: Hours (00:00 to 23:00)
- **Y-axis**: Number of page views
- **Heights**: Auto-scaled per hour
- **Hover**: Shows exact count

### Top Pages Table

Most visited pages ranked by view count.

- Shows page URL and title
- Display order by views descending
- Limited to top 5 pages
- Updates in real-time

### Activity Feed

Real-time stream of incoming events.

- **Icons**: Event type indicators
- **Timestamp**: "just now", "5m ago", etc
- **Scrollable**: Max 10 items visible
- **Live**: Updates as events arrive

### Error Feed

Recent JavaScript errors and failures.

- Captures error messages
- Shows error timestamp
- Displays up to 10 recent errors
- Helps identify issues

---

## Authentication & Security

### User Authentication

Uses Supabase Auth with email/password:

```typescript
// Sign up
const { error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password'
});

// Sign in
const { error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password'
});

// Sign out
await supabase.auth.signOut();
```

### Row-Level Security

All tables have RLS enabled:

**analytics_sites**:
- Owners can view/update their sites
- Other users cannot access

**analytics_sessions**:
- Only admins of a site can view
- Only site owner can see their data

**analytics_events**:
- Only admins can query
- Filtered by site_id

**analytics_admin_users**:
- Users see their own records
- Owners can assign admins

### Rate Limiting

Tracking endpoint:
- 100 events per minute per session
- Prevents abuse
- In-memory tracking (resets on function restart)

### Input Sanitization

All user inputs:
- Truncated to 500 characters
- HTML tags removed (`<`, `>`)
- Special characters handled
- Prevents XSS attacks

---

## Database Schema Details

### analytics_sites

```sql
CREATE TABLE analytics_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL UNIQUE,
  site_key text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### analytics_sessions

```sql
CREATE TABLE analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES analytics_sites(id),
  session_id text NOT NULL UNIQUE,
  user_agent text,
  ip_address text,
  country text,
  device_type text,
  browser text,
  os text,
  referrer text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds int,
  page_views int DEFAULT 0,
  events_count int DEFAULT 0
);
```

### analytics_events

```sql
CREATE TABLE analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES analytics_sites(id),
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
```

### Indexes

```sql
CREATE INDEX idx_analytics_sessions_site_created 
  ON analytics_sessions(site_id, created_at DESC);

CREATE INDEX idx_analytics_events_site_created 
  ON analytics_events(site_id, created_at DESC);

CREATE INDEX idx_analytics_events_event_type 
  ON analytics_events(event_type);
```

---

## Performance Optimization

### Frontend

1. **Component memoization** - Prevent unnecessary re-renders
2. **Query batching** - Fetch multiple queries at once
3. **Lazy loading** - Load dashboard on-demand
4. **Client caching** - Cache recent data
5. **Pagination** - Show limited items per page

### Tracking Script

1. **Event batching** - 5 events max per request
2. **Throttling** - 5 second intervals between sends
3. **sendBeacon** - Reliable even on page unload
4. **Minimal payload** - Only essential data
5. **Async operations** - Non-blocking

### Database

1. **Indexes** - Fast queries on site_id, created_at
2. **RLS** - Efficient access control
3. **Aggregates table** - Pre-computed metrics (optional)
4. **Data retention** - Archive old events
5. **Connection pooling** - Reuse connections

### Edge Functions

1. **Rate limiting** - Prevent abuse
2. **Input validation** - Quick rejection of invalid data
3. **Minimal logic** - Fast execution
4. **Error handling** - Graceful failures

---

## Deployment Checklist

### Pre-deployment

- [ ] Database migrations applied
- [ ] Edge Functions deployed
- [ ] Environment variables configured
- [ ] Supabase RLS policies in place
- [ ] API rate limiting configured

### Deployment

- [ ] Build the project: `npm run build`
- [ ] Test production build locally: `npm run preview`
- [ ] Deploy to hosting (Vercel, Netlify, etc.)
- [ ] Verify Supabase connectivity
- [ ] Test tracking endpoint

### Post-deployment

- [ ] Install tracking script on website
- [ ] Verify events appear in dashboard
- [ ] Monitor performance and errors
- [ ] Set up data retention policy
- [ ] Configure alerts (if needed)

---

## Troubleshooting Guide

### Events Not Appearing

**Problem**: Events sent but not showing in dashboard

**Solutions**:
1. Verify site ID is correct
2. Check API URL matches your Supabase URL
3. Inspect browser Network tab for 200 responses
4. Check console for JavaScript errors
5. Verify site exists in your dashboard
6. Wait 5-10 seconds for data refresh

**Debug**:
```javascript
// In browser console on your website
KLATracker.track({eventType: 'custom', eventName: 'test'});
KLATracker.flush();
```

### Dashboard Not Loading

**Problem**: Dashboard page shows loading spinner

**Solutions**:
1. Clear browser cache and cookies
2. Sign out and back in
3. Check Supabase connection in .env
4. Verify authentication token in browser DevTools
5. Check for CORS errors in console

**Debug**:
```javascript
// Check Supabase connection
const { data, error } = await supabase.auth.getUser();
console.log(user, error);
```

### High CPU/Memory on Website

**Problem**: Website slower after adding tracking

**Solutions**:
1. Increase batch timeout (5000 → 10000)
2. Reduce batch size (5 → 3)
3. Disable error tracking if not needed
4. Disable API tracking if only need page views
5. Review custom tracking calls

**Config**:
```javascript
window.KLA_CONFIG = {
  batchSize: 3,
  batchTimeout: 10000
};
```

### CORS Errors

**Problem**: Browser blocks tracking requests

**Solutions**:
1. Verify Edge Function is deployed
2. Check API URL is correct
3. Ensure CORS headers are sent
4. Test with curl: `curl -X POST <api_url>`

### Rate Limit Errors (429)

**Problem**: Too many events from one session

**Solutions**:
1. Check for event tracking loops
2. Increase batch timeout
3. Reduce event frequency
4. Contact support to increase limit

---

## Customization Examples

### Change Dashboard Theme

Edit `src/index.css` and `tailwind.config.js`:

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    }
  }
}
```

### Add New Metrics

In `src/components/AnalyticsDashboard.tsx`:

```typescript
const { count: newMetric } = await supabase
  .from('analytics_events')
  .select('*', { count: 'exact' })
  .eq('site_id', siteId)
  .eq('event_type', 'your_event_type');
```

### Export Data

```typescript
// Download CSV
const { data } = await supabase
  .from('analytics_events')
  .select('*')
  .eq('site_id', siteId);

const csv = data.map(row => [...]).join('\n');
const blob = new Blob([csv]);
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'analytics.csv';
a.click();
```

---

## Support & Resources

- **Supabase Documentation**: https://supabase.com/docs
- **React Documentation**: https://react.dev
- **Vite Documentation**: https://vitejs.dev
- **Tailwind CSS**: https://tailwindcss.com

---

**Built for KLA.AI by Claude Atsika**

Last Updated: 2026-06-04
