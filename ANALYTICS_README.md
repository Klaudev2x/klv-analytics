# KLA.AI Real-Time Traffic Tracking System

A complete, production-ready real-time analytics platform for tracking website traffic, API usage, and visitor behavior with a live admin dashboard.

## Overview

This system consists of:

1. **Tracking API** - Edge Function endpoint that receives tracking events
2. **Tracking Script** - Lightweight JavaScript injected into your website
3. **Admin Dashboard** - Real-time analytics UI with live metrics
4. **Supabase Backend** - Database and authentication

## Architecture

```
Your Website
    ↓
[kla-tracker.js] - Tracks events
    ↓
Edge Function: analytics-track
    ↓
Supabase Database
    ↓
Admin Dashboard (React)
    ↓
Supabase Realtime (WebSocket)
```

## Quick Start

### 1. Setup Environment Variables

Your `.env` file already contains Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Access the Dashboard

- **Login**: `http://localhost:5173/admin/login`
- Create an account or sign in
- Create a new site in the dashboard

### 5. Install Tracking Script on Your Website

Add this to the `<head>` of your website:

```html
<script>
  window.KLA_SITE_ID = 'YOUR_SITE_ID_HERE';
  window.KLA_API_URL = 'https://your-project.supabase.co/functions/v1/analytics-track';
</script>
<script src="https://your-domain.com/kla-tracker.js"></script>
```

Replace:
- `YOUR_SITE_ID_HERE` - The site ID from your dashboard
- `https://your-project.supabase.co` - Your Supabase URL
- `https://your-domain.com` - Your website domain

## File Structure

```
project/
├── src/
│   ├── components/
│   │   ├── AnalyticsDashboard.tsx      # Main dashboard
│   │   ├── MetricCard.tsx              # Stats cards
│   │   ├── TrafficChart.tsx            # 24h traffic chart
│   │   ├── TopPagesTable.tsx           # Top pages list
│   │   └── ActivityFeed.tsx            # Event feed
│   ├── pages/
│   │   ├── AdminLogin.tsx              # Login page
│   │   └── AdminDashboard.tsx          # Dashboard page
│   ├── lib/
│   │   └── analytics.ts                # API client
│   └── App.tsx
├── public/
│   └── kla-tracker.js                  # Tracking script
├── supabase/
│   └── functions/
│       ├── analytics-track/            # Event tracking endpoint
│       └── analytics-api/              # Admin API
└── .env                                # Configuration
```

## Metrics Tracked

### Real-Time Metrics
- **Active Users** - Currently online visitors
- **Page Views** - Total page views in 24h
- **API Requests** - Total API calls tracked
- **Success Rate** - Percentage of successful requests
- **Response Time** - Average API response time

### Events
- **page_view** - User visits a page
- **api_call** - Frontend API request
- **error** - JavaScript error or failed request
- **custom** - Custom tracked events
- **session_start** - User session begins
- **session_end** - User session ends

### Session Data
- Session ID
- Device type (mobile/tablet/desktop)
- Browser (Chrome, Safari, Firefox, etc.)
- Operating system
- Country/City (if available)
- Referrer
- User agent

## How the Tracking Works

### 1. Tracking Script (`kla-tracker.js`)

Automatically tracks:
- Page views on load and route changes
- API calls via fetch interceptor
- JavaScript errors
- Session duration
- Browser/device info

Batches events for performance (max 5 events per batch or every 5 seconds)

### 2. Tracking Endpoint

**URL**: `https://your-project.supabase.co/functions/v1/analytics-track`

**Method**: POST

**Payload**:
```json
{
  "siteId": "site_uuid",
  "sessionId": "session_uuid",
  "eventType": "page_view|api_call|error|custom|session_start|session_end",
  "pageUrl": "/path",
  "pageTitle": "Page Title",
  "apiEndpoint": "/api/endpoint",
  "apiMethod": "GET|POST|PUT|DELETE",
  "apiStatus": 200,
  "apiResponseTime": 145,
  "errorMessage": "Error text",
  "customData": {}
}
```

**Response**:
```json
{
  "success": true
}
```

### 3. Database Schema

**analytics_sites** - Website instances
- id (uuid)
- name (text)
- domain (text)
- site_key (text)
- owner_id (uuid)

**analytics_sessions** - User sessions
- id (uuid)
- site_id (uuid)
- session_id (text)
- user_agent (text)
- device_type (text)
- browser (text)
- os (text)
- country (text)
- started_at (timestamp)
- ended_at (timestamp)
- duration_seconds (int)

**analytics_events** - Individual events
- id (uuid)
- site_id (uuid)
- session_id (text)
- event_type (text)
- page_url (text)
- page_title (text)
- api_endpoint (text)
- api_method (text)
- api_status (int)
- api_response_time_ms (int)
- error_message (text)
- created_at (timestamp)

## Admin Dashboard

### Accessing the Dashboard

1. Go to `http://localhost:5173/admin/login`
2. Sign up or sign in with your email
3. Create a new site and get the `site_id`
4. View real-time analytics

### Dashboard Features

- **KPI Cards** - Active users, page views, response time, success rate
- **Traffic Chart** - Hourly page views for last 24 hours
- **Top Pages** - Most visited pages with view counts
- **Activity Feed** - Real-time event stream
- **Error Feed** - Recent errors and exceptions

## Creating a Site

```typescript
// Via API
const response = await fetch(`${SUPABASE_URL}/functions/v1/analytics-api/sites`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    name: 'My Website',
    domain: 'example.com'
  })
});

const site = await response.json();
console.log(site.id); // Use this as KLA_SITE_ID
```

## Security

### Row-Level Security (RLS)

All database tables have RLS enabled:
- Users can only view their own sites
- Admins can only access assigned sites
- Public event insertion is rate-limited

### Rate Limiting

- 100 events per minute per session
- Enforced on the tracking endpoint

### Data Privacy

- No personally identifiable information (PII) stored
- Anonymous session IDs
- Optional geolocation
- Sanitized inputs (XSS prevention)

## Performance Optimization

### Tracking Script

- Uses batching (5 events per batch)
- Sends events every 5 seconds max
- Uses `sendBeacon` for reliability
- Lightweight (~5KB gzipped)
- Does not block page rendering

### Dashboard

- Queries aggregated data where possible
- Real-time updates via Supabase Realtime
- Caches on the client side
- Responsive design

### Database

- Indexes on frequently queried columns
- Aggregated metrics table for fast queries
- Automatic data cleanup (optional)

## Customization

### Custom Events

Track custom events from your website:

```javascript
// In your website
KLATracker.track({
  eventType: 'custom',
  eventName: 'user_signup',
  customData: {
    plan: 'premium',
    source: 'email'
  }
});
```

### Tracking Configuration

```html
<script>
  window.KLA_SITE_ID = 'YOUR_SITE_ID';
  window.KLA_API_URL = 'YOUR_API_URL';
  // Optional: customize tracking
  window.KLA_CONFIG = {
    batchSize: 10,        // Events per batch
    batchTimeout: 3000,   // Milliseconds between batches
    trackErrors: true,    // Track JavaScript errors
    trackAPI: true        // Track fetch requests
  };
</script>
<script src="/kla-tracker.js"></script>
```

### Dashboard Customization

Edit the dashboard components in `src/components/` to customize colors, layout, and metrics.

## Deployment

### Build

```bash
npm run build
```

### Deploy

The system is already set up for Bolt deployment:
1. Supabase functions are deployed
2. Database migrations are applied
3. Static files are served from `/public`

### Custom Deployment

For self-hosted or custom deployments:

1. Deploy Supabase backend
2. Deploy Edge Functions
3. Deploy React dashboard to static host
4. Serve tracking script from `/public`

## Environment Variables

```env
# Supabase (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Rate limiting
ANALYTICS_RATE_LIMIT_REQUESTS=100
ANALYTICS_RATE_LIMIT_WINDOW_MS=60000

# Optional: Data retention
ANALYTICS_DATA_RETENTION_DAYS=90
```

## Troubleshooting

### Events Not Appearing

1. Check `KLA_SITE_ID` is correctly set on your website
2. Check `KLA_API_URL` is correct
3. Check browser console for errors
4. Verify site ID exists in dashboard

### Dashboard Not Loading

1. Sign in at `/admin/login`
2. Create a site if you haven't
3. Check Supabase connection

### Slow Performance

1. Check rate limiting is working
2. Review database indexes
3. Reduce query time range
4. Check network latency

## Support

For issues or questions:
1. Check the database in Supabase console
2. Review browser console errors
3. Check Edge Function logs

## License

Part of KLA.AI - Real-time analytics platform by Claude Atsika
