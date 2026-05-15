// Package middleware provides HTTP middleware for the FeatureSignals API.
//
// This file implements API versioning enforcement via the APIVersion middleware.
// It reads the Accept-Version or X-API-Version header, validates that the
// requested version is supported, and returns appropriate deprecation/sunset
// headers for versions approaching end-of-life.
//
// Design:
//   - Currently only v1 is supported.
//   - Missing header defaults to the latest stable version (v1).
//   - Unsupported versions return 406 Not Acceptable with upgrade guidance.
//   - Deprecated versions return Sunset and Deprecation headers.
//   - A Link header points to the newer version's documentation.
//
// RFC references:
//   - Sunset: https://www.rfc-editor.org/rfc/rfc8594
//   - Deprecation: https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-deprecation-header

package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/featuresignals/server/internal/httputil"
)

// SupportedAPIVersions lists the currently supported API versions in
// descending order (newest first). The first entry is the default when
// no version header is present.
var SupportedAPIVersions = []string{"v1"}

// DeprecatedAPIVersions maps a deprecated version to the date it will
// be sunset (removed). The presence of a version in this map triggers
// Sunset and Deprecation response headers.
var DeprecatedAPIVersions = map[string]string{
	// Example: "v0": "Sat, 01 Jan 2025 00:00:00 GMT",
}

// APIVersion returns middleware that enforces API versioning. It reads
// the Accept-Version or X-API-Version header from the request and:
//
//   - Passes through if the version is supported (currently v1).
//   - Defaults to the latest version if no header is present.
//   - Returns 406 with upgrade guidance if the version is unsupported.
//   - Adds Sunset and Deprecation headers for deprecated versions.
//   - Adds a Link header pointing to the newer version's documentation.
//
// This middleware should be placed after CORS and logging but before
// authentication (version negotiation is stateless).
func APIVersion(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requested := requestedVersion(r)

		// No header — default to latest.
		if requested == "" {
			setResponseVersion(w, SupportedAPIVersions[0])
			next.ServeHTTP(w, r)
			return
		}

		// Deprecated version — add Sunset/Deprecation headers but allow.
		if sunset, ok := DeprecatedAPIVersions[requested]; ok {
			w.Header().Set("Deprecation", "true")
			w.Header().Set("Sunset", sunset)
			w.Header().Set("Link", buildVersionLink(SupportedAPIVersions[0]))
			setResponseVersion(w, requested)
			next.ServeHTTP(w, r)
			return
		}

		// Supported version — pass through.
		for _, v := range SupportedAPIVersions {
			if v == requested {
				setResponseVersion(w, requested)
				next.ServeHTTP(w, r)
				return
			}
		}

		// Unsupported version — reject.
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Link", buildVersionLink(SupportedAPIVersions[0]))
		httputil.JSON(w, http.StatusNotAcceptable, httputil.ErrorResponse{
			Error:     "unsupported api version",
			Message:   fmt.Sprintf("API version %q is not supported. Use %s.", requested, SupportedAPIVersions[0]),
			Suggestion: fmt.Sprintf("Set Accept-Version: %s or remove the header to use the latest version.", SupportedAPIVersions[0]),
			DocsURL:   "https://docs.featuresignals.com/api/versioning",
			Links:     nil,
		})
	})
}

// requestedVersion extracts the requested API version from the request
// headers. It checks Accept-Version first, then falls back to X-API-Version.
func requestedVersion(r *http.Request) string {
	if v := strings.TrimSpace(r.Header.Get("Accept-Version")); v != "" {
		return strings.ToLower(v)
	}
	if v := strings.TrimSpace(r.Header.Get("X-API-Version")); v != "" {
		return strings.ToLower(v)
	}
	return ""
}

// setResponseVersion sets the API-Version response header indicating
// which version handled the request.
func setResponseVersion(w http.ResponseWriter, version string) {
	w.Header().Set("API-Version", version)
}

// buildVersionLink creates a Link header value pointing to the
// documentation for the specified API version.
func buildVersionLink(version string) string {
	return fmt.Sprintf("<https://docs.featuresignals.com/api/%s>; rel=\"latest-version\"", version)
}
