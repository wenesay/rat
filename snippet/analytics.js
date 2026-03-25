/**
 * RAT Analytics - Privacy-First, Open-Source
 * https://github.com/wenesay/rat
 *
 * Integration: snippet only (no npm package). Respects DNT.
 *
 * Config (set before script load):
 *   window.ratAnalyticsProjectId   – Project ID (optional if meta tag set)
 *   window.ratAnalyticsEndpoint   – Custom POST /track URL (default below for static CDN copies)
 *   window.ratAnalyticsApiKey      – Sent as X-API-Key on every request (not only in body)
 *   window.ratAnalyticsDisableStorage – If true, skip localStorage (no first-party session id)
 *   window.ratDebug                – If true, log payloads and send errors
 *
 * Meta fallbacks (order): name="rat-analytics-project", then name="rat-project-id".
 *
 * When served from your RAT server at /snippet/analytics.js, the default endpoint is injected.
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

  var ratDebug = window.ratDebug === true;
  var endpoint = window.ratAnalyticsEndpoint || 'https://your-rat-server.com/track';
  var apiKey = window.ratAnalyticsApiKey;

  function storageKeyForProject(id) {
    return 'rat_vid_' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function randomHex32() {
    var arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    var hex = '';
    for (var i = 0; i < arr.length; i++) {
      var h = arr[i].toString(16);
      hex += h.length === 1 ? '0' + h : h;
    }
    return hex;
  }

  var sessionId = '';
  if (window.ratAnalyticsDisableStorage !== true) {
    try {
      var lsKey = storageKeyForProject(projectId);
      sessionId = localStorage.getItem(lsKey) || '';
      if (!sessionId) {
        sessionId = randomHex32();
        localStorage.setItem(lsKey, sessionId);
      }
    } catch (e) {
      sessionId = '';
      if (ratDebug) console.warn('[RAT] storage unavailable', e);
    }
  }

  function serializeEventData(data) {
    if (data == null) return undefined;
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data);
    } catch (e) {
      return undefined;
    }
  }

  function buildPayload(ev, target, data) {
    var o = {
      projectId: projectId,
      url: window.location.href,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent,
      event: ev || 'pageview',
    };
    if (sessionId) o.sessionId = sessionId;
    if (target != null && target !== '') o.eventTarget = String(target);
    var ed = serializeEventData(data);
    if (ed !== undefined) o.eventData = ed;
    return o;
  }

  function transmit(payload) {
    var body = JSON.stringify(payload);
    var headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (ratDebug) {
      try {
        console.log('[RAT] track', payload);
      } catch (e) {}
    }
    fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: body,
      keepalive: true,
    }).catch(function (err) {
      if (ratDebug) console.warn('[RAT] send failed', err);
    });
  }

  function sendPageview() {
    transmit(buildPayload('pageview'));
  }

  window.ratTrack = function (eventName, target, data) {
    transmit(buildPayload(eventName || 'custom', target, data));
  };

  document.addEventListener(
    'click',
    function (ev) {
      var n = ev.target;
      var trackEl = null;
      for (; n && n !== document; n = n.parentElement) {
        if (n && n.hasAttribute && n.hasAttribute('data-rat-track')) {
          trackEl = n;
          break;
        }
      }
      if (!trackEl) return;
      var target = trackEl.getAttribute('data-rat-track') || '';
      var text = (trackEl.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.length > 120) text = text.substring(0, 120);
      var extra = text ? { label: text } : undefined;
      transmit(buildPayload('click', target, extra));
    },
    true
  );

  function tryPatchHistory() {
    if (typeof window.history === 'undefined' || typeof window.history.pushState !== 'function') return;
    if (history.__ratHistoryPatched) return;
    history.__ratHistoryPatched = true;
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function () {
      var ret = origPush.apply(this, arguments);
      setTimeout(sendPageview, 0);
      return ret;
    };
    history.replaceState = function () {
      var ret = origReplace.apply(this, arguments);
      setTimeout(sendPageview, 0);
      return ret;
    };
    window.addEventListener('popstate', function () {
      setTimeout(sendPageview, 0);
    });
  }

  tryPatchHistory();
  setTimeout(tryPatchHistory, 50);
  setTimeout(tryPatchHistory, 300);

  sendPageview();
})();
