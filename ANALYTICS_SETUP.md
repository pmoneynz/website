# Analytics & Download Tracking Setup Guide

This guide explains how to set up comprehensive analytics and download tracking for pmoneymusic.com.

## Overview

The analytics system tracks:
- **Page views** - All website pages
- **Downloads** - QuickLoops and QuickLoopsPro .dmg files
- **Sparkle updates** - Appcast checks for QuickLoopsPro
- **User interactions** - Button clicks, form submissions

## Components

### 1. Google Analytics 4 (Already Configured)
- **ID**: `G-DFF03CTZZZ`
- **Status**: ✅ Active
- **Dashboard**: https://analytics.google.com

### 2. Cloudflare Web Analytics (Setup Required)

**Step 1: Enable Cloudflare Web Analytics**
1. Log into Cloudflare Dashboard
2. Go to **Analytics & Logs** > **Web Analytics**
3. Click **Add a site**
4. Enter `pmoneymusic.com`
5. Copy the token provided

**Step 2: Add Token to Pages**
Replace `YOUR_CLOUDFLARE_TOKEN_HERE` in these files:
- `index.html`
- `quickloops.html`
- `quickloopspro-beta/index.html`
- `quickloopspro-beta/thanks/index.html`

The token will look like: `{"token": "abc123def456..."}`

**Benefits:**
- Privacy-friendly (no cookies)
- Free tier available
- Real-time analytics
- No GDPR consent needed

### 3. Cloudflare Worker for Direct Download Tracking

The Worker (`cloudflare-worker-download-tracker.js`) intercepts direct .dmg downloads that bypass JavaScript tracking (e.g., Sparkle updates, direct links).

**Setup Instructions:**

1. **Create Worker in Cloudflare:**
   ```
   Cloudflare Dashboard > Workers & Pages > Create Worker
   ```

2. **Paste the code:**
   - Copy contents of `cloudflare-worker-download-tracker.js`
   - Paste into Worker editor

3. **Add Route:**
   - Go to **Triggers** tab
   - Add route: `pmoneymusic.com/quickloopspro/beta/*.dmg`
   - Save

4. **Optional: Configure Environment Variables:**
   - `WEBHOOK_URL`: URL to receive download notifications (e.g., Zapier, Make.com)
   - `ANALYTICS_ENABLED`: Set to `"true"` to enable tracking
   - `DOWNLOADS_KV`: Cloudflare KV namespace for storing download logs

5. **Deploy:**
   - Click **Deploy**

**What it tracks:**
- Direct .dmg file downloads
- Sparkle update downloads
- IP address, country, user agent
- Referrer information
- Timestamp

### 4. JavaScript Download Tracking (`/js/analytics.js`)

Automatically tracks:
- Download link clicks
- Page views
- User interactions

**Manual tracking:**
```javascript
// Track a download manually
window.pmoneyAnalytics.trackDownload('filename.dmg', 'source-name', 'https://...');
```

## Viewing Analytics

### Google Analytics Dashboard

**Download Events:**
1. Go to **Reports** > **Engagement** > **Events**
2. Look for:
   - `file_download` - All downloads
   - `quickloops_download` - QuickLoops downloads
   - `quickloopspro_download` - QuickLoopsPro downloads
   - `appcast_check` - Update checks

**Custom Reports:**
Create a custom report with:
- Event name: `file_download`
- Dimensions: `file_name`, `download_source`
- Metrics: `Event count`

### Cloudflare Analytics

**Web Analytics:**
- Dashboard: Cloudflare Dashboard > Analytics & Logs > Web Analytics
- View: Page views, unique visitors, top pages

**Worker Logs:**
- Dashboard: Cloudflare Dashboard > Workers & Pages > Your Worker > Logs
- View: Download events, IP addresses, countries

### Local Storage Backup

Downloads are also stored in browser localStorage:
```javascript
// View stored downloads
JSON.parse(localStorage.getItem('pmoneyDownloads'))
```

## Tracking Sources

Downloads are tagged with sources:
- `quickloops` - From QuickLoops page
- `quickloopspro` - From QuickLoopsPro beta page
- `beta_page` - From beta signup page
- `sparkle_update` - From Sparkle update check
- `direct` - Direct link or unknown source

## Testing

**Test download tracking:**
1. Open browser console
2. Click a download link
3. Check console for: `📊 Download tracked: {...}`
4. Verify in Google Analytics (may take 24-48 hours for free accounts)

**Test Worker:**
1. Directly access: `https://pmoneymusic.com/quickloopspro/beta/QuickLoopsPro-1.0-b1.dmg`
2. Check Cloudflare Worker logs
3. Verify download completes normally

## Troubleshooting

**Downloads not tracking:**
- Check browser console for errors
- Verify `analytics.js` is loaded: `window.pmoneyAnalytics`
- Check Google Analytics Real-Time reports
- Verify Cloudflare Worker route is active

**Cloudflare Analytics not working:**
- Verify token is correct (no extra quotes)
- Check token format: `{"token": "..."}`
- Ensure script loads: Check Network tab

**Worker not intercepting:**
- Verify route pattern matches: `*.dmg`
- Check Worker is deployed and active
- Verify route is attached to correct domain

## Privacy & Compliance

- **No cookies** used (except Google Analytics)
- **No personal data** collected (IP addresses anonymized in GA)
- **GDPR compliant** (Cloudflare Analytics is privacy-friendly)
- **User consent** may be required for Google Analytics in EU

## Next Steps

1. ✅ Set up Cloudflare Web Analytics token
2. ✅ Deploy Cloudflare Worker
3. ✅ Test download tracking
4. ✅ Set up Google Analytics custom reports
5. ✅ Optional: Configure webhook for real-time notifications

## Support

For issues or questions:
- Check Cloudflare Worker logs
- Review Google Analytics Real-Time reports
- Check browser console for JavaScript errors

