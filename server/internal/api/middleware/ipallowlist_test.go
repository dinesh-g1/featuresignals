package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

type mockIPAllowlistReader struct {
	enabled bool
	cidrs   []string
	err     error
}

func (m *mockIPAllowlistReader) GetIPAllowlist(_ context.Context, _ string) (bool, []string, error) {
	return m.enabled, m.cidrs, m.err
}

func TestIPAllowlist(t *testing.T) {
	tests := []struct {
		name       string
		enabled    bool
		cidrs      []string
		remoteAddr string
		wantStatus int
	}{
		{name: "disabled passes through", enabled: false, cidrs: nil, remoteAddr: "1.2.3.4:1234", wantStatus: http.StatusOK},
		{name: "allowed IP", enabled: true, cidrs: []string{"1.2.3.0/24"}, remoteAddr: "1.2.3.4:1234", wantStatus: http.StatusOK},
		{name: "blocked IP", enabled: true, cidrs: []string{"10.0.0.0/8"}, remoteAddr: "1.2.3.4:1234", wantStatus: http.StatusForbidden},
		{name: "exact match /32", enabled: true, cidrs: []string{"1.2.3.4/32"}, remoteAddr: "1.2.3.4:1234", wantStatus: http.StatusOK},
		{name: "no cidrs passes through", enabled: true, cidrs: []string{}, remoteAddr: "1.2.3.4:1234", wantStatus: http.StatusOK},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			reader := &mockIPAllowlistReader{enabled: tc.enabled, cidrs: tc.cidrs}
			handler := IPAllowlist(reader)(passthrough)

			req := httptest.NewRequest("GET", "/", nil)
			req.RemoteAddr = tc.remoteAddr
			req = req.WithContext(withOrgID(req.Context(), "org-1"))
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)
			if rr.Code != tc.wantStatus {
				t.Errorf("got %d, want %d", rr.Code, tc.wantStatus)
			}
		})
	}
}
