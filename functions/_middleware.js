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
    
    // Rewrite path to /quickloopspro/ prefix
    let newPathname;
    if (pathname === '/' || pathname === '') {
      newPathname = '/quickloopspro/index.html';
    } else if (pathname.startsWith('/quickloopspro/')) {
      // Already has prefix, don't double it
      newPathname = pathname;
    } else {
      // Add /quickloopspro/ prefix
      newPathname = '/quickloopspro' + pathname;
      
      // If it's a directory path without extension, try index.html
      if (!pathname.includes('.')) {
        // Check if it ends with /, if not add it
        if (!newPathname.endsWith('/')) {
          newPathname += '/';
        }
        newPathname += 'index.html';
      }
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
