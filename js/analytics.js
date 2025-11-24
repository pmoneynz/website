/**
 * Analytics & Download Tracking for pmoneymusic.com
 * Tracks downloads, page views, and user interactions
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    gaId: 'G-DFF03CTZZZ',
    cloudflareToken: null, // Set via Cloudflare dashboard
    downloadEndpoint: '/api/track-download', // For future server-side tracking
    localStorageKey: 'pmoneyDownloads',
    maxStoredDownloads: 100
  };

  /**
   * Track file downloads
   * @param {string} filename - Name of the file being downloaded
   * @param {string} source - Source context (e.g., 'quickloops', 'quickloopspro', 'appcast')
   * @param {string} url - Full URL of the download
   */
  function trackDownload(filename, source, url) {
    const trackingData = {
      event: 'download',
      file: filename,
      source: source || 'unknown',
      url: url || window.location.href,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    // Google Analytics 4 tracking
    if (typeof gtag !== 'undefined') {
      // Standard download event
      gtag('event', 'file_download', {
        file_name: filename,
        file_extension: filename.split('.').pop(),
        file_url: url,
        download_source: source,
        page_location: window.location.href,
        page_title: document.title,
        page_path: window.location.pathname
      });

      // Product-specific event
      if (source.includes('quickloops')) {
        gtag('event', 'quickloops_download', {
          event_category: 'QuickLoops',
          event_label: source,
          value: 1
        });
      }

      if (source.includes('quickloopspro')) {
        gtag('event', 'quickloopspro_download', {
          event_category: 'QuickLoopsPro',
          event_label: source,
          value: 1
        });
      }

      // Engagement tracking
      gtag('event', 'engagement', {
        engagement_time_msec: Date.now()
      });
    }

    // Cloudflare Web Analytics (via beacon API if available)
    if (typeof navigator.sendBeacon !== 'undefined') {
      try {
        navigator.sendBeacon(
          'https://cloudflareinsights.com/cdn-cgi/rum',
          JSON.stringify({
            type: 'download',
            file: filename,
            source: source,
            url: url
          })
        );
      } catch (e) {
        // Silently fail if beacon fails
      }
    }

    // Store in localStorage for backup/offline analytics
    try {
      const downloads = JSON.parse(
        localStorage.getItem(CONFIG.localStorageKey) || '[]'
      );
      downloads.push(trackingData);
      
      // Keep only recent downloads
      if (downloads.length > CONFIG.maxStoredDownloads) {
        downloads.splice(0, downloads.length - CONFIG.maxStoredDownloads);
      }
      
      localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(downloads));
    } catch (e) {
      console.warn('Analytics: localStorage unavailable', e);
    }

    // Console log for debugging (remove in production if desired)
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
      console.log('📊 Download tracked:', trackingData);
    }
  }

  /**
   * Track page views
   */
  function trackPageView() {
    if (typeof gtag !== 'undefined') {
      gtag('config', CONFIG.gaId, {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname
      });
    }
  }

  /**
   * Intercept download links and add tracking
   */
  function setupDownloadTracking() {
    // Track clicks on download links
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Check if it's a download link
      const isDownload = 
        href.match(/\.(dmg|zip|pkg|app|dmg\.zip)$/i) ||
        link.hasAttribute('download') ||
        link.classList.contains('download-link') ||
        link.getAttribute('data-track-download');

      if (isDownload) {
        const filename = href.split('/').pop().split('?')[0];
        const source = 
          link.getAttribute('data-source') ||
          link.getAttribute('data-track-download') ||
          window.location.pathname.split('/').filter(Boolean)[0] ||
          'direct';
        
        trackDownload(filename, source, href);
      }
    }, true); // Use capture phase to catch early

    // Track direct navigation to download URLs
    if (window.location.pathname.match(/\.(dmg|zip|pkg)$/i)) {
      const filename = window.location.pathname.split('/').pop();
      trackDownload(filename, 'direct', window.location.href);
    }
  }

  /**
   * Track Sparkle appcast checks (for QuickLoopsPro updates)
   */
  function trackAppcastCheck() {
    // This would be called when appcast.xml is requested
    // Since we can't intercept XML requests from the app, we track page views
    if (window.location.pathname.includes('appcast.xml')) {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'appcast_check', {
          event_category: 'QuickLoopsPro',
          event_label: 'update_check',
          page_location: window.location.href
        });
      }
    }
  }

  /**
   * Initialize analytics
   */
  function init() {
    // Track initial page view
    trackPageView();

    // Set up download tracking
    setupDownloadTracking();

    // Track appcast checks
    trackAppcastCheck();

    // Track hash changes (SPA navigation)
    if (window.history && window.history.pushState) {
      const originalPushState = window.history.pushState;
      window.history.pushState = function() {
        originalPushState.apply(window.history, arguments);
        setTimeout(trackPageView, 100);
      };

      window.addEventListener('popstate', function() {
        setTimeout(trackPageView, 100);
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for manual use
  window.pmoneyAnalytics = {
    trackDownload: trackDownload,
    trackPageView: trackPageView
  };

})();

