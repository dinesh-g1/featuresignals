package sso

import (
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func TestMapRole_MatchesAdminGroup(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		groups []string
		want   domain.Role
	}{
		{name: "admin group", groups: []string{"admin"}, want: domain.RoleAdmin},
		{name: "admins group", groups: []string{"admins"}, want: domain.RoleAdmin},
		{name: "FeatureSignals-Admin group", groups: []string{"FeatureSignals-Admin"}, want: domain.RoleAdmin},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := MapRole(tc.groups, "developer")
			if got != tc.want {
				t.Errorf("MapRole(%v) = %q, want %q", tc.groups, got, tc.want)
			}
		})
	}
}

func TestMapRole_MatchesDeveloperGroup(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		groups []string
		want   domain.Role
	}{
		{name: "developer group", groups: []string{"developer"}, want: domain.RoleDeveloper},
		{name: "engineering group", groups: []string{"engineering"}, want: domain.RoleDeveloper},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := MapRole(tc.groups, "viewer")
			if got != tc.want {
				t.Errorf("MapRole(%v) = %q, want %q", tc.groups, got, tc.want)
			}
		})
	}
}

func TestMapRole_MatchesViewerGroup(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name   string
		groups []string
		want   domain.Role
	}{
		{name: "viewer group", groups: []string{"viewer"}, want: domain.RoleViewer},
		{name: "readonly group", groups: []string{"readonly"}, want: domain.RoleViewer},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := MapRole(tc.groups, "developer")
			if got != tc.want {
				t.Errorf("MapRole(%v) = %q, want %q", tc.groups, got, tc.want)
			}
		})
	}
}

func TestMapRole_FallsBackToDefaultRole(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name        string
		groups      []string
		defaultRole string
		want        domain.Role
	}{
		{name: "empty groups, default developer", groups: nil, defaultRole: "developer", want: domain.RoleDeveloper},
		{name: "empty groups, default admin", groups: nil, defaultRole: string(domain.RoleAdmin), want: domain.RoleAdmin},
		{name: "empty groups, default viewer", groups: nil, defaultRole: string(domain.RoleViewer), want: domain.RoleViewer},
		{name: "unknown groups, fallback", groups: []string{"marketing"}, defaultRole: "developer", want: domain.RoleDeveloper},
		{name: "empty default falls to developer", groups: nil, defaultRole: "", want: domain.RoleDeveloper},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := MapRole(tc.groups, tc.defaultRole)
			if got != tc.want {
				t.Errorf("MapRole(%v, %q) = %q, want %q", tc.groups, tc.defaultRole, got, tc.want)
			}
		})
	}
}

func TestMapRole_FirstMatchWins(t *testing.T) {
	t.Parallel()
	groups := []string{"admin", "developer", "viewer"}
	got := MapRole(groups, "developer")
	if got != domain.RoleAdmin {
		t.Errorf("expected admin (first match), got %q", got)
	}
}

func TestGenerateState(t *testing.T) {
	t.Parallel()
	s1, err := GenerateState()
	if err != nil {
		t.Fatal(err)
	}
	s2, err := GenerateState()
	if err != nil {
		t.Fatal(err)
	}

	if s1 == "" || s2 == "" {
		t.Error("state should not be empty")
	}
	if s1 == s2 {
		t.Error("two generated states should be different")
	}
}
