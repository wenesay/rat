// Rat Analytics Snippet
// Privacy-focused, lightweight analytics
(function() {
  // Configuration
  var endpoint = 'https://your-analytics-server.com/track'; // Replace with your server URL

  // Get project ID from global variable or data attribute
  var projectId = window.ratAnalyticsProjectId;
  if (!projectId) {
    // Try to find it in a meta tag
    var meta = document.querySelector('meta[name="rat-analytics-project"]');
    if (meta) {
      projectId = meta.getAttribute('content');
    }
  }

  if (!projectId) {
    console.warn('Rat Analytics: No project ID found. Set window.ratAnalyticsProjectId or add <meta name="rat-analytics-project" content="YOUR_PROJECT_ID">');
    return;
  }

  // Collect data
  var data = {
    projectId: projectId,
    url: window.location.href,
    referrer: document.referrer,
    userAgent: navigator.userAgent
  };

  // Send data asynchronously (non-blocking)
  var xhr = new XMLHttpRequest();
  xhr.open('POST', endpoint, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      // Optional: handle response
      if (xhr.status !== 200) {
        console.warn('Analytics tracking failed');
      }
    }
  };
  xhr.send(JSON.stringify(data));
})();