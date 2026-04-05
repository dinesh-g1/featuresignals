package dto

import (
	"net/http/httptest"
	"testing"
)

func TestParsePagination_Defaults(t *testing.T) {
	r := httptest.NewRequest("GET", "/items", nil)
	p := ParsePagination(r)

	if p.Limit != DefaultLimit {
		t.Errorf("expected default limit %d, got %d", DefaultLimit, p.Limit)
	}
	if p.Offset != 0 {
		t.Errorf("expected offset 0, got %d", p.Offset)
	}
}

func TestParsePagination_CustomValues(t *testing.T) {
	r := httptest.NewRequest("GET", "/items?limit=10&offset=20", nil)
	p := ParsePagination(r)

	if p.Limit != 10 {
		t.Errorf("expected limit 10, got %d", p.Limit)
	}
	if p.Offset != 20 {
		t.Errorf("expected offset 20, got %d", p.Offset)
	}
}

func TestParsePagination_NegativesClamped(t *testing.T) {
	r := httptest.NewRequest("GET", "/items?limit=-5&offset=-10", nil)
	p := ParsePagination(r)

	if p.Limit != DefaultLimit {
		t.Errorf("negative limit should default, got %d", p.Limit)
	}
	if p.Offset != 0 {
		t.Errorf("negative offset should clamp to 0, got %d", p.Offset)
	}
}

func TestParsePagination_ExceedsMax(t *testing.T) {
	r := httptest.NewRequest("GET", "/items?limit=500", nil)
	p := ParsePagination(r)

	if p.Limit != MaxLimit {
		t.Errorf("expected max limit %d, got %d", MaxLimit, p.Limit)
	}
}

func TestNewPaginatedResponse(t *testing.T) {
	items := []string{"a", "b", "c"}
	resp := NewPaginatedResponse(items, 10, 3, 0)

	if len(resp.Data) != 3 {
		t.Errorf("expected 3 items, got %d", len(resp.Data))
	}
	if resp.Total != 10 {
		t.Errorf("expected total 10, got %d", resp.Total)
	}
	if !resp.HasMore {
		t.Error("expected has_more=true when offset+len < total")
	}
}

func TestNewPaginatedResponse_LastPage(t *testing.T) {
	items := []string{"c"}
	resp := NewPaginatedResponse(items, 3, 2, 2)

	if resp.HasMore {
		t.Error("expected has_more=false on last page")
	}
}

func TestNewPaginatedResponse_Empty(t *testing.T) {
	resp := NewPaginatedResponse([]string{}, 0, 50, 0)

	if resp.Data == nil {
		t.Error("data should not be nil for empty result")
	}
	if len(resp.Data) != 0 {
		t.Errorf("expected 0 items, got %d", len(resp.Data))
	}
	if resp.HasMore {
		t.Error("expected has_more=false for empty result")
	}
}

func TestNewPaginatedResponse_NilItems(t *testing.T) {
	resp := NewPaginatedResponse[string](nil, 0, 50, 0)

	if resp.Data == nil {
		t.Error("nil items should be converted to empty slice")
	}
}

func TestPaginate(t *testing.T) {
	items := []int{1, 2, 3, 4, 5}

	tests := []struct {
		name      string
		params    PaginationParams
		wantLen   int
		wantTotal int
		wantFirst int
	}{
		{"first page", PaginationParams{Limit: 2, Offset: 0}, 2, 5, 1},
		{"second page", PaginationParams{Limit: 2, Offset: 2}, 2, 5, 3},
		{"last partial page", PaginationParams{Limit: 2, Offset: 4}, 1, 5, 5},
		{"offset beyond total", PaginationParams{Limit: 2, Offset: 10}, 0, 5, 0},
		{"full page", PaginationParams{Limit: 10, Offset: 0}, 5, 5, 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			page, total := Paginate(items, tt.params)
			if len(page) != tt.wantLen {
				t.Errorf("expected %d items, got %d", tt.wantLen, len(page))
			}
			if total != tt.wantTotal {
				t.Errorf("expected total %d, got %d", tt.wantTotal, total)
			}
			if tt.wantFirst != 0 && len(page) > 0 && page[0] != tt.wantFirst {
				t.Errorf("expected first item %d, got %d", tt.wantFirst, page[0])
			}
		})
	}
}
