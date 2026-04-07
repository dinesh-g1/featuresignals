package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newTestSalesHandler() (*SalesHandler, *mockStore) {
	store := newMockStore()
	return NewSalesHandler(store, nil, ""), store
}

func TestSalesHandler_SubmitInquiry_Success(t *testing.T) {
	h, store := newTestSalesHandler()

	body := `{"contact_name":"Jane Doe","email":"jane@bigcorp.com","company":"BigCorp","team_size":"50-100","message":"Interested in enterprise plan"}`
	r := httptest.NewRequest("POST", "/v1/sales/inquiry", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.SubmitInquiry(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["message"] == "" {
		t.Error("expected a thank-you message in response")
	}

	if len(store.salesInquiries) != 1 {
		t.Fatalf("expected 1 inquiry, got %d", len(store.salesInquiries))
	}
	inq := store.salesInquiries[0]
	if inq.ContactName != "Jane Doe" || inq.Email != "jane@bigcorp.com" || inq.Company != "BigCorp" {
		t.Error("stored inquiry has wrong values")
	}
}

func TestSalesHandler_SubmitInquiry_MissingFields(t *testing.T) {
	h, _ := newTestSalesHandler()

	tests := []struct {
		name string
		body string
	}{
		{"missing contact_name", `{"contact_name":"","email":"a@b.com","company":"C"}`},
		{"missing email", `{"contact_name":"A","email":"","company":"C"}`},
		{"missing company", `{"contact_name":"A","email":"a@b.com","company":""}`},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/v1/sales/inquiry", strings.NewReader(tc.body))
			w := httptest.NewRecorder()
			h.SubmitInquiry(w, r)
			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", w.Code)
			}
		})
	}
}

func TestSalesHandler_SubmitInquiry_InvalidEmail(t *testing.T) {
	h, _ := newTestSalesHandler()

	body := `{"contact_name":"Jane","email":"not-valid","company":"Corp"}`
	r := httptest.NewRequest("POST", "/v1/sales/inquiry", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.SubmitInquiry(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSalesHandler_SubmitInquiry_LongMessage(t *testing.T) {
	h, _ := newTestSalesHandler()

	longMsg := strings.Repeat("x", 2001)
	body := `{"contact_name":"Jane","email":"jane@corp.com","company":"Corp","message":"` + longMsg + `"}`
	r := httptest.NewRequest("POST", "/v1/sales/inquiry", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.SubmitInquiry(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSalesHandler_SubmitInquiry_MinimalPayload(t *testing.T) {
	h, store := newTestSalesHandler()

	body := `{"contact_name":"Jane","email":"jane@corp.com","company":"Corp"}`
	r := httptest.NewRequest("POST", "/v1/sales/inquiry", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.SubmitInquiry(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}
	if len(store.salesInquiries) != 1 {
		t.Fatalf("expected 1 inquiry stored")
	}
	if store.salesInquiries[0].TeamSize != "" || store.salesInquiries[0].Message != "" {
		t.Error("optional fields should be empty when not provided")
	}
}
