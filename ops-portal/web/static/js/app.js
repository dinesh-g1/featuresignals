// FeatureSignals Ops Portal - Client-side JavaScript
(function () {
  "use strict";

  // Global escapeHtml helper
  window.escapeHtml = function (str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
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
