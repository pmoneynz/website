# Google Analytics 4 Setup Guide

## 🚀 Your site is ready for Google Analytics 4!

### Step 1: Get your GA4 Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property for `pmoneymusic.com`
3. Copy your Measurement ID (format: `G-DFF03CTZZZ`)

### Step 2: Replace the placeholder

Replace `G-DFF03CTZZZ` with your actual Measurement ID in these files:
- `index.html` (line ~21)
- `quickloops.html` (line ~17) 
- `sequencer.html` (line ~8)
- `404.html` (line ~8)

### Step 3: Enable Enhanced Measurement

In your GA4 dashboard:
1. Go to Admin → Data Streams
2. Click your web stream
3. Enable "Enhanced measurement"
4. Turn on "File downloads" specifically

### What's Already Tracked

✅ **Page views** - All pages automatically tracked
✅ **File downloads** - QuickLoops DMG downloads with detailed metrics
✅ **Custom events** - Special QuickLoops download events
✅ **User engagement** - Enhanced tracking for better insights

### Download Event Details

When someone downloads QuickLoops, these events are sent:
- `file_download` - Standard GA4 file download event
- `quickloops_download` - Custom event for QuickLoops specifically
- `engagement` - User engagement tracking

### Quick Find & Replace

To update all files at once, run:
```bash
find . -name "*.html" -exec sed -i '' 's/G-DFF03CTZZZ/YOUR_ACTUAL_ID/g' {} \;
```

Replace `YOUR_ACTUAL_ID` with your real GA4 Measurement ID.

### Verification

After setup, test by:
1. Visiting your site
2. Downloading QuickLoops
3. Checking GA4 Real-time reports

Your download tracking will show detailed analytics including:
- Download source (quickloops page, social media, etc.)
- User browser and device info
- Geographic location
- Time-based patterns
