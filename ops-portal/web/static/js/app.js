// FeatureSignals Ops Portal - Client-side JavaScript
(function () {
  "use strict";

  // Global escapeHtml helper — escapes for HTML element content (not attributes)
  window.escapeHtml = function (str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  // Global escapeJsStr helper — escapes for JavaScript single-quoted string literal.
  // Use this when injecting values into JS strings embedded in HTML onclick attributes.
  // Escapes: backslash, single quote, newline, carriage return, line/paragraph separators.
  window.escapeJsStr = function (str) {
    if (!str) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  };

  // Auto-refresh for dashboard every 30 seconds
  if (window.location.pathname === "/dashboard") {
    setInterval(function () {
      var refreshEl = document.getElementById("refresh-time");
      if (refreshEl) refreshEl.textContent = new Date().toISOString();
      var container = document.querySelector(".cluster-grid");
      if (container && typeof window.refreshDashboard === "function") {
        window.refreshDashboard();
      }
    }, 30000);
  }

  // Fetch current user and apply role-based visibility
  async function applyRBAC() {
    try {
      var resp = await fetch("/api/v1/auth/me");
      if (!resp.ok) return;
      var user = await resp.json();
      document.body.dataset.userRole = user.role;

      var weights = { admin: 2, engineer: 1, viewer: 0 };
      document.querySelectorAll("[data-rbac]").forEach(function (el) {
        var requiredRole = el.dataset.rbac;
        if (weights[user.role] < weights[requiredRole]) {
          el.style.display = "none";
        }
      });
    } catch (e) {}
  }

  applyRBAC();
})();
