package handlers

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func TestExport_CSV(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	for i := 0; i < 5; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			ID:           "entry-" + string(rune('0'+i)),
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.created",
			ResourceType: "flag",
			CreatedAt:    time.Now(),
		})
	}

	r := httptest.NewRequest("GET", "/v1/audit/export?format=csv", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Export(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	contentType := w.Header().Get("Content-Type")
	if !strings.HasPrefix(contentType, "text/csv") {
		t.Errorf("expected text/csv content type, got %q", contentType)
	}

	contentDisp := w.Header().Get("Content-Disposition")
	if !strings.Contains(contentDisp, "audit-export.csv") {
		t.Errorf("expected csv filename in Content-Disposition, got %q", contentDisp)
	}

	// Verify CSV is parseable and has header + 5 data rows
	reader := csv.NewReader(strings.NewReader(w.Body.String()))
	records, err := reader.ReadAll()
	if err != nil {
		t.Fatalf("failed to parse CSV: %v", err)
	}
	if len(records) != 6 { // header + 5 rows
		t.Errorf("expected 6 CSV rows (header + 5 data), got %d", len(records))
	}
}

func TestExport_JSON(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	for i := 0; i < 3; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			ID:           "entry-" + string(rune('0'+i)),
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.toggled",
			ResourceType: "flag",
			CreatedAt:    time.Now(),
		})
	}

	r := httptest.NewRequest("GET", "/v1/audit/export?format=json", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Export(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	contentType := w.Header().Get("Content-Type")
	if !strings.HasPrefix(contentType, "application/json") {
		t.Errorf("expected application/json, got %q", contentType)
	}

	// Verify Content-Length header is set
	if w.Header().Get("Content-Length") == "" {
		t.Error("expected Content-Length header to be set")
	}

	var resp struct {
		Entries    []domain.AuditEntry `json:"entries"`
		Total      int                 `json:"total"`
		Exported   int                 `json:"exported"`
		ExportedAt string              `json:"exported_at"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse JSON: %v", err)
	}
	if resp.Total != 3 {
		t.Errorf("expected total 3, got %d", resp.Total)
	}
	if len(resp.Entries) != 3 {
		t.Errorf("expected 3 entries, got %d", len(resp.Entries))
	}
	if resp.Exported != 3 {
		t.Errorf("expected exported 3, got %d", resp.Exported)
	}
}

func TestExport_InvalidFormat(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	r := httptest.NewRequest("GET", "/v1/audit/export?format=xml", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Export(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}

	var resp struct {
		Error string `json:"error"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Error == "" {
		t.Error("expected error message")
	}
}

func TestExport_Unauthorized(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	// Request without auth context values
	r := httptest.NewRequest("GET", "/v1/audit/export", nil)
	w := httptest.NewRecorder()

	h.Export(w, r)

	// Without org context, the handler should still work but filter by empty org
	// The handler gets orgID from middleware - when not set, it's empty
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 (auth is middleware responsibility), got %d", w.Code)
	}
}

func TestExport_EmptyResults(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	// No audit entries created
	r := httptest.NewRequest("GET", "/v1/audit/export?format=csv", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Export(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// CSV should still have headers even with empty results
	body := w.Body.String()
	if !strings.Contains(body, "id,org_id,actor_id") {
		t.Error("expected CSV headers even with empty results")
	}
}

func TestExport_Pagination(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	// Create 50 entries
	for i := 0; i < 50; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			ID:           "entry-" + string(rune('0'+i%10)),
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.created",
			ResourceType: "flag",
			CreatedAt:    time.Now(),
		})
	}

	// Request with limit=10, offset=5
	r := httptest.NewRequest("GET", "/v1/audit/export?format=json&limit=10&offset=5", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Export(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Entries    []domain.AuditEntry `json:"entries"`
		Total      int                 `json:"total"`
		Exported   int                 `json:"exported"`
		ExportedAt string              `json:"exported_at"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse JSON: %v", err)
	}

	if resp.Total != 50 {
		t.Errorf("expected total 50, got %d", resp.Total)
	}
	if len(resp.Entries) != 10 {
		t.Errorf("expected 10 entries (limit), got %d", len(resp.Entries))
	}
	if resp.Exported != 10 {
		t.Errorf("expected exported 10, got %d", resp.Exported)
	}
}

func TestExport_OffsetBeyondBounds(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	for i := 0; i < 5; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			ID:           "entry-" + string(rune('0'+i)),
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.created",
			ResourceType: "flag",
			CreatedAt:    time.Now(),
		})
	}

	// Request with offset beyond total count
	r := httptest.NewRequest("GET", "/v1/audit/export?format=json&offset=100", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Export(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Entries    []domain.AuditEntry `json:"entries"`
		Total      int                 `json:"total"`
		Exported   int                 `json:"exported"`
		ExportedAt string              `json:"exported_at"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse JSON: %v", err)
	}

	if resp.Total != 5 {
		t.Errorf("expected total 5, got %d", resp.Total)
	}
	if len(resp.Entries) != 0 {
		t.Errorf("expected 0 entries (offset beyond bounds), got %d", len(resp.Entries))
	}
}

func TestExport_CrossOrg(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
		ID: "entry-1", OrgID: "org-1", ActorType: "user",
		Action: "flag.created", ResourceType: "flag",
		CreatedAt: time.Now(),
	})
	store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
		ID: "entry-2", OrgID: "org-2", ActorType: "user",
		Action: "flag.created", ResourceType: "flag",
		CreatedAt: time.Now(),
	})

	// Request as org-1 should only see org-1 entries
	r := httptest.NewRequest("GET", "/v1/audit/export?format=json", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Export(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Entries []domain.AuditEntry `json:"entries"`
		Total   int                 `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	// Total should only count org-1 entries
	if resp.Total != 1 {
		t.Errorf("expected total 1 (org-1 only), got %d", resp.Total)
	}
}

func TestExport_DefaultFormat(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
		ID: "entry-1", OrgID: "org-1", ActorType: "user",
		Action: "flag.created", ResourceType: "flag",
		CreatedAt: time.Now(),
	})

	// No format specified — should default to JSON
	r := httptest.NewRequest("GET", "/v1/audit/export", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Export(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	contentType := w.Header().Get("Content-Type")
	if !strings.HasPrefix(contentType, "application/json") {
		t.Errorf("expected default JSON format, got %q", contentType)
	}
}

func TestExport_ContentLength(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	for i := 0; i < 10; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			ID:           "entry-" + string(rune('0'+i%10)),
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.created",
			ResourceType: "flag",
			CreatedAt:    time.Now(),
		})
	}

	// Test JSON content-length
	r := httptest.NewRequest("GET", "/v1/audit/export?format=json", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()
	h.Export(w, r)

	cl := w.Header().Get("Content-Length")
	if cl == "" || cl == "0" {
		t.Errorf("expected non-zero Content-Length for JSON, got %q", cl)
	}

	// Test CSV content-length
	r2 := httptest.NewRequest("GET", "/v1/audit/export?format=csv", nil)
	r2 = requestWithAuth(r2, "user-1", "org-1", "admin")
	w2 := httptest.NewRecorder()
	h.Export(w2, r2)

	cl2 := w2.Header().Get("Content-Length")
	if cl2 == "" || cl2 == "0" {
		t.Errorf("expected non-zero Content-Length for CSV, got %q", cl2)
	}
}

func TestExport_XHeaders(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	for i := 0; i < 7; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			ID:           "entry-" + string(rune('0'+i%10)),
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.created",
			ResourceType: "flag",
			CreatedAt:    time.Now(),
		})
	}

	// Request with limit=5
	r := httptest.NewRequest("GET", "/v1/audit/export?format=csv&limit=5", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()
	h.Export(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// X-Total-Count should show total available
	totalHdr := w.Header().Get("X-Total-Count")
	if totalHdr != "7" {
		t.Errorf("expected X-Total-Count 7, got %q", totalHdr)
	}

	// X-Exported-Count should show what was returned
	exportedHdr := w.Header().Get("X-Exported-Count")
	if exportedHdr != "5" {
		t.Errorf("expected X-Exported-Count 5, got %q", exportedHdr)
	}
}

func TestExport_MaxLimit(t *testing.T) {
	store := newMockStore()
	h := NewAuditExportHandler(store, nil, testLogger())

	// Create more entries than max limit
	for i := 0; i < 15000; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			ID:           "entry-" + string(rune('0'+i%10)),
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.created",
			ResourceType: "flag",
			CreatedAt:    time.Now(),
		})
	}

	// Request with limit exceeding max
	r := httptest.NewRequest("GET", "/v1/audit/export?format=json&limit=50000", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Export(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Entries  []domain.AuditEntry `json:"entries"`
		Exported int                 `json:"exported"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	// Should be capped at max limit (10000)
	if resp.Exported > 10000 {
		t.Errorf("expected exported <= 10000 (max limit), got %d", resp.Exported)
	}
}
