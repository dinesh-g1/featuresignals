package dto

// SearchHit represents a single search result across any resource type.
type SearchHit struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Category    string `json:"category"` // "flag", "segment", "environment", "member", "project"
	Href        string `json:"href"`
}

// SearchResponse is returned by GET /v1/search?q=term.
// Results are grouped by category for the overlay UI.
type SearchResponse struct {
	Query   string              `json:"query"`
	Results map[string][]SearchHit `json:"results"` // keyed by category
	Total   int                 `json:"total"`
}
