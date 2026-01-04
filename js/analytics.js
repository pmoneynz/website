/**
 * Analytics & Event Tracking for pmoneymusic.com
 * Comprehensive Google Analytics 4 implementation
 * 
 * Tracks: downloads, page views, user interactions, scroll depth,
 * video engagement, form submissions, navigation, and more.
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    gaId: 'G-H43N0T5ZK1',
    debug: window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1'),
    scrollThresholds: [25, 50, 75, 90, 100],
    engagementInterval: 15000, // Track engagement every 15 seconds
    maxEngagementTime: 1800000, // Max 30 minutes
    localStorageKey: 'pmoney_analytics'
  };

  // Track which scroll thresholds have been triggered
  const scrollMilestones = new Set();
  let engagementTimer = null;
  let totalEngagementTime = 0;
  let pageLoadTime = Date.now();
  let isPageVisible = true;

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  function log(...args) {
    if (CONFIG.debug) {
      console.log('📊 Analytics:', ...args);
    }
  }

  function getPageContext() {
    const path = window.location.pathname;
    let pageType = 'other';
    let product = null;

    if (path === '/' || path === '/index.html') {
      pageType = 'home';
    } else if (path.includes('/about')) {
      pageType = 'about';
    } else if (path.includes('/quickloopspro')) {
      pageType = 'product';
      product = 'quickloopspro';
      if (path.includes('/download')) {
        pageType = 'download';
      } else if (path.includes('/thanks')) {
        pageType = 'thank_you';
      }
    } else if (path.includes('/sequencer')) {
      pageType = 'tool';
      product = 'web_sampler';
    } else if (path.includes('/404') || document.title.includes('Not Found')) {
      pageType = 'error_404';
    }

    return { pageType, product, path };
  }

  function sanitizeText(text) {
    if (!text) return '';
    return text.trim().substring(0, 100).replace(/\s+/g, ' ');
  }

  function getElementInfo(element) {
    if (!element) return {};
    
    return {
      tag: element.tagName?.toLowerCase(),
      id: element.id || undefined,
      classes: element.className ? element.className.split(' ').slice(0, 3).join(' ') : undefined,
      text: sanitizeText(element.textContent || element.innerText),
      href: element.href || element.getAttribute('href') || undefined,
      ariaLabel: element.getAttribute('aria-label') || undefined
    };
  }

  // ============================================
  // CORE TRACKING FUNCTIONS
  // ============================================

  /**
   * Send event to Google Analytics
   */
  function trackEvent(eventName, params = {}) {
    if (typeof gtag === 'undefined') {
      log('gtag not available, event queued:', eventName);
      return;
    }

    const context = getPageContext();
    const enrichedParams = {
      page_type: context.pageType,
      page_path: context.path,
      ...params
    };

    if (context.product) {
      enrichedParams.product = context.product;
    }

    gtag('event', eventName, enrichedParams);
    log('Event tracked:', eventName, enrichedParams);
  }

  /**
   * Track page view with enhanced data
   */
  function trackPageView() {
    if (typeof gtag === 'undefined') return;

    const context = getPageContext();
    
    gtag('config', CONFIG.gaId, {
      page_title: document.title,
      page_location: window.location.href,
      page_path: context.path,
      page_type: context.pageType,
      content_group: context.product || context.pageType
    });

    // Custom page_view event with extra context
    trackEvent('page_view_enhanced', {
      referrer: document.referrer,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      color_scheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      language: navigator.language,
      is_returning: localStorage.getItem(CONFIG.localStorageKey) ? 'yes' : 'no'
    });

    // Mark user as returning
    localStorage.setItem(CONFIG.localStorageKey, JSON.stringify({
      firstVisit: localStorage.getItem(CONFIG.localStorageKey) 
        ? JSON.parse(localStorage.getItem(CONFIG.localStorageKey)).firstVisit 
        : Date.now(),
      lastVisit: Date.now(),
      visitCount: (JSON.parse(localStorage.getItem(CONFIG.localStorageKey) || '{}').visitCount || 0) + 1
    }));

    log('Page view tracked:', context);
  }

  // ============================================
  // DOWNLOAD TRACKING
  // ============================================

  /**
   * Track file downloads with comprehensive data
   */
  function trackDownload(filename, source, url) {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    trackEvent('file_download', {
      file_name: filename,
      file_extension: extension,
      file_url: url || window.location.href,
      download_source: source || 'direct',
      link_text: filename
    });

    // Product-specific download events
    if (source?.includes('quickloops') || filename?.includes('QuickLoops')) {
      trackEvent('quickloops_download', {
        event_category: 'Downloads',
        event_label: filename,
        product: 'quickloopspro',
        value: 1
      });
    }

    // Track as conversion
    trackEvent('generate_lead', {
      currency: 'USD',
      value: 0,
      lead_type: 'download'
    });
  }

  /**
   * Auto-detect and track download link clicks
   */
  function setupDownloadTracking() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Check if it's a download
      const isDownload = 
        href.match(/\.(dmg|zip|pkg|app|pdf|exe|msi)$/i) ||
        link.hasAttribute('download') ||
        link.classList.contains('download-link') ||
        link.getAttribute('data-track-download');

      if (isDownload) {
        const filename = href.split('/').pop().split('?')[0];
        const source = 
          link.getAttribute('data-source') ||
          link.getAttribute('data-track-download') ||
          getPageContext().product ||
          'direct';
        
        trackDownload(filename, source, href);
      }
    }, true);

    log('Download tracking initialized');
  }

  // ============================================
  // CLICK TRACKING
  // ============================================

  /**
   * Track clicks on important elements
   */
  function setupClickTracking() {
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a, button, [data-track-click]');
      if (!target) return;

      const elementInfo = getElementInfo(target);
      const isExternal = target.hostname && target.hostname !== window.location.hostname;
      const isButton = target.tagName === 'BUTTON' || target.classList.contains('btn');

      // External link clicks
      if (isExternal) {
        trackEvent('click', {
          link_type: 'external',
          link_url: target.href,
          link_domain: target.hostname,
          link_text: elementInfo.text || elementInfo.ariaLabel || 'unknown'
        });
        return;
      }

      // CTA Button clicks
      if (isButton || target.classList.contains('btn-primary')) {
        trackEvent('cta_click', {
          button_text: elementInfo.text || elementInfo.ariaLabel,
          button_id: elementInfo.id,
          button_classes: elementInfo.classes,
          destination: elementInfo.href || 'none'
        });
        return;
      }

      // Navigation clicks
      if (target.closest('nav, .nav, .nav-links, footer')) {
        trackEvent('navigation_click', {
          nav_text: elementInfo.text || elementInfo.ariaLabel,
          nav_destination: elementInfo.href,
          nav_location: target.closest('footer') ? 'footer' : 'header'
        });
        return;
      }

      // Social link clicks
      const socialPlatforms = ['twitter', 'instagram', 'youtube', 'spotify', 'facebook', 'linkedin', 'x.com'];
      if (elementInfo.href && socialPlatforms.some(p => elementInfo.href.includes(p))) {
        const platform = socialPlatforms.find(p => elementInfo.href.includes(p));
        trackEvent('social_click', {
          social_platform: platform === 'x.com' ? 'twitter' : platform,
          link_url: elementInfo.href
        });
      }

      // Track elements with data-track-click attribute
      if (target.hasAttribute('data-track-click')) {
        trackEvent('element_click', {
          element_name: target.getAttribute('data-track-click'),
          element_text: elementInfo.text,
          element_id: elementInfo.id
        });
      }
    }, true);

    log('Click tracking initialized');
  }

  // ============================================
  // SCROLL TRACKING
  // ============================================

  function setupScrollTracking() {
    let ticking = false;

    function checkScrollDepth() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (docHeight <= 0) return;
      
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      CONFIG.scrollThresholds.forEach(threshold => {
        if (scrollPercent >= threshold && !scrollMilestones.has(threshold)) {
          scrollMilestones.add(threshold);
          trackEvent('scroll', {
            percent_scrolled: threshold,
            scroll_depth: `${threshold}%`
          });
        }
      });

      ticking = false;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(checkScrollDepth);
        ticking = true;
      }
    }, { passive: true });

    log('Scroll tracking initialized');
  }

  // ============================================
  // VIDEO TRACKING
  // ============================================

  function setupVideoTracking() {
    // YouTube iframe tracking
    function trackYouTubeVideos() {
      const iframes = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
      
      iframes.forEach(iframe => {
        // Track when video section scrolls into view
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              trackEvent('video_view', {
                video_provider: 'youtube',
                video_url: iframe.src,
                video_title: iframe.title || 'unknown'
              });
              observer.unobserve(iframe);
            }
          });
        }, { threshold: 0.5 });

        observer.observe(iframe);
      });
    }

    // HTML5 video tracking
    function trackHTML5Videos() {
      document.querySelectorAll('video').forEach(video => {
        video.addEventListener('play', () => {
          trackEvent('video_start', {
            video_provider: 'html5',
            video_url: video.src || video.currentSrc,
            video_title: video.getAttribute('title') || 'unknown'
          });
        }, { once: true });

        video.addEventListener('ended', () => {
          trackEvent('video_complete', {
            video_provider: 'html5',
            video_url: video.src || video.currentSrc,
            video_duration: Math.round(video.duration)
          });
        });
      });
    }

    trackYouTubeVideos();
    trackHTML5Videos();
    log('Video tracking initialized');
  }

  // ============================================
  // FORM TRACKING
  // ============================================

  function setupFormTracking() {
    document.addEventListener('submit', function(e) {
      const form = e.target.closest('form');
      if (!form) return;

      const formId = form.id || form.getAttribute('name') || 'unknown';
      const formAction = form.action || window.location.href;

      trackEvent('form_submit', {
        form_id: formId,
        form_name: formId,
        form_destination: formAction
      });

      // Email capture form specific tracking
      if (form.id === 'emailForm' || form.querySelector('input[type="email"]')) {
        trackEvent('generate_lead', {
          currency: 'USD',
          value: 0,
          lead_type: 'email_signup'
        });
      }
    }, true);

    // Track form field focus (form start)
    document.addEventListener('focusin', function(e) {
      const form = e.target.closest('form');
      if (!form || form.dataset.formStarted) return;

      form.dataset.formStarted = 'true';
      trackEvent('form_start', {
        form_id: form.id || form.getAttribute('name') || 'unknown'
      });
    });

    log('Form tracking initialized');
  }

  // ============================================
  // ENGAGEMENT TRACKING
  // ============================================

  function setupEngagementTracking() {
    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      isPageVisible = !document.hidden;
      
      if (document.hidden) {
        // Page hidden - pause engagement
        if (engagementTimer) {
          clearInterval(engagementTimer);
          engagementTimer = null;
        }
      } else {
        // Page visible - resume engagement
        startEngagementTimer();
      }
    });

    // Start engagement timer
    function startEngagementTimer() {
      if (engagementTimer) return;

      engagementTimer = setInterval(() => {
        if (!isPageVisible || totalEngagementTime >= CONFIG.maxEngagementTime) return;

        totalEngagementTime += CONFIG.engagementInterval;
        
        // Track engagement milestones (30s, 60s, 120s, 300s)
        const seconds = totalEngagementTime / 1000;
        if ([30, 60, 120, 300].includes(seconds)) {
          trackEvent('user_engagement', {
            engagement_time_sec: seconds,
            engagement_milestone: `${seconds}s`
          });
        }
      }, CONFIG.engagementInterval);
    }

    startEngagementTimer();

    // Track time on page when leaving
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
      
      // Use sendBeacon for reliability
      if (navigator.sendBeacon && typeof gtag !== 'undefined') {
        trackEvent('page_exit', {
          time_on_page_sec: timeOnPage,
          scroll_depth_reached: Math.max(...scrollMilestones) || 0,
          engagement_time_sec: Math.round(totalEngagementTime / 1000)
        });
      }
    });

    log('Engagement tracking initialized');
  }

  // ============================================
  // SECTION VISIBILITY TRACKING
  // ============================================

  function setupSectionTracking() {
    const sections = document.querySelectorAll('section[id], [data-track-section]');
    
    if (sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id || entry.target.getAttribute('data-track-section') || 'unknown';
          const sectionTitle = entry.target.querySelector('h2, h3')?.textContent || sectionId;
          
          trackEvent('section_view', {
            section_id: sectionId,
            section_title: sanitizeText(sectionTitle)
          });
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(section => observer.observe(section));
    log('Section tracking initialized for', sections.length, 'sections');
  }

  // ============================================
  // ERROR TRACKING
  // ============================================

  function setupErrorTracking() {
    // Track 404 pages
    if (document.title.includes('Not Found') || window.location.pathname.includes('404')) {
      trackEvent('page_not_found', {
        requested_url: window.location.href,
        referrer: document.referrer
      });
    }

    // Track JavaScript errors
    window.addEventListener('error', (e) => {
      trackEvent('javascript_error', {
        error_message: e.message?.substring(0, 100),
        error_source: e.filename,
        error_line: e.lineno
      });
    });

    log('Error tracking initialized');
  }

  // ============================================
  // SPA NAVIGATION TRACKING
  // ============================================

  function setupSPATracking() {
    if (!window.history || !window.history.pushState) return;

    const originalPushState = window.history.pushState;
    window.history.pushState = function() {
      originalPushState.apply(window.history, arguments);
      setTimeout(() => {
        scrollMilestones.clear();
        trackPageView();
      }, 100);
    };

    window.addEventListener('popstate', function() {
      setTimeout(() => {
        scrollMilestones.clear();
        trackPageView();
      }, 100);
    });

    // Track hash changes
    window.addEventListener('hashchange', () => {
      trackEvent('hash_navigation', {
        hash: window.location.hash
      });
    });

    log('SPA navigation tracking initialized');
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    log('Initializing comprehensive analytics...');

    // Core tracking
    trackPageView();
    
    // Event tracking modules
    setupDownloadTracking();
    setupClickTracking();
    setupScrollTracking();
    setupFormTracking();
    setupEngagementTracking();
    setupSectionTracking();
    setupErrorTracking();
    setupSPATracking();

    // Delayed video tracking (wait for embeds to load)
    setTimeout(setupVideoTracking, 1000);

    log('Analytics fully initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.pmoneyAnalytics = {
    trackEvent: trackEvent,
    trackDownload: trackDownload,
    trackPageView: trackPageView,
    getConfig: () => ({ ...CONFIG }),
    debug: (enabled) => { CONFIG.debug = enabled; }
  };

})();
