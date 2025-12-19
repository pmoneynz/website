/**
 * Cloudflare Pages Middleware
 * - Routes quickloopspro.pmoneymusic.com subdomain to /quickloopspro/ folder
 * - Tracks .dmg downloads from /quickloopspro/releases/
 * 
 * Required bindings for download tracking:
 *   - DOWNLOAD_STATS: KV namespace for counters
 *   - WEBHOOK_URL (optional): Secret for webhook notifications
 */

export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Track .dmg downloads from /quickloopspro/releases/
  if (url.pathname.startsWith('/quickloopspro/releases/') && url.pathname.endsWith('.dmg')) {
    trackDownload(context, url.pathname);
  }

  // Check if request is for quickloopspro subdomain
  if (hostname === 'quickloopspro.pmoneymusic.com' || hostname === 'www.quickloopspro.pmoneymusic.com') {
    const pathname = url.pathname;

    // Also track subdomain downloads at /releases/
    if (pathname.startsWith('/releases/') && pathname.endsWith('.dmg')) {
      trackDownload(context, '/quickloopspro' + pathname);
    }
    
    // Don't interfere with API routes
    if (pathname.startsWith('/api/')) {
      return context.next();
    }
    
    // Redirect /quickloopspro/* paths to clean URLs (user-facing only, not file paths)
    if ((pathname.startsWith('/quickloopspro/') || pathname === '/quickloopspro') && !pathname.includes('.')) {
      const cleanPath = pathname.replace(/^\/quickloopspro\/?/, '/');
      url.pathname = cleanPath || '/';
      return Response.redirect(url.toString(), 301);
    }
    
    // Build the asset path
    let assetPath;
    if (pathname === '/' || pathname === '') {
      assetPath = '/quickloopspro/index.html';
    } else if (pathname.includes('.')) {
      assetPath = '/quickloopspro' + pathname;
    } else {
      // Directory path - add prefix and index.html
      assetPath = '/quickloopspro' + pathname;
      if (!assetPath.endsWith('/')) {
        assetPath += '/';
      }
      assetPath += 'index.html';
    }
    
    // Fetch the asset directly (bypasses middleware loop)
    const assetUrl = new URL(assetPath, url.origin);
    return context.env.ASSETS.fetch(assetUrl);
  }
  
  // For all other domains, pass through normally
  return context.next();
}

/**
 * Track download stats via KV and optional webhook
 */
function trackDownload(context, filePath) {
  const { request, env, waitUntil } = context;
  const fileName = filePath.split('/').pop() || 'unknown';
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const meta = {
    filePath,
    fileName,
    date: dateKey,
    timestamp: now.toISOString(),
    userAgent: request.headers.get('user-agent') || '',
    referer: request.headers.get('referer') || '',
  };

  // Increment KV counters
  if (env.DOWNLOAD_STATS) {
    const totalKey = `total:${fileName}`;
    const dailyKey = `daily:${fileName}:${dateKey}`;

    waitUntil(incrementCounter(env.DOWNLOAD_STATS, totalKey));
    waitUntil(incrementCounter(env.DOWNLOAD_STATS, dailyKey));
  }

  // Webhook notification
  if (env.WEBHOOK_URL) {
    waitUntil(
      fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(meta),
      }).catch(() => {})
    );
  }
}

async function incrementCounter(KV, key) {
  const current = await KV.get(key);
  const next = (current ? parseInt(current, 10) : 0) + 1;
  await KV.put(key, String(next));
}
