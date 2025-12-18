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
    
    // If path already starts with /quickloopspro/, handle it:
    // - Paths with file extensions: pass through (internal rewrites)
    // - Directory paths: redirect to clean URLs
    if (pathname.startsWith('/quickloopspro/') || pathname === '/quickloopspro') {
      if (pathname.includes('.')) {
        // Has file extension - this is an internal rewrite, pass through
        return context.next();
      } else {
        // No file extension - redirect to clean URL
        const cleanPath = pathname.replace(/^\/quickloopspro\/?/, '/');
        url.pathname = cleanPath || '/';
        return Response.redirect(url.toString(), 301);
      }
    }
    
    // Rewrite path to /quickloopspro/ prefix (internal rewrite, not visible to user)
    let newPathname;
    if (pathname === '/' || pathname === '') {
      newPathname = '/quickloopspro/index.html';
    } else if (pathname.includes('.')) {
      // Has file extension - just add prefix
      newPathname = '/quickloopspro' + pathname;
    } else {
      // Directory path - add prefix and index.html
      newPathname = '/quickloopspro' + pathname;
      if (!newPathname.endsWith('/')) {
        newPathname += '/';
      }
      newPathname += 'index.html';
    }
    
    // Create new URL with rewritten path
    url.pathname = newPathname;
    
    // Create new request with modified URL
    const modifiedRequest = new Request(url.toString(), context.request);
    
    // Forward the modified request
    return context.next(modifiedRequest);
  }
  
  // For all other domains, pass through normally
  return context.next();
}
