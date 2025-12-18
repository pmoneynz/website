/**
 * Cloudflare Pages Middleware
 * Routes quickloopspro.pmoneymusic.com subdomain to /quickloopspro/ folder
 */

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname;

  // Check if request is for quickloopspro subdomain
  if (hostname === 'quickloopspro.pmoneymusic.com' || hostname === 'www.quickloopspro.pmoneymusic.com') {
    const pathname = url.pathname;
    
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
