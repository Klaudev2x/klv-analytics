// KLV.AI Real-time Traffic Tracking Script
// Inject this into your website to start tracking analytics
// Usage: <script src="https://your-domain/kla-tracker.js"></script>

(function () {
  const KLVTracker = {
    config: {
      siteId: window.KLV_SITE_ID || window.KLA_SITE_ID || '',
      apiUrl: window.KLV_API_URL || window.KLA_API_URL || '',
      batchSize: 5,
      batchTimeout: 5000,
    },

    state: {
      sessionId: '',
      queue: [],
      batchTimer: null,
      lastPageUrl: '',
      pageStartTime: 0,
    },

    init() {
      if (!this.config.siteId || !this.config.apiUrl) {
        console.warn('[KLV] Missing siteId or apiUrl configuration');
        return;
      }

      this.state.sessionId = this.generateSessionId();
      this.state.pageStartTime = Date.now();
      this.trackPageView();
      this.setupSPATracking();
      this.setupAPIInterception();
      this.setupErrorTracking();
      this.setupSessionTracking();
      this.getDeviceInfo();

      console.log('[KLV] Tracker initialized with session:', this.state.sessionId);
    },

    generateSessionId() {
      const stored = this.getFromStorage('klv_session_id');
      if (stored) return stored;

      const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.saveToStorage('klv_session_id', sessionId, 24 * 60 * 60 * 1000);
      return sessionId;
    },

    trackPageView() {
      const pageUrl = window.location.pathname + window.location.search;
      const pageTitle = document.title;
      const referrer = document.referrer;

      if (this.state.lastPageUrl === pageUrl) return;

      this.state.lastPageUrl = pageUrl;
      this.state.pageStartTime = Date.now();

      this.track({
        eventType: 'page_view',
        pageUrl,
        pageTitle,
        referrer: referrer || undefined,
      });
    },

    setupSPATracking() {
      let lastUrl = window.location.pathname;

      window.addEventListener('hashchange', () => {
        setTimeout(() => this.trackPageView(), 100);
      });

      window.addEventListener('popstate', () => {
        setTimeout(() => this.trackPageView(), 100);
      });

      const originalPushState = window.history.pushState;
      window.history.pushState = function (...args) {
        originalPushState.apply(this, args);
        KLVTracker.trackPageView();
      };

      const originalReplaceState = window.history.replaceState;
      window.history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        KLVTracker.trackPageView();
      };

      const observer = new MutationObserver(() => {
        const currentUrl = window.location.pathname;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          KLVTracker.trackPageView();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    },

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

            if (url.includes('/api/')) {
              KLVTracker.track({
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
            KLVTracker.track({
              eventType: 'error',
              errorMessage: error.message,
              apiEndpoint: url,
              apiMethod: method,
              apiResponseTime: responseTime,
            });
            throw error;
          });
      };

      for (const prop in originalFetch) {
        window.fetch[prop] = originalFetch[prop];
      }
    },

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

    setupSessionTracking() {
      window.addEventListener('beforeunload', () => {
        const duration = Math.floor((Date.now() - this.state.pageStartTime) / 1000);
        this.track({
          eventType: 'session_end',
          customData: { durationSeconds: duration },
        });
        this.flush();
      });
    },

    getDeviceInfo() {
      const ua = navigator.userAgent;
      let device = 'desktop';
      let browser = 'unknown';
      let os = 'unknown';

      if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase())) {
        device = /ipad/i.test(ua) ? 'tablet' : 'mobile';
      }

      if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = 'Chrome';
      else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
      else if (/firefox/i.test(ua)) browser = 'Firefox';
      else if (/edge/i.test(ua)) browser = 'Edge';
      else if (/opr/i.test(ua)) browser = 'Opera';

      if (/windows/i.test(ua)) os = 'Windows';
      else if (/mac/i.test(ua)) os = 'macOS';
      else if (/linux/i.test(ua)) os = 'Linux';
      else if (/android/i.test(ua)) os = 'Android';
      else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

      return { device, browser, os };
    },

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

      if (this.state.queue.length >= this.config.batchSize) {
        this.flush();
      } else {
        clearTimeout(this.state.batchTimer);
        this.state.batchTimer = setTimeout(() => this.flush(), this.config.batchTimeout);
      }
    },

    flush() {
      if (this.state.queue.length === 0) return;
      clearTimeout(this.state.batchTimer);
      const events = this.state.queue.splice(0);
      events.forEach((event) => this.sendEvent(event));
    },

    sendEvent(event) {
      try {
        navigator.sendBeacon(
          this.config.apiUrl,
          JSON.stringify(event)
        );
      } catch {
        fetch(this.config.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
          keepalive: true,
        }).catch(() => {});
      }
    },

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
        localStorage.setItem(key, JSON.stringify({ value, expires: Date.now() + ttl }));
      } catch {}
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KLVTracker.init());
  } else {
    KLVTracker.init();
  }

  window.KLVTracker = KLVTracker;
  window.KLATracker = KLVTracker; // backwards compat
})();
