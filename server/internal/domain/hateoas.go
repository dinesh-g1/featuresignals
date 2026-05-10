// Package domain — HATEOAS link types and helpers.
//
// HATEOAS (Hypermedia as the Engine of Application State) links provide
// clients with discoverable next actions. Every collection and resource
// response includes a _links array so clients don't need to hardcode URL
// structures.

package domain

import "fmt"

// Link represents a hypermedia link in API responses (RFC 8288 / HAL-style).
type Link struct {
	Rel    string `json:"rel"`
	Href   string `json:"href"`
	Method string `json:"method,omitempty"`
	Title  string `json:"title,omitempty"`
}

// Links is a slice of Link used in API responses.
type Links []Link

// ────────────────────────────────────────────────────────────────────
// Resource-level link helpers (for GET single-resource responses)
// ────────────────────────────────────────────────────────────────────

// LinksForFlag returns HATEOAS links for a single flag resource.
func LinksForFlag(projectID, flagKey string) Links {
	base := fmt.Sprintf("/v1/projects/%s/flags/%s", projectID, flagKey)
	return Links{
		{Rel: "self", Href: base, Method: "GET"},
		{Rel: "update", Href: base, Method: "PUT", Title: "Update this flag"},
		{Rel: "delete", Href: base, Method: "DELETE", Title: "Delete this flag"},
		{Rel: "flag-states", Href: base + "/environments", Method: "GET", Title: "View per-environment flag states"},
		{Rel: "history", Href: base + "/history", Method: "GET", Title: "View flag version history"},
	}
}

// LinksForProject returns HATEOAS links for a single project resource.
func LinksForProject(projectID string) Links {
	base := fmt.Sprintf("/v1/projects/%s", projectID)
	return Links{
		{Rel: "self", Href: base, Method: "GET"},
		{Rel: "update", Href: base, Method: "PUT", Title: "Update this project"},
		{Rel: "delete", Href: base, Method: "DELETE", Title: "Delete this project"},
		{Rel: "flags", Href: base + "/flags", Method: "GET", Title: "List flags in this project"},
		{Rel: "environments", Href: base + "/environments", Method: "GET", Title: "List environments in this project"},
		{Rel: "segments", Href: base + "/segments", Method: "GET", Title: "List segments in this project"},
	}
}

// LinksForSegment returns HATEOAS links for a single segment resource.
func LinksForSegment(projectID, segmentKey string) Links {
	base := fmt.Sprintf("/v1/projects/%s/segments/%s", projectID, segmentKey)
	return Links{
		{Rel: "self", Href: base, Method: "GET"},
		{Rel: "update", Href: base, Method: "PUT", Title: "Update this segment"},
		{Rel: "delete", Href: base, Method: "DELETE", Title: "Delete this segment"},
	}
}

// LinksForEnvironment returns HATEOAS links for a single environment resource.
func LinksForEnvironment(projectID, envID string) Links {
	return Links{
		{Rel: "self", Href: fmt.Sprintf("/v1/projects/%s/environments/%s", projectID, envID), Method: "GET"},
		{Rel: "update", Href: fmt.Sprintf("/v1/projects/%s/environments/%s", projectID, envID), Method: "PUT", Title: "Update this environment"},
		{Rel: "delete", Href: fmt.Sprintf("/v1/projects/%s/environments/%s", projectID, envID), Method: "DELETE", Title: "Delete this environment"},
		{Rel: "api-keys", Href: fmt.Sprintf("/v1/environments/%s/api-keys", envID), Method: "GET", Title: "Manage API keys for this environment"},
	}
}

// LinksForAPIKey returns HATEOAS links for a single API key resource.
func LinksForAPIKey(keyID string) Links {
	return Links{
		{Rel: "self", Href: fmt.Sprintf("/v1/api-keys/%s", keyID), Method: "GET"},
		{Rel: "revoke", Href: fmt.Sprintf("/v1/api-keys/%s", keyID), Method: "DELETE", Title: "Revoke this API key"},
		{Rel: "rotate", Href: fmt.Sprintf("/v1/api-keys/%s/rotate", keyID), Method: "POST", Title: "Rotate this API key"},
	}
}

// ────────────────────────────────────────────────────────────────────
// Collection-level link helpers (for list endpoints)
// ────────────────────────────────────────────────────────────────────

// LinksForFlagsCollection returns HATEOAS links for the flags list.
func LinksForFlagsCollection(projectID string) Links {
	return Links{
		{Rel: "self", Href: fmt.Sprintf("/v1/projects/%s/flags", projectID), Method: "GET"},
		{Rel: "create-flag", Href: fmt.Sprintf("/v1/projects/%s/flags", projectID), Method: "POST", Title: "Create a new flag"},
		{Rel: "project", Href: fmt.Sprintf("/v1/projects/%s", projectID), Method: "GET", Title: "Parent project"},
	}
}

// LinksForProjectsCollection returns HATEOAS links for the projects list.
func LinksForProjectsCollection() Links {
	return Links{
		{Rel: "self", Href: "/v1/projects", Method: "GET"},
		{Rel: "create-project", Href: "/v1/projects", Method: "POST", Title: "Create a new project"},
	}
}

// LinksForSegmentsCollection returns HATEOAS links for the segments list.
func LinksForSegmentsCollection(projectID string) Links {
	return Links{
		{Rel: "self", Href: fmt.Sprintf("/v1/projects/%s/segments", projectID), Method: "GET"},
		{Rel: "create-segment", Href: fmt.Sprintf("/v1/projects/%s/segments", projectID), Method: "POST", Title: "Create a new segment"},
		{Rel: "project", Href: fmt.Sprintf("/v1/projects/%s", projectID), Method: "GET", Title: "Parent project"},
	}
}

// LinksForEnvironmentsCollection returns HATEOAS links for the environments list.
func LinksForEnvironmentsCollection(projectID string) Links {
	return Links{
		{Rel: "self", Href: fmt.Sprintf("/v1/projects/%s/environments", projectID), Method: "GET"},
		{Rel: "create-environment", Href: fmt.Sprintf("/v1/projects/%s/environments", projectID), Method: "POST", Title: "Create a new environment"},
		{Rel: "project", Href: fmt.Sprintf("/v1/projects/%s", projectID), Method: "GET", Title: "Parent project"},
	}
}

// LinksForAPIKeysCollection returns HATEOAS links for the API keys list.
func LinksForAPIKeysCollection(envID string) Links {
	return Links{
		{Rel: "self", Href: fmt.Sprintf("/v1/environments/%s/api-keys", envID), Method: "GET"},
		{Rel: "create-api-key", Href: fmt.Sprintf("/v1/environments/%s/api-keys", envID), Method: "POST", Title: "Create a new API key"},
	}
}

// ────────────────────────────────────────────────────────────────────
// Error context links
// ────────────────────────────────────────────────────────────────────

// LinksForError returns HATEOAS links that help a developer recover from an error.
func LinksForError(docsURL string) Links {
	links := Links{
		{Rel: "docs", Href: "https://featuresignals.com/docs/api-reference/overview", Method: "GET", Title: "API documentation"},
	}
	if docsURL != "" {
		links = append(links, Link{
			Rel: "docs-specific", Href: docsURL, Method: "GET", Title: "Relevant documentation for this error",
		})
	}
	return links
}
