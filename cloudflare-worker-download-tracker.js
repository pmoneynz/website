/**
 * Cloudflare Worker: Download Tracker for QuickLoopsPro Beta
 * 
 * This worker intercepts requests to .dmg files and tracks downloads
 * before serving the file. It logs to Cloudflare Analytics and can
 * send webhook notifications.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard > Workers & Pages
 * 2. Create a new Worker
 * 3. Paste this code
 * 4. Add route: pmoneymusic.com/quickloopspro/beta/*.dmg
 * 5. Set environment variables (optional):
 *    - WEBHOOK_URL: URL to send download notifications
 *    - ANALYTICS_ENABLED: "true" to enable tracking
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Only track .dmg files in the beta directory
    if (!url.pathname.match(/\/quickloopspro\/beta\/.*\.dmg$/i)) {
      // Not a tracked file, pass through
      return fetch(request);
    }

    // Extract download metadata
    const filename = url.pathname.split('/').pop();
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'direct';
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const country = request.cf?.country || 'unknown';
    
    // Determine source
    let source = 'direct';
    if (referer.includes('appcast.xml')) {
      source = 'sparkle_update';
    } else if (referer.includes('quickloopspro')) {
      source = 'beta_page';
    } else if (referer.includes('quickloops')) {
      source = 'quickloops_page';
    }

    // Log download event
    const downloadEvent = {
      event: 'download',
      file: filename,
      source: source,
      timestamp: new Date().toISOString(),
      ip: ip,
      country: country,
      userAgent: userAgent,
      referer: referer,
      url: url.toString()
    };

    // Log to console (visible in Cloudflare Workers dashboard)
    console.log('Download tracked:', JSON.stringify(downloadEvent));

    // Send webhook notification if configured
    if (env.WEBHOOK_URL) {
      ctx.waitUntil(
        fetch(env.WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(downloadEvent)
        }).catch(err => {
          console.error('Webhook failed:', err);
        })
      );
    }

    // Track in Cloudflare Analytics (via KV if needed)
    if (env.DOWNLOADS_KV) {
      const key = `download:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      ctx.waitUntil(
        env.DOWNLOADS_KV.put(key, JSON.stringify(downloadEvent), {
          expirationTtl: 31536000 // 1 year
        }).catch(err => {
          console.error('KV write failed:', err);
        })
      );
    }

    // Serve the file (pass through to origin)
    const response = await fetch(request);
    
    // Add custom headers for tracking (optional)
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers),
        'X-Download-Tracked': 'true',
        'X-Download-Source': source
      }
    });

    return modifiedResponse;
  }
};

