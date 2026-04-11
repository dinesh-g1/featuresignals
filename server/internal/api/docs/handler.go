package docs

import (
	_ "embed"
	"net/http"

	"github.com/featuresignals/server/internal/httputil"
)

// DocsHandler serves the OpenAPI spec and the API documentation landing page.
type DocsHandler struct {
	specJSON []byte
}

// NewDocsHandler creates a handler that serves the OpenAPI spec.
// It embeds the spec at build time and serves it directly from memory.
func NewDocsHandler() *DocsHandler {
	return &DocsHandler{specJSON: embeddedSpec}
}

//go:embed spec.json
var embeddedSpec []byte

// OpenAPISpec serves the OpenAPI spec as JSON.
func (h *DocsHandler) OpenAPISpec(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.WriteHeader(http.StatusOK)
	w.Write(h.specJSON) //nolint:errcheck
}

// Index serves a simple JSON landing page for /docs.
func (h *DocsHandler) Index(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=3600")
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"service":    "FeatureSignals API",
		"docs":       "/docs/openapi.json",
		"playground": "https://docs.featuresignals.com/api-playground",
		"version":    "1.0.0",
	})
}
