/**
 * RAT Analytics - Privacy-First, Open-Source
 * https://github.com/wenesay/rat
 *
 * No cookies, no localStorage, no persistent identifiers. Respects DNT.
 * This file is a reference. The server normally serves a dynamic script at
 * /snippet/analytics.js with the endpoint auto-injected. For static hosting,
 * replace TRACK_ENDPOINT below with your RAT server URL + /track
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

  // When served from /snippet/analytics.js, endpoint is auto-injected by server.
  // For static use: set window.ratAnalyticsEndpoint or replace below.
  var endpoint = window.ratAnalyticsEndpoint || 'https://your-rat-server.com/track';

  var data = {
    projectId: projectId,
    url: window.location.href,
    referrer: document.referrer || '',
    userAgent: navigator.userAgent,
  };
  var payload = JSON.stringify(data);

  function send() {
    if (
      navigator.sendBeacon &&
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }))
    )
      return;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
