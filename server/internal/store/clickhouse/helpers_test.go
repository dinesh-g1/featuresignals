package clickhouse

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// ─── extractSDKName ────────────────────────────────────────────────────────

func TestExtractSDKName_Standard(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		sdk  string
		want string
	}{
		{name: "go sdk", sdk: "go/1.2.3", want: "go"},
		{name: "node sdk", sdk: "node/2.0.0", want: "node"},
		{name: "python sdk", sdk: "python/0.5.1", want: "python"},
		{name: "react sdk", sdk: "react/1.5.0", want: "react"},
		{name: "java sdk", sdk: "java/3.0.0-beta", want: "java"},
		{name: "dotnet sdk", sdk: "dotnet/4.1.0", want: "dotnet"},
		{name: "ruby sdk", sdk: "ruby/2.1.0", want: "ruby"},
		{name: "no slash returns full string", sdk: "unknown", want: "unknown"},
		{name: "empty string returns empty", sdk: "", want: ""},
		{name: "trailing slash only", sdk: "go/", want: "go"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := extractSDKName(tc.sdk)
			assert.Equal(t, tc.want, got)
		})
	}
}

// ─── extractSDKVersion ─────────────────────────────────────────────────────

func TestExtractSDKVersion_Standard(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		sdk  string
		want string
	}{
		{name: "go version", sdk: "go/1.2.3", want: "1.2.3"},
		{name: "node version", sdk: "node/2.0.0", want: "2.0.0"},
		{name: "python version", sdk: "python/0.5.1", want: "0.5.1"},
		{name: "react version", sdk: "react/1.5.0", want: "1.5.0"},
		{name: "java beta", sdk: "java/3.0.0-beta", want: "3.0.0-beta"},
		{name: "semver with pre-release", sdk: "dotnet/4.1.0-rc.2", want: "4.1.0-rc.2"},
		{name: "no slash returns full string", sdk: "unknown", want: "unknown"},
		{name: "empty string returns empty", sdk: "", want: ""},
		{name: "leading slash returns suffix", sdk: "/1.0.0", want: "1.0.0"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := extractSDKVersion(tc.sdk)
			assert.Equal(t, tc.want, got)
		})
	}
}

// ─── boolToUInt8 ───────────────────────────────────────────────────────────

func TestBoolToUInt8_Standard(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		b    bool
		want uint8
	}{
		{name: "true returns 1", b: true, want: 1},
		{name: "false returns 0", b: false, want: 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := boolToUInt8(tc.b)
			assert.Equal(t, tc.want, got)
		})
	}
}

// ─── domainArrayToClickHouse ───────────────────────────────────────────────

func TestDomainArrayToClickHouse_Standard(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		arr  []string
		want []string
	}{
		{name: "nil returns empty slice", arr: nil, want: []string{}},
		{name: "non-nil returns copy", arr: []string{"a", "b"}, want: []string{"a", "b"}},
		{name: "empty slice returns empty", arr: []string{}, want: []string{}},
		{name: "single element", arr: []string{"only"}, want: []string{"only"}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := domainArrayToClickHouse(tc.arr)
			assert.Equal(t, tc.want, got)
			// Ensure nil input gives non-nil result (allocated slice)
			if tc.arr == nil {
				assert.NotNil(t, got)
			}
		})
	}
}
