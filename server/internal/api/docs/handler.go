package docs

import (
	_ "embed"
	"net/http"

	"github.com/featuresignals/server/internal/httputil"
)

// DocsHandler serves the OpenAPI spec and the API documentation landing page.
type DocsHandler struct {
	specJSON    []byte
	swaggerHTML string
}

// NewDocsHandler creates a handler that serves the OpenAPI spec.
// It embeds the spec at build time and serves it directly from memory.
func NewDocsHandler() *DocsHandler {
	return &DocsHandler{
		specJSON:    embeddedSpec,
		swaggerHTML: swaggerHTMLContent,
	}
}

//go:embed spec.json
var embeddedSpec []byte

// swaggerHTMLContent is the self-contained Swagger UI page, embedded at compile time.
// Keeping it as a string constant avoids the need for a separate swagger.html file
// that would otherwise need to be generated during CI builds.
const swaggerHTMLContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FeatureSignals API Documentation</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%234F46E5'/><path d='M8 16l5 5L24 10' stroke='white' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    :root {
      --fs-indigo-50: #EEF2FF;
      --fs-indigo-100: #E0E7FF;
      --fs-indigo-500: #6366F1;
      --fs-indigo-600: #4F46E5;
      --fs-indigo-700: #4338CA;
      --fs-indigo-800: #3730A3;
      --fs-indigo-900: #312E81;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    #header {
      background: linear-gradient(135deg, var(--fs-indigo-700), var(--fs-indigo-600));
      color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; box-shadow: 0 2px 8px rgba(49, 46, 129, 0.18);
    }
    #header .brand { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
    #header .brand svg { flex-shrink: 0; }
    #header .controls { display: flex; align-items: center; gap: 12px; }
    #header .controls label { font-size: 13px; opacity: 0.9; font-weight: 500; }
    #header select {
      appearance: none; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
      color: #fff; font-size: 13px; font-weight: 500; padding: 6px 32px 6px 12px;
      border-radius: 6px; cursor: pointer; outline: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 10px center;
    }
    #header select:hover { background-color: rgba(255,255,255,0.25); }
    #header select option { color: #1e1b4b; background: #fff; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: var(--fs-indigo-800); font-size: 28px; }
    .swagger-ui .info a { color: var(--fs-indigo-600); }
    .swagger-ui .scheme-container { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .swagger-ui .btn.authorize { color: var(--fs-indigo-600); }
    .swagger-ui .btn.authorize svg { fill: var(--fs-indigo-600); }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: var(--fs-indigo-600); }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #059669; }
    .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #D97706; }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #DC2626; }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #7C3AED; }
    .swagger-ui .tab li { position: relative; }
    .swagger-ui .tab li button { color: var(--fs-indigo-600); }
    .swagger-ui .tab li.active button { color: var(--fs-indigo-600); }
    .swagger-ui .tab li.active button::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: var(--fs-indigo-600); border-radius: 3px 3px 0 0; }
    .swagger-ui .model-title { color: var(--fs-indigo-800); }
    .swagger-ui .response-col_status { font-weight: 500; }
    .swagger-ui section.models .model-container { border-radius: 4px; }
    .swagger-ui .opblock-tag { color: var(--fs-indigo-800); font-weight: 700; }
    .swagger-ui .opblock-tag:hover { background: var(--fs-indigo-50); }
  </style>
</head>
<body>
<div id="header">
  <div class="brand">
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="rgba(255,255,255,0.18)"/>
      <path d="M8 16l5 5L24 10" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    FeatureSignals API
  </div>
  <div class="controls">
    <label for="env-select">Environment:</label>
    <select id="env-select" title="Select API environment">
      <option value="http://localhost:8080" selected>Development</option>
      <option value="https://api-staging.featuresignals.com">Staging</option>
      <option value="https://api.featuresignals.com">Production</option>
    </select>
  </div>
</div>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
<script>
(function() {
  var specUrl = '/v1/openapi.json';
  var ui = SwaggerUIBundle({
    url: specUrl, dom_id: '#swagger-ui', deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis], layout: 'BaseLayout',
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    tryItOutEnabled: true, filter: true, showExtensions: true, showCommonExtensions: true,
    defaultModelsExpandDepth: 1, defaultModelExpandDepth: 2, docExpansion: 'list',
    displayRequestDuration: true, displayOperationId: false, persistAuthorization: true,
    requestSnippetsEnabled: true,
    requestSnippets: { defaultGenerators: ['curl', 'javascript_fetch', 'node_native'], showGeneratedFiles: true },
    onComplete: function() { updateBaseUrl(); }
  });
  var envSelect = document.getElementById('env-select');
  function updateBaseUrl() {
    var baseUrl = envSelect.value;
    var uiSpec = ui.getSystem().specSelectors.specJson();
    if (uiSpec && uiSpec.servers) {
      ui.updateSpec(Object.assign({}, uiSpec, { servers: [{ url: baseUrl, description: 'Selected Environment' }] }));
    }
  }
  envSelect.addEventListener('change', updateBaseUrl);
})();
</script>
</body>
</html>`

// OpenAPISpec serves the OpenAPI spec as JSON.
func (h *DocsHandler) OpenAPISpec(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.WriteHeader(http.StatusOK)
	w.Write(h.specJSON) //nolint:errcheck
}

// SwaggerUI serves the self-contained Swagger UI HTML page.
func (h *DocsHandler) SwaggerUI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(h.swaggerHTML)) //nolint:errcheck
}

// Index serves a simple JSON landing page for /docs.
func (h *DocsHandler) Index(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=3600")
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"service":    "FeatureSignals API",
		"docs":       "/docs/openapi.json",
		"playground": "https://docs.featuresignals.com/api-playground",
		"swagger":    "/v1/docs",
		"version":    "1.0.0",
	})
}
