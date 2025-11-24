# Quick Start: Analytics Setup

## Immediate Actions Required

### 1. Get Cloudflare Web Analytics Token (5 minutes)

1. Go to: https://dash.cloudflare.com
2. Navigate: **Analytics & Logs** > **Web Analytics**
3. Click: **Add a site**
4. Enter: `pmoneymusic.com`
5. Copy the token (looks like: `{"token": "abc123..."}`)

### 2. Add Token to Your Pages

Replace `YOUR_CLOUDFLARE_TOKEN_HERE` in these 4 files:
- `index.html` (line ~32)
- `quickloops.html` (line ~30)
- `quickloopspro-beta/index.html` (line ~12)
- `quickloopspro-beta/thanks/index.html` (line ~12)

**Find and replace:**
```html
data-cf-beacon='{"token": "YOUR_CLOUDFLARE_TOKEN_HERE"}'
```

**With your actual token:**
```html
data-cf-beacon='{"token": "abc123def456..."}'
```

### 3. Deploy Cloudflare Worker (Optional but Recommended)

**Why:** Tracks direct .dmg downloads (Sparkle updates, direct links)

1. Go to: https://dash.cloudflare.com > **Workers & Pages**
2. Click: **Create Worker**
3. Name it: `download-tracker`
4. Copy code from: `cloudflare-worker-download-tracker.js`
5. Paste into Worker editor
6. Click: **Deploy**
7. Go to **Triggers** tab
8. Add route: `pmoneymusic.com/quickloopspro/beta/*.dmg`
9. Save

## What's Already Working

✅ **Google Analytics 4** - Tracking page views and downloads  
✅ **JavaScript Download Tracking** - Tracks clicks on download links  
✅ **Local Storage Backup** - Stores downloads in browser  

## Testing

After setup, test:
1. Visit: https://pmoneymusic.com/quickloops.html
2. Open browser console (F12)
3. Click download link
4. Should see: `📊 Download tracked: {...}`

## View Your Data

- **Google Analytics**: https://analytics.google.com
  - Events > `file_download`, `quickloops_download`, `quickloopspro_download`
  
- **Cloudflare Analytics**: Cloudflare Dashboard > Analytics & Logs > Web Analytics

- **Worker Logs**: Cloudflare Dashboard > Workers & Pages > download-tracker > Logs

## Need Help?

See full documentation: `ANALYTICS_SETUP.md`

