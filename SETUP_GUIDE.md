# KLA.AI Analytics - Installation & Setup Guide

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Website                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  kla-tracker.js (injected script)                    │  │
│  │  - Tracks page views, API calls, errors             │  │
│  │  - Batches events for efficiency                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
            POST /functions/v1/analytics-track
                       (Event data)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Backend                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Edge Function: analytics-track                      │  │
│  │  - Validates events                                 │  │
│  │  - Rate limiting (100 events/min per session)       │  │
│  │  - Stores in database                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                 │  │
│  │  - analytics_sessions                               │  │
│  │  - analytics_events                                 │  │
│  │  - analytics_sites                                  │  │
│  │  - analytics_admin_users                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
            Supabase Realtime (WebSocket)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Admin Dashboard (React)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Live Metrics & KPIs                                 │  │
│  │  - Active users, page views, response time          │  │
│  │  - Traffic chart (24h)                              │  │
│  │  - Top pages table                                  │  │
│  │  - Activity feed (real-time events)                 │  │
│  │  - Error log                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Setup

### 1. Database Setup (Already Done)

The database schema has been created with the migration:
- `analytics_sites` - Website instances you want to track
- `analytics_sessions` - User sessions with anonymous session IDs
- `analytics_events` - Individual tracking events
- `analytics_admin_users` - Admin access control
- `analytics_aggregates` - Pre-computed analytics (optional)

All tables have Row-Level Security (RLS) enabled for security.

### 2. Deploy Edge Functions (Already Done)

Two Edge Functions have been deployed:

#### Function 1: `analytics-track`
- **Path**: `https://your-project.supabase.co/functions/v1/analytics-track`
- **Method**: POST
- **Purpose**: Receives tracking events from your website
- **Rate Limit**: 100 requests per minute per session
- **Authentication**: No JWT required (public endpoint)

#### Function 2: `analytics-api`
- **Path**: `https://your-project.supabase.co/functions/v1/analytics-api`
- **Methods**: GET, POST
- **Purpose**: Admin API for managing sites and getting analytics
- **Authentication**: Requires JWT (admin users only)

### 3. Install on Your Website

Add this to your website's `<head>` section:

```html
<script>
  // Configure KLA Analytics
  window.KLA_SITE_ID = 'YOUR_SITE_ID_HERE';
  window.KLA_API_URL = 'https://your-supabase-url.supabase.co/functions/v1/analytics-track';
  
  // Optional: Customize behavior
  window.KLA_CONFIG = {
    batchSize: 5,          // Events per batch before sending
    batchTimeout: 5000,    // Milliseconds before forced send
    trackErrors: true,     // Track JavaScript errors
    trackAPI: true         // Track fetch() calls
  };
</script>
<script src="https://your-domain.com/kla-tracker.js"></script>
```

**Where to find values:**
- `YOUR_SITE_ID_HERE` - Create a site in the admin dashboard
- `https://your-supabase-url.supabase.co` - From your `.env` file (VITE_SUPABASE_URL)
- `https://your-domain.com` - Your website domain

### 4. Access Admin Dashboard

1. **Start dev server**: `npm run dev`
2. **Go to**: `http://localhost:5173/admin/login`
3. **Sign up** with your email
4. **Create a new site** to get the site ID
5. **Copy the tracking code** from setup wizard
6. **Paste into your website** `<head>`
7. **Visit your website** to start tracking
8. **View analytics** in real-time

## File Reference

### Frontend Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app routing |
| `src/pages/AdminLogin.tsx` | Login/signup page |
| `src/pages/AdminDashboard.tsx` | Dashboard page container |
| `src/components/AnalyticsDashboard.tsx` | Main analytics UI |
| `src/components/MetricCard.tsx` | KPI card component |
| `src/components/TrafficChart.tsx` | 24h traffic bar chart |
| `src/components/TopPagesTable.tsx` | Top pages list |
| `src/components/ActivityFeed.tsx` | Event feed component |
| `src/components/SetupWizard.tsx` | Site setup wizard |
| `src/lib/analytics.ts` | API client & helpers |

### Backend Files

| File | Purpose |
|------|---------|
| `supabase/functions/analytics-track/index.ts` | Tracking endpoint |
| `supabase/functions/analytics-api/index.ts` | Admin API |

### Public Files

| File | Purpose |
|------|---------|
| `public/kla-tracker.js` | Tracking script to inject |

## Event Types

The tracking script automatically captures these events:

### Page View
```json
{
  "eventType": "page_view",
  "pageUrl": "/path",
  "pageTitle": "Page Title",
  "referrer": "https://referrer.com"
}
```

Triggered on:
- Initial page load
- Hash changes (hash routing)
- History changes (history.pushState)
- Route transitions

### API Call
```json
{
  "eventType": "api_call",
  "apiEndpoint": "/api/users",
  "apiMethod": "GET",
  "apiStatus": 200,
  "apiResponseTime": 145
}
```

Triggered on:
- Any `fetch()` call to `/api/` endpoints
- Records HTTP status and response time

### Error
```json
{
  "eventType": "error",
  "errorMessage": "Cannot read property X of undefined",
  "customData": {
    "filename": "app.js",
    "lineno": 42
  }
}
```

Triggered on:
- JavaScript errors (caught by error handler)
- Unhandled promise rejections
- Failed API calls

### Session Start/End
```json
{
  "eventType": "session_start",
  "userAgent": "Mozilla/5.0...",
  "device": "desktop",
  "browser": "Chrome",
  "os": "Windows"
}
```

Captured on:
- Page load (session_start)
- Before page unload (session_end)

### Custom Events
```javascript
KLATracker.track({
  eventType: 'custom',
  eventName: 'user_signup',
  customData: {
    plan: 'premium',
    source: 'email'
  }
});
```

## Dashboard Metrics Explained

### Active Users
Number of sessions that are currently active (not ended).

### Page Views (24h)
Total number of page_view events in the last 24 hours.

### Avg Response Time
Average API response time across all tracked API calls.

### API Success Rate
Percentage of API calls that returned 2xx status codes.

### Traffic Chart
Hourly page view distribution over the last 24 hours. Shows traffic patterns.

### Top Pages
Most visited pages ranked by view count. Helps identify popular content.

### Recent Events
Live feed of incoming tracking events. Shows activity as it happens.

### Recent Errors
JavaScript errors and failed requests. Helps identify issues.

## Customization

### Change Dashboard Branding

Edit `src/components/AnalyticsDashboard.tsx` to change:
- Logo and colors
- Metric names
- Chart types
- Layout

### Custom Tracking

In your website code:

```javascript
// Track custom user action
KLATracker.track({
  eventType: 'custom',
  eventName: 'video_played',
  customData: {
    videoId: '123',
    duration: 300
  }
});

// Track custom metric
KLATracker.track({
  eventType: 'custom',
  eventName: 'signup_complete',
  customData: {
    timestamp: Date.now(),
    plan: 'professional'
  }
});
```

### Disable Tracking

```javascript
// Completely disable tracking
if (window.doNotTrack || navigator.doNotTrack === '1') {
  window.KLA_DISABLED = true;
}
```

## Deployment

### Development

```bash
npm run dev
```

Runs on `http://localhost:5173`

### Production Build

```bash
npm run build
```

Creates optimized build in `dist/`

### Deploy to Vercel/Netlify

1. Push to GitHub
2. Connect repository
3. Deploy as static site
4. Supabase Edge Functions auto-deploy

### Deploy Tracking Script

Serve `public/kla-tracker.js` from your CDN or web server.

## Security Considerations

### 1. Rate Limiting
- Max 100 events per session per minute
- Prevents abuse of tracking endpoint

### 2. Input Sanitization
- All inputs are truncated to 500 chars
- HTML/script tags removed
- Prevents XSS attacks

### 3. Authentication
- Admin API requires valid JWT token
- Users can only see their own sites
- Row-level security on database

### 4. Data Privacy
- No personally identifiable info stored
- Anonymous session IDs only
- Optional geolocation feature
- GDPR compliant by default

### 5. CORS
- Tracking endpoint allows all origins
- Admin API restricted to authenticated users

## Troubleshooting

### Issue: Events not appearing in dashboard

**Check:**
1. Site ID is correct: `window.KLA_SITE_ID`
2. API URL is correct: `window.KLA_API_URL`
3. Script is loaded: Check browser Network tab
4. Console errors: Open browser DevTools → Console
5. Site exists: Check dashboard has a site configured

**Debug:**
```javascript
// In browser console
console.log('KLA Tracker:', window.KLATracker);
console.log('Session ID:', window.KLATracker.state.sessionId);
console.log('Queue:', window.KLATracker.state.queue);
```

### Issue: High CPU/Memory usage

**Fix:**
1. Increase `batchTimeout` to send less frequently
2. Reduce `batchSize` to send smaller batches
3. Disable error tracking if not needed
4. Review custom tracking calls

### Issue: CORS errors

**Fix:**
1. Verify Edge Function deployed
2. Check API URL is correct
3. Ensure CORS headers are sent
4. Check browser console for exact error

### Issue: Database quota exceeded

**Fix:**
1. Enable data retention (delete old events)
2. Reduce tracking frequency
3. Archive old data to separate table
4. Upgrade Supabase plan

## Performance Tips

1. **Batch events** - Default is 5 events per batch, which is optimal
2. **Lazy load dashboard** - Don't load on every page
3. **Use aggregates** - Query pre-computed metrics when possible
4. **Index frequently queried columns** - Already done in migrations
5. **Monitor query times** - Use Supabase logs to identify slow queries

## Next Steps

1. ✅ Database schema created
2. ✅ Edge Functions deployed
3. ✅ Dashboard UI built
4. → Install tracking script on your website
5. → Start collecting data
6. → Customize dashboard appearance
7. → Set up alerts (optional)
8. → Export reports (optional)

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **GitHub Issues**: Report bugs on your project repo
- **Database Queries**: Test in Supabase SQL Editor
- **Function Logs**: View in Supabase dashboard

---

**Built with ❤️ for KLA.AI by Claude Atsika**
