# QuickLoops Pro Email Download System - Setup Guide

## Overview

This system captures email addresses and sends download links via Brevo transactional email.

**Flow:**
1. User enters email on landing page
2. Cloudflare Worker stores email in KV and sends email via Brevo
3. User receives email with download link
4. User clicks link → Download page → Downloads app

## Architecture

```
Landing Page (index.html)
    ↓ POST /api/subscribe
Cloudflare Worker
    ├── Store in KV (QUICKLOOPS_EMAILS)
    └── Send via Brevo API
           ↓
User Email Inbox
    ↓ Click download link
Download Page (/download/)
    ↓
DMG Download
```

---

## Part 1: Brevo Setup

### Step 1: Create Brevo Account

1. Go to [brevo.com](https://www.brevo.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Key

1. Log into Brevo
2. Click your name (top right) → **SMTP & API**
3. Go to **API Keys** tab
4. Click **Generate a new API key**
5. Name it: `QuickLoops Pro Worker`
6. Copy the API key (starts with `xkeysib-...`)

**Save this key securely - you'll need it for the Cloudflare Worker.**

### Step 3: Verify Sender Domain

For emails to be delivered reliably, verify your sending domain:

1. Go to **Senders, Domains & Dedicated IPs** (left menu)
2. Click **Domains** tab
3. Click **Add a domain**
4. Enter: `pmoneymusic.com`
5. Add the DNS records Brevo provides:
   - DKIM record (TXT)
   - Brevo code record (TXT)
6. Wait for verification (usually 5-15 minutes)

### Step 4: Add Sender Email

1. Go to **Senders, Domains & Dedicated IPs**
2. Click **Senders** tab
3. Click **Add a sender**
4. Enter:
   - **Name**: `QuickLoops Pro`
   - **Email**: `hello@pmoneymusic.com` (or your preferred sender)
5. Verify the sender email

### Brevo Free Tier Limits

- 300 emails/day
- No credit card required
- Full analytics (opens, clicks, bounces)
- Free forever

---

## Part 2: Cloudflare Worker Setup

### Step 1: Create KV Namespace

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **KV**
3. Click **Create a namespace**
4. Name: `QUICKLOOPS_EMAILS`
5. Click **Add**

### Step 2: Create Worker

1. Go to **Workers & Pages** → **Overview**
2. Click **Create Worker**
3. Name: `quickloops-email-api`
4. Click **Deploy** (creates empty worker)
5. Click **Edit code**
6. Delete default code
7. Copy contents of `cloudflare-email-worker.js` and paste
8. Click **Deploy**

### Step 3: Configure Environment Variables

1. Go to your worker → **Settings** → **Variables**
2. Add these **Environment Variables**:

| Variable Name | Value |
|--------------|-------|
| `BREVO_API_KEY` | `xkeysib-your-api-key-here` |
| `SENDER_EMAIL` | `hello@pmoneymusic.com` |
| `SENDER_NAME` | `QuickLoops Pro` |

3. Click **Encrypt** for `BREVO_API_KEY` (security)
4. Click **Save and Deploy**

### Step 4: Bind KV Namespace

1. Go to your worker → **Settings** → **Variables**
2. Scroll to **KV Namespace Bindings**
3. Click **Add binding**
4. Variable name: `EMAILS_KV`
5. KV namespace: Select `QUICKLOOPS_EMAILS`
6. Click **Save and Deploy**

### Step 5: Add Route

1. Go to **Workers & Pages** → **your worker**
2. Go to **Settings** → **Triggers**
3. Under **Routes**, click **Add route**
4. Route: `quickloopspro.pmoneymusic.com/api/*`
5. Zone: Select `pmoneymusic.com`
6. Click **Save**

**Alternative (if using subdomain):**
If `quickloopspro.pmoneymusic.com` is configured as a Pages site, add the route via Pages instead:
1. Go to **Workers & Pages** → **Your Pages project**
2. **Settings** → **Functions**
3. Add the worker binding

---

## Part 3: DNS Configuration

### Subdomain Setup

Add DNS record for the subdomain:

1. Go to **DNS** → **Records**
2. Add CNAME record:
   - **Type**: CNAME
   - **Name**: `quickloopspro`
   - **Target**: `pmoneymusic.com` (or your Pages URL)
   - **Proxy status**: Proxied (orange cloud)

---

## Part 4: Testing

### Test Locally

1. Start local server:
   ```bash
   cd public_html && python3 -m http.server 8000
   ```

2. Open: `http://localhost:8000/quickloopspro/`

3. Note: API calls will fail locally (no worker). Test the form UI only.

### Test Production

1. Deploy your site to Cloudflare Pages
2. Visit: `https://quickloopspro.pmoneymusic.com/`
3. Enter a test email
4. Check:
   - Form shows "Check your email" message
   - Email arrives in inbox
   - Click link → Download page works
   - Download starts when button clicked

### Check Brevo Analytics

1. Log into Brevo
2. Go to **Transactional** → **Email**
3. View:
   - Emails sent
   - Open rate
   - Click rate
   - Bounces

### Check Cloudflare KV

1. Go to **Workers & Pages** → **KV**
2. Click **QUICKLOOPS_EMAILS**
3. View stored email entries

---

## File Structure

```
public_html/
├── quickloopspro/
│   ├── index.html           # Landing page with email form
│   ├── download/
│   │   └── index.html       # Download page (from email link)
│   ├── thanks/
│   │   └── index.html       # Legacy (can remove)
│   └── beta/
│       └── QuickLoopsPro-1.0-b1.dmg
└── cloudflare-email-worker.js   # Worker code (deploy to Cloudflare)
```

---

## Troubleshooting

### Emails not sending

1. Check Brevo API key is correct
2. Verify sender domain/email is verified in Brevo
3. Check Cloudflare Worker logs: **Workers** → **Your worker** → **Logs**

### Form submission fails

1. Check browser console for errors
2. Verify Worker route is configured correctly
3. Check CORS headers in Worker response

### Downloads not working

1. Verify DMG file exists at `/quickloopspro/beta/QuickLoopsPro-1.0-b1.dmg`
2. Check file permissions

### Email goes to spam

1. Verify DKIM/SPF records are properly configured
2. Ensure sender domain is verified in Brevo
3. Check email content isn't triggering spam filters

---

## Analytics

### Google Analytics Events

- `email_capture` - Form submitted
- `file_download` - Download button clicked

### Brevo Analytics

- Opens
- Clicks
- Bounces
- Spam complaints

### Cloudflare Analytics

- Worker invocations
- KV reads/writes
- Error rates

---

## Maintenance

### Update Download File

1. Upload new DMG to `/quickloopspro/beta/`
2. Update filename in:
   - `cloudflare-email-worker.js` (email template)
   - `download/index.html` (download URL)
   - Landing page if needed

### Export Email List

1. Go to Cloudflare Dashboard → **KV**
2. Click **QUICKLOOPS_EMAILS**
3. Export entries (or use Cloudflare API for bulk export)

### Monitor Usage

- Brevo: 300 emails/day limit
- Cloudflare Workers: 100k requests/day (free)
- KV: 100k reads/day, 1k writes/day (free)
