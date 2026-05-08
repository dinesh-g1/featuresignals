package httputil

import (
	"encoding/json"
	"net/http"

	"github.com/featuresignals/server/internal/domain"
)

// ErrorResponse follows the NNGroup error message framework:
// - code: machine-readable error code for client logic
// - message: human-readable, constructive (never "An error occurred")
// - suggestion: concrete fix ("Try using 'dark-mode' instead")
// - docs_url: link to relevant documentation page
// - _links: HATEOAS links to relevant documentation or recovery endpoints
type ErrorResponse struct {
	Error      string       `json:"error"`
	Code       string       `json:"code,omitempty"`
	Message    string       `json:"message,omitempty"`
	Suggestion string       `json:"suggestion,omitempty"`
	DocsURL    string       `json:"docs_url,omitempty"`
	Details    string       `json:"details,omitempty"`
	RequestID  string       `json:"request_id,omitempty"`
	Links      domain.Links `json:"_links,omitempty"`
}

// EnhancedError is a builder for rich error responses.
type EnhancedError struct {
	Status     int
	Code       string
	Message    string
	Suggestion string
	DocsURL    string
	Details    string
}

// NewError creates an EnhancedError with the required fields.
func NewError(status int, code, message string) *EnhancedError {
	return &EnhancedError{Status: status, Code: code, Message: message}
}

// WithSuggestion adds a constructive suggestion to the error.
func (e *EnhancedError) WithSuggestion(s string) *EnhancedError {
	e.Suggestion = s
	return e
}

// WithDocsURL adds a documentation link to the error.
func (e *EnhancedError) WithDocsURL(u string) *EnhancedError {
	e.DocsURL = u
	return e
}

// WithDetails adds internal details (not exposed in production).
func (e *EnhancedError) WithDetails(d string) *EnhancedError {
	e.Details = d
	return e
}

func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Error writes a simple error response. For rich errors, use WriteEnhancedError.
func Error(w http.ResponseWriter, status int, message string) {
	reqID := w.Header().Get("X-Request-Id")
	JSON(w, status, ErrorResponse{
		Error:     message,
		Message:   message,
		RequestID: reqID,
		Links:     domain.LinksForError(""),
	})
}

// WriteEnhancedError writes a rich error with suggestion and docs_url.
func WriteEnhancedError(w http.ResponseWriter, e *EnhancedError) {
	reqID := w.Header().Get("X-Request-Id")
	JSON(w, e.Status, ErrorResponse{
		Error:      e.Message,
		Code:       e.Code,
		Message:    e.Message,
		Suggestion: e.Suggestion,
		DocsURL:    e.DocsURL,
		Details:    e.Details,
		RequestID:  reqID,
		Links:      domain.LinksForError(e.DocsURL),
	})
}

func DecodeJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}
