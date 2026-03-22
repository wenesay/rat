/**
 * RAT Analytics - Privacy-First, Open-Source
 * https://github.com/wenesay/rat
 *
 * No cookies, no localStorage, no persistent identifiers. Respects DNT.
 * Integration: snippet only (no npm package).
 *
 * Config (set before script load):
 *   window.ratAnalyticsProjectId - Project ID (required)
 *   window.ratAnalyticsEndpoint  - Custom track URL (e.g. https://your-server.com/track)
 *   window.ratAnalyticsApiKey    - API key for X-API-Key auth on /track
 *
 * The server normally serves a dynamic script at /snippet/analytics.js with
 * the endpoint auto-injected. This file is for static/CDN hosting.
 */
(function () {
  'use strict';

  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  var projectId = window.ratAnalyticsProjectId;
  if (!projectId) {
    var meta = document.querySelector('meta[name="rat-analytics-project"]');
    if (meta) projectId = meta.getAttribute('content');
  }
  if (!projectId) {
    meta = document.querySelector('meta[name="rat-project-id"]');
    if (meta) projectId = meta.getAttribute('content');
  }
  if (!projectId) {
    console.warn(
      'RAT: Set window.ratAnalyticsProjectId or <meta name="rat-analytics-project" content="YOUR_PROJECT_ID">'
    );
    return;
  }

  var endpoint = window.ratAnalyticsEndpoint || 'https://your-rat-server.com/track';
  var apiKey = window.ratAnalyticsApiKey;

  var data = {
    projectId: projectId,
    url: window.location.href,
    referrer: document.referrer || '',
    userAgent: navigator.userAgent,
  };
  if (apiKey) data.apiKey = apiKey;
  var payload = JSON.stringify(data);

  function send() {
    var headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (navigator.sendBeacon && !apiKey) {
      if (navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }))) return;
    }
    fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: payload,
      keepalive: true,
    }).catch(function () {});
  }

  send();

  if (typeof window.history !== 'undefined' && typeof window.history.pushState === 'function') {
    var orig = history.pushState;
    history.pushState = function () {
      orig.apply(this, arguments);
      setTimeout(send, 0);
    };
    window.addEventListener('popstate', function () {
      setTimeout(send, 0);
    });
  }
})();
