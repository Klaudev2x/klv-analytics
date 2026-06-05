# START HERE - KLA.AI Analytics Setup

**Quick Start in 5 Minutes**

---

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

Wait for installation to complete.

---

## Step 2: Start Development Server (30 seconds)

```bash
npm run dev
```

You'll see output like:
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## Step 3: Open Admin Dashboard (30 seconds)

Open your browser and go to:

```
http://localhost:5173/admin/login
```

You should see the KLA.AI login page with a cyan logo.

---

## Step 4: Create an Account (1 min)

1. Click **Sign up** (or if you see a form, fill it)
2. Enter an email: `your@email.com`
3. Enter a password: `your-secure-password`
4. Click **Create Account**

After signing up, you'll be redirected to create your first site.

---

## Step 5: Create Your First Site (1 min)

You'll see a form asking for:

**Website Name**: `My Website` (or your website name)  
**Website Domain**: `example.com` (or your domain)

Then click **Create Site**

---

## Step 6: Get Your Tracking Code (1 min)

After creating the site, you'll see a popup with:

```html
<script>
  window.KLA_SITE_ID = 'YOUR_SITE_ID_HERE';
  window.KLA_API_URL = 'YOUR_API_URL_HERE';
</script>
<script src="https://your-domain.com/kla-tracker.js"></script>
```

**Copy this code** (click the "Copy Code" button)

---

## Step 7: Install Tracking Script (Optional - To Test)

If you have a website to test, paste the code into your website's `<head>` section.

If you don't have a website yet, skip to Step 8 to see the empty dashboard.

---

## Step 8: View Your Dashboard

Click **Go to Dashboard**

You'll see:
- **Active Users** card (currently 0)
- **Page Views** card (currently 0)
- **Traffic Chart** (empty)
- **Top Pages** (no data yet)
- **Activity Feed** (no events yet)

**This is normal!** Events will appear once you:
1. Install the tracking script on your website, OR
2. Visit a website with the tracking script installed

---

## Next: Install Tracking Script

### If You Have a Website

Add this to your website's `<head>` tag:

```html
<script>
  window.KLA_SITE_ID = 'PASTE_YOUR_SITE_ID_HERE';
  window.KLA_API_URL = 'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/analytics-track';
</script>
<script src="https://your-domain.com/kla-tracker.js"></script>
```

**Replace**:
- `PASTE_YOUR_SITE_ID_HERE` - The site ID from the setup wizard
- `https://0ec90b57d6e95fcbda19832f.supabase.co` - Your Supabase URL
- `https://your-domain.com` - Your website domain

### Where to Find the Files

- **Tracking Script**: Available at `/public/kla-tracker.js` in your project
- **API Endpoint**: `https://YOUR_SUPABASE_URL/functions/v1/analytics-track`
- **Dashboard**: `http://localhost:5173/admin/dashboard`

---

## Testing Locally (Without Website)

You can test the tracking script directly:

1. Open your website's browser console (F12)
2. Paste this code:

```javascript
KLATracker.track({
  eventType: 'custom',
  eventName: 'test_event'
});
KLATracker.flush();
```

3. Return to the dashboard - you should see the event!

---

## Common Issues & Fixes

### "Page won't load" or "Blank page"
- Clear browser cache (Ctrl+Shift+Delete)
- Refresh page (Ctrl+F5)
- Sign out and back in

### "Site ID not found"
- Make sure you created a site
- Copy the exact site ID from the wizard

### "Events not appearing in dashboard"
- Wait 5-10 seconds for the dashboard to refresh
- Check the site ID is correct
- Check the API URL is correct
- Open browser console for errors (F12)

### "Can't sign in"
- Make sure you signed up first
- Check email is correct
- Try a different password

---

## File Structure Quick Reference

```
Your Project
├── src/
│   └── pages/
│       └── AdminDashboard.tsx      ← Main dashboard
├── public/
│   └── kla-tracker.js              ← Tracking script
├── supabase/functions/
│   ├── analytics-track/            ← API endpoint
│   └── analytics-api/              ← Admin API
└── [documentation]
    ├── README.md                   ← Overview
    ├── QUICKSTART.md               ← Quick reference
    ├── SETUP_GUIDE.md              ← Detailed setup
    ├── ANALYTICS_README.md         ← Features
    └── IMPLEMENTATION_GUIDE.md     ← Technical details
```

---

## What Happens Next

### When You Install Tracking Script

The script will automatically:
1. ✅ Detect page views
2. ✅ Track SPA route changes
3. ✅ Intercept API calls
4. ✅ Capture JavaScript errors
5. ✅ Send events to dashboard
6. ✅ Update metrics in real-time

### When You Visit Dashboard

You'll see:
- ✅ Active users count
- ✅ Page views per day
- ✅ Traffic chart
- ✅ Top pages
- ✅ Recent events
- ✅ Any errors

All updating in real-time as events arrive!

---

## Key URLs

| Page | URL |
|------|-----|
| **Login** | http://localhost:5173/admin/login |
| **Dashboard** | http://localhost:5173/admin/dashboard |
| **Tracking API** | https://your-project.supabase.co/functions/v1/analytics-track |
| **Admin API** | https://your-project.supabase.co/functions/v1/analytics-api |

---

## Environment Variables

Your `.env` file already has:

```env
VITE_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
VITE_SUPABASE_SUPABASE_ANON_KEY=eyJhbGc...
```

These are pre-configured for your Supabase project.

---

## Dashboard Features

### Top Left
- **KLA.AI Logo** - Click to go home
- **Site Selector** - Choose which site to view
- **Sign Out** - Log out button

### Main Area
- **4 Metric Cards** - Active users, page views, response time, success rate
- **Traffic Chart** - 24-hour breakdown
- **Top Pages** - Most visited URLs
- **Event Feeds** - Live activity and errors

### Updating
- Dashboard refreshes every 5 seconds
- Events appear in real-time
- No manual refresh needed

---

## Customization Tips

### Change Dashboard Title
Edit `src/pages/AdminDashboard.tsx`

### Change Colors
Edit `tailwind.config.js`

### Change Metrics
Edit `src/components/AnalyticsDashboard.tsx`

### Track Custom Events
```javascript
KLATracker.track({
  eventType: 'custom',
  eventName: 'my_event',
  customData: { key: 'value' }
});
```

---

## Production Deployment

### Build
```bash
npm run build
```

### Deploy
1. Push to GitHub
2. Deploy via Vercel/Netlify
3. Configure environment variables
4. Done! (Supabase functions auto-deploy)

---

## Need Help?

1. **Quick reference** → QUICKSTART.md
2. **Installation help** → SETUP_GUIDE.md
3. **Feature guide** → ANALYTICS_README.md
4. **API reference** → IMPLEMENTATION_GUIDE.md
5. **Full overview** → README.md

---

## You're All Set!

Everything is ready to go. Just:

1. ✅ Run `npm run dev`
2. ✅ Go to http://localhost:5173/admin/login
3. ✅ Create an account
4. ✅ Create a site
5. ✅ Install tracking script
6. ✅ Start tracking!

---

**Questions? See the documentation files.**  
**Ready? Run `npm run dev` and start tracking!**
