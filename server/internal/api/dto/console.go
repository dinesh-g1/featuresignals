package dto

import (
	"net/http"
	"strconv"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Console List Params ───────────────────────────────────────────────────

// ParseConsoleListParams extracts query parameters for the console flag list
// endpoint with sensible defaults.
func ParseConsoleListParams(r *http.Request) domain.ConsoleListParams {
	p := ParsePagination(r)

	return domain.ConsoleListParams{
		ProjectID:   r.URL.Query().Get("project_id"),
		Environment: r.URL.Query().Get("environment"),
		Stage:       r.URL.Query().Get("stage"),
		Search:      r.URL.Query().Get("search"),
		Sort:        parseConsoleSort(r),
		Limit:       p.Limit,
		Offset:      p.Offset,
	}
}

// parseConsoleSort validates and normalises the sort parameter for console flags.
// Allowed fields: stage, status, name, key, eval_volume, health_score, updated_at.
// Defaults to "updated_at:desc".
func parseConsoleSort(r *http.Request) string {
	allowed := map[string]bool{
		"stage": true, "status": true, "name": true, "key": true,
		"eval_volume": true, "health_score": true, "updated_at": true,
		"created_at": true,
	}

	raw := r.URL.Query().Get("sort")
	if raw == "" {
		return "updated_at:desc"
	}

	field, dir := splitConsoleSort(raw)
	if !allowed[field] {
		return "updated_at:desc"
	}

	switch dir {
	case "asc", "ASC":
		return field + ":asc"
	case "desc", "DESC":
		return field + ":desc"
	default:
		return field + ":desc"
	}
}

func splitConsoleSort(raw string) (field, dir string) {
	for i, c := range raw {
		if c == ':' {
			return raw[:i], raw[i+1:]
		}
	}
	return raw, "desc"
}

// ─── Console Flag Response ─────────────────────────────────────────────────

// ConsoleFlagResponse is the API response shape for a single console flag.
type ConsoleFlagResponse struct {
	domain.ConsoleFlag
	Links domain.Links `json:"_links,omitempty"`
}

// ConsoleFlagListResponse is the paginated API response for the console flag list.
type ConsoleFlagListResponse struct {
	Data    []domain.ConsoleFlag `json:"data"`
	Total   int                  `json:"total"`
	Limit   int                  `json:"limit"`
	Offset  int                  `json:"offset"`
	HasMore bool                 `json:"has_more"`
	Links   domain.Links         `json:"_links,omitempty"`
}

// ─── Ship Request ──────────────────────────────────────────────────────────

// ShipRequest is the request body for POST /v1/console/flags/{key}/ship.
type ShipRequest struct {
	TargetPercent int      `json:"target_percent"`
	GuardMetrics  []string `json:"guard_metrics"`
	Environment   string   `json:"environment"`
}

// Validate checks the ship request for basic correctness.
func (r *ShipRequest) Validate() error {
	if r.TargetPercent < 0 || r.TargetPercent > 100 {
		return domain.NewValidationError("target_percent", "must be between 0 and 100")
	}
	if r.Environment == "" {
		return domain.NewValidationError("environment", "is required")
	}
	for _, m := range r.GuardMetrics {
		if m == "" {
			return domain.NewValidationError("guard_metrics", "must not contain empty values")
		}
	}
	return nil
}

// ─── Toggle Request ────────────────────────────────────────────────────────

// ToggleRequest is the request body for POST /v1/console/flags/{key}/toggle.
type ToggleRequest struct {
	Action string `json:"action"` // "pause" or "resume"
}

// Validate checks the toggle request for basic correctness.
func (r *ToggleRequest) Validate() error {
	switch r.Action {
	case "pause", "resume":
		return nil
	default:
		return domain.NewValidationError("action", "must be 'pause' or 'resume'")
	}
}

// ─── Advance Request ───────────────────────────────────────────────────────

// AdvanceRequest is the request body for POST /v1/console/flags/{key}/advance.
type AdvanceRequest struct {
	Environment string `json:"environment"`
}

// ─── Help Context Response ─────────────────────────────────────────────────

// HelpContextResponse wraps the domain HelpContext for the API.
type HelpContextResponse struct {
	domain.HelpContext
	Links domain.Links `json:"_links,omitempty"`
}

// ─── Query param helpers ───────────────────────────────────────────────────

// parseIntQuery extracts an integer query parameter with a default value.
func parseIntQuery(r *http.Request, key string, defaultVal int) int {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v < 0 {
		return defaultVal
	}
	return v
}
