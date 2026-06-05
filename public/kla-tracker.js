// KLA.AI Real-time Traffic Tracking Script
// Inject this into your website to start tracking analytics
// Usage: <script src="https://your-domain/kla-tracker.js"></script>

(function () {
  const KLATracker = {
    // Configuration
    config: {
      siteId: window.KLA_SITE_ID || '',
      apiUrl: window.KLA_API_URL || '',
      batchSize: 5,
      batchTimeout: 5000,
    },

    // State
    state: {
      sessionId: '',
      queue: [],
      batchTimer: null,
      lastPageUrl: '',
      pageStartTime: 0,
    },

    // Initialize tracker
    init() {
      if (!this.config.siteId || !this.config.apiUrl) {
        console.warn('[KLA] Missing siteId or apiUrl configuration');
        return;
      }

      this.state.sessionId = this.generateSessionId();
      this.state.pageStartTime = Date.now();

      // Track initial page view
      this.trackPageView();

      // Track navigation changes (SPA support)
      this.setupSPATracking();

      // Track API calls
      this.setupAPIInterception();

      // Track errors
      this.setupErrorTracking();

      // Track session end
      this.setupSessionTracking();

      // Get browser/device info
      const info = this.getDeviceInfo();
      this.collectGeoLocation();

      console.log('[KLA] Tracker initialized with session:', this.state.sessionId);
    },

    // Generate unique session ID
    generateSessionId() {
      const stored = this.getFromStorage('kla_session_id');
      if (stored) return stored;

      const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.saveToStorage('kla_session_id', sessionId, 24 * 60 * 60 * 1000); // 24 hours
      return sessionId;
    },

    // Track page view
    trackPageView() {
      const pageUrl = window.location.pathname + window.location.search;
      const pageTitle = document.title;
      const referrer = document.referrer;

      if (this.state.lastPageUrl === pageUrl) return; // Prevent duplicate tracking

      this.state.lastPageUrl = pageUrl;
      this.state.pageStartTime = Date.now();

      this.track({
        eventType: 'page_view',
        pageUrl,
        pageTitle,
        referrer: referrer || undefined,
      });
    },

    // Setup SPA route tracking
    setupSPATracking() {
      let lastUrl = window.location.pathname;

      // Listen for hash changes (hash-based routing)
      window.addEventListener('hashchange', () => {
        setTimeout(() => this.trackPageView(), 100);
      });

      // Listen for popstate (history changes)
      window.addEventListener('popstate', () => {
        setTimeout(() => this.trackPageView(), 100);
      });

      // Intercept history.pushState
      const originalPushState = window.history.pushState;
      window.history.pushState = function (...args) {
        originalPushState.apply(this, args);
        KLATracker.trackPageView();
      };

      // Intercept history.replaceState
      const originalReplaceState = window.history.replaceState;
      window.history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        KLATracker.trackPageView();
      };

      // Monitor DOM changes for client-side routing
      const observer = new MutationObserver(() => {
        const currentUrl = window.location.pathname;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          KLATracker.trackPageView();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    },

    // Intercept API calls
    setupAPIInterception() {
      const originalFetch = window.fetch;

      window.fetch = function (...args) {
        const startTime = Date.now();
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        const method = (args[1]?.method || 'GET').toUpperCase();

        return originalFetch
          .apply(this, args)
          .then((response) => {
            const responseTime = Date.now() - startTime;
            const status = response.status;

            // Only track API calls (not same-origin HTML pages)
            if (url.includes('/api/')) {
              KLATracker.track({
                eventType: 'api_call',
                apiEndpoint: url,
                apiMethod: method,
                apiStatus: status,
                apiResponseTime: responseTime,
              });
            }

            return response;
          })
          .catch((error) => {
            const responseTime = Date.now() - startTime;
            KLATracker.track({
              eventType: 'error',
              errorMessage: error.message,
              apiEndpoint: url,
              apiMethod: method,
              apiResponseTime: responseTime,
            });
            throw error;
          });
      };

      // Copy properties
      for (const prop in originalFetch) {
        window.fetch[prop] = originalFetch[prop];
      }
    },

    // Track errors
    setupErrorTracking() {
      window.addEventListener('error', (event) => {
        this.track({
          eventType: 'error',
          errorMessage: event.message,
          customData: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.track({
          eventType: 'error',
          errorMessage: String(event.reason),
        });
      });
    },

    // Track session end
    setupSessionTracking() {
      window.addEventListener('beforeunload', () => {
        const duration = Math.floor((Date.now() - this.state.pageStartTime) / 1000);
        this.track({
          eventType: 'session_end',
          customData: { durationSeconds: duration },
        });
        this.flush(); // Immediately send remaining events
      });
    },

    // Get device information
    getDeviceInfo() {
      const ua = navigator.userAgent;
      let device = 'desktop';
      let browser = 'unknown';
      let os = 'unknown';

      // Detect device type
      if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase())) {
        device = /ipad/i.test(ua) ? 'tablet' : 'mobile';
      }

      // Detect browser
      if (/chrome/i.test(ua)) browser = 'Chrome';
      else if (/safari/i.test(ua)) browser = 'Safari';
      else if (/firefox/i.test(ua)) browser = 'Firefox';
      else if (/edge/i.test(ua)) browser = 'Edge';
      else if (/opr/i.test(ua)) browser = 'Opera';

      // Detect OS
      if (/windows/i.test(ua)) os = 'Windows';
      else if (/mac/i.test(ua)) os = 'macOS';
      else if (/linux/i.test(ua)) os = 'Linux';
      else if (/android/i.test(ua)) os = 'Android';
      else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

      return { device, browser, os };
    },

    // Collect geolocation
    collectGeoLocation() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Could reverse-geocode here for country/city
          this.saveToStorage('kla_location', { latitude, longitude }, 60 * 60 * 1000);
        },
        () => {
          // Silently fail if permission denied
        }
      );
    },

    // Track custom event
    track(data) {
      const deviceInfo = this.getDeviceInfo();
      const payload = {
        siteId: this.config.siteId,
        sessionId: this.state.sessionId,
        eventType: data.eventType,
        eventName: data.eventName,
        pageUrl: data.pageUrl || window.location.pathname,
        pageTitle: data.pageTitle || document.title,
        referrer: data.referrer,
        apiEndpoint: data.apiEndpoint,
        apiMethod: data.apiMethod,
        apiStatus: data.apiStatus,
        apiResponseTime: data.apiResponseTime,
        errorMessage: data.errorMessage,
        customData: data.customData,
        userAgent: navigator.userAgent,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
      };

      this.state.queue.push(payload);

      // Flush if batch is full
      if (this.state.queue.length >= this.config.batchSize) {
        this.flush();
      } else {
        // Reset timer
        clearTimeout(this.state.batchTimer);
        this.state.batchTimer = setTimeout(() => this.flush(), this.config.batchTimeout);
      }
    },

    // Flush queued events
    flush() {
      if (this.state.queue.length === 0) return;

      clearTimeout(this.state.batchTimer);

      const events = this.state.queue.splice(0);

      // Send each event
      events.forEach((event) => {
        this.sendEvent(event);
      });
    },

    // Send single event
    sendEvent(event) {
      try {
        navigator.sendBeacon(
          this.config.apiUrl,
          JSON.stringify(event)
        );
      } catch (error) {
        // Fallback to fetch if sendBeacon fails
        fetch(this.config.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
          keepalive: true,
        }).catch(() => {
          // Silently fail
        });
      }
    },

    // Storage helpers
    getFromStorage(key) {
      try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (parsed.expires && parsed.expires < Date.now()) {
          localStorage.removeItem(key);
          return null;
        }
        return parsed.value;
      } catch {
        return null;
      }
    },

    saveToStorage(key, value, ttl) {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            value,
            expires: Date.now() + ttl,
          })
        );
      } catch {
        // Silently fail if storage unavailable
      }
    },
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KLATracker.init());
  } else {
    KLATracker.init();
  }

  // Expose public API
  window.KLATracker = KLATracker;
})();
