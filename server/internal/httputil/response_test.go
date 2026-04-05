package httputil

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestJSON(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"hello": "world"}

	JSON(w, http.StatusOK, data)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var result map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if result["hello"] != "world" {
		t.Errorf("expected hello=world, got %v", result)
	}
}

func TestJSON_DifferentStatusCodes(t *testing.T) {
	codes := []int{200, 201, 204, 400, 401, 404, 500}
	for _, code := range codes {
		w := httptest.NewRecorder()
		JSON(w, code, map[string]string{"status": "test"})
		if w.Code != code {
			t.Errorf("expected status %d, got %d", code, w.Code)
		}
	}
}

func TestError(t *testing.T) {
	w := httptest.NewRecorder()
	Error(w, http.StatusBadRequest, "something went wrong")

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}

	var result ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to unmarshal error response: %v", err)
	}
	if result.Error != "something went wrong" {
		t.Errorf("expected error message 'something went wrong', got '%s'", result.Error)
	}
}

func TestDecodeJSON(t *testing.T) {
	body := `{"name": "test", "value": 42}`
	r := httptest.NewRequest("POST", "/test", strings.NewReader(body))

	var result struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	if err := DecodeJSON(r, &result); err != nil {
		t.Fatalf("DecodeJSON() error: %v", err)
	}

	if result.Name != "test" {
		t.Errorf("expected name 'test', got '%s'", result.Name)
	}
	if result.Value != 42 {
		t.Errorf("expected value 42, got %d", result.Value)
	}
}

func TestDecodeJSON_InvalidJSON(t *testing.T) {
	r := httptest.NewRequest("POST", "/test", strings.NewReader(`{invalid json`))

	var result map[string]interface{}
	err := DecodeJSON(r, &result)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestDecodeJSON_EmptyBody(t *testing.T) {
	r := httptest.NewRequest("POST", "/test", strings.NewReader(""))

	var result map[string]interface{}
	err := DecodeJSON(r, &result)
	if err == nil {
		t.Error("expected error for empty body")
	}
}

func TestDecodeJSON_RejectsUnknownFields(t *testing.T) {
	body := `{"name": "test", "unknown_field": "bad"}`
	r := httptest.NewRequest("POST", "/test", strings.NewReader(body))

	var result struct {
		Name string `json:"name"`
	}

	err := DecodeJSON(r, &result)
	if err == nil {
		t.Fatal("expected error for unknown field, got nil")
	}
	if !strings.Contains(err.Error(), "unknown field") {
		t.Errorf("expected 'unknown field' in error, got: %v", err)
	}
}

func TestDecodeJSON_AcceptsValidPayload(t *testing.T) {
	body := `{"name": "test"}`
	r := httptest.NewRequest("POST", "/test", strings.NewReader(body))

	var result struct {
		Name string `json:"name"`
	}

	if err := DecodeJSON(r, &result); err != nil {
		t.Fatalf("expected no error for valid payload, got: %v", err)
	}
	if result.Name != "test" {
		t.Errorf("expected name 'test', got '%s'", result.Name)
	}
}

func TestDecodeJSON_AcceptsSubsetOfFields(t *testing.T) {
	body := `{"name": "test"}`
	r := httptest.NewRequest("POST", "/test", strings.NewReader(body))

	var result struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	if err := DecodeJSON(r, &result); err != nil {
		t.Fatalf("expected no error for subset of fields, got: %v", err)
	}
	if result.Name != "test" || result.Value != 0 {
		t.Errorf("unexpected values: name=%s, value=%d", result.Name, result.Value)
	}
}
