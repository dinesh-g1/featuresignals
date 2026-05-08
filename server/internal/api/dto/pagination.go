package dto

import (
	"math"
	"net/http"
	"strconv"

	"github.com/featuresignals/server/internal/domain"
)

const (
	DefaultLimit = 50
	MaxLimit     = 100
)

// ─── Query params ────────────────────────────────────────────────────

type PaginationParams struct {
	Limit  int
	Offset int
}

func ParsePagination(r *http.Request) PaginationParams {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	if offset < 0 {
		offset = 0
	}
	return PaginationParams{Limit: limit, Offset: offset}
}

// ─── Sort params ─────────────────────────────────────────────────────

var allowedSortFields = map[string][]string{
	"flags":         {"key", "name", "created_at", "updated_at", "status"},
	"segments":      {"key", "name", "created_at", "updated_at"},
	"environments":  {"name", "created_at", "updated_at"},
	"projects":      {"name", "created_at", "updated_at"},
	"api_keys":      {"name", "created_at", "last_used_at"},
	"webhooks":      {"name", "created_at", "updated_at"},
	"approvals":     {"created_at", "updated_at", "status"},
	"audit":         {"created_at", "action", "resource_type"},
	"members":       {"created_at", "name", "email", "role"},
}

// ParseSort extracts sort param and validates against the allowlist for the resource type.
// Returns (column, direction) where direction is "ASC" or "DESC".
// If the sort field is not allowed, returns ("created_at", "DESC") as safe default.
func ParseSort(r *http.Request, resourceType string) (string, string) {
	raw := r.URL.Query().Get("sort")
	if raw == "" {
		return "created_at", "DESC"
	}

	// Split "field:asc" or "field:desc"
	parts := splitSort(raw)
	field := parts[0]
	dir := "ASC"
	if len(parts) > 1 {
		switch parts[1] {
		case "desc", "DESC":
			dir = "DESC"
		case "asc", "ASC":
			dir = "ASC"
		}
	}

	// Validate field against allowlist
	allowed, ok := allowedSortFields[resourceType]
	if !ok {
		return "created_at", "DESC"
	}
	for _, a := range allowed {
		if a == field {
			return field, dir
		}
	}

	return "created_at", "DESC"
}

func splitSort(raw string) []string {
	for i, c := range raw {
		if c == ':' {
			return []string{raw[:i], raw[i+1:]}
		}
	}
	return []string{raw}
}

// ─── Response shape ──────────────────────────────────────────────────

// PaginationMeta mirrors Hetzner's meta.pagination shape for API consistency.
type PaginationMeta struct {
	Pagination PaginationInfo `json:"pagination"`
}

type PaginationInfo struct {
	Page         int  `json:"page"`
	PerPage      int  `json:"per_page"`
	TotalEntries int  `json:"total_entries"`
	LastPage     int  `json:"last_page"`
}

type PaginatedResponse[T any] struct {
	Data  []T            `json:"data"`
	Meta  PaginationMeta `json:"meta"`
	Links domain.Links    `json:"_links,omitempty"`
	// ── Backward-compatible flat fields ──────────────────────────
	Total   int  `json:"total"`
	Limit   int  `json:"limit"`
	Offset  int  `json:"offset"`
	HasMore bool `json:"has_more"`
}

func NewPaginatedResponse[T any](items []T, total, limit, offset int, links ...domain.Link) PaginatedResponse[T] {
	if items == nil {
		items = make([]T, 0)
	}

	page := 0
	if limit > 0 {
		page = offset/limit + 1
	}
	lastPage := 0
	if limit > 0 && total > 0 {
		lastPage = int(math.Ceil(float64(total) / float64(limit)))
	}

	linksField := domain.Links(links)
	if linksField == nil {
		linksField = domain.Links{}
	}

	return PaginatedResponse[T]{
		Data:  items,
		Total: total,
		Meta: PaginationMeta{
			Pagination: PaginationInfo{
				Page:         page,
				PerPage:      limit,
				TotalEntries: total,
				LastPage:     lastPage,
			},
		},
		Links:   linksField,
		Limit:   limit,
		Offset:  offset,
		HasMore: offset+len(items) < total,
	}
}

// Paginate applies in-memory limit/offset to a slice and returns the page with total count.
func Paginate[T any](items []T, p PaginationParams) (page []T, total int) {
	total = len(items)
	if p.Offset >= total {
		return make([]T, 0), total
	}
	end := p.Offset + p.Limit
	if end > total {
		end = total
	}
	return items[p.Offset:end], total
}
