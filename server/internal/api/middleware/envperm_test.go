package middleware

import (
	"context"
	"fmt"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

type mockEnvPermChecker struct {
	member *domain.OrgMember
	perms  []domain.EnvPermission
	err    error
}

func (m *mockEnvPermChecker) GetOrgMember(_ context.Context, _, _ string) (*domain.OrgMember, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.member, nil
}

func (m *mockEnvPermChecker) ListEnvPermissions(_ context.Context, _ string) ([]domain.EnvPermission, error) {
	return m.perms, nil
}

func TestCheckEnvPermission(t *testing.T) {
	tests := []struct {
		name       string
		role       string
		member     *domain.OrgMember
		perms      []domain.EnvPermission
		envID      string
		permission string
		memberErr  error
		want       bool
	}{
		{
			name: "owner always passes",
			role: "owner",
			want: true,
		},
		{
			name: "admin always passes",
			role: "admin",
			want: true,
		},
		{
			name:       "developer with can_toggle permission",
			role:       "developer",
			member:     &domain.OrgMember{ID: "m-1"},
			perms:      []domain.EnvPermission{{MemberID: "m-1", EnvID: "env-1", CanToggle: true}},
			envID:      "env-1",
			permission: "can_toggle",
			want:       true,
		},
		{
			name:       "developer without can_toggle permission",
			role:       "developer",
			member:     &domain.OrgMember{ID: "m-1"},
			perms:      []domain.EnvPermission{{MemberID: "m-1", EnvID: "env-1", CanToggle: false}},
			envID:      "env-1",
			permission: "can_toggle",
			want:       false,
		},
		{
			name:       "developer with can_edit_rules",
			role:       "developer",
			member:     &domain.OrgMember{ID: "m-1"},
			perms:      []domain.EnvPermission{{MemberID: "m-1", EnvID: "env-1", CanEditRules: true}},
			envID:      "env-1",
			permission: "can_edit_rules",
			want:       true,
		},
		{
			name:       "developer no matching env denied by default",
			role:       "developer",
			member:     &domain.OrgMember{ID: "m-1"},
			perms:      []domain.EnvPermission{},
			envID:      "env-1",
			permission: "can_toggle",
			want:       false,
		},
		{
			name:       "member lookup error fails closed",
			role:       "developer",
			memberErr:  fmt.Errorf("db down"),
			envID:      "env-1",
			permission: "can_toggle",
			want:       false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			checker := &mockEnvPermChecker{
				member: tc.member,
				perms:  tc.perms,
				err:    tc.memberErr,
			}
			ctx := withRole(context.Background(), tc.role)
			got := CheckEnvPermission(ctx, checker, "org-1", "user-1", tc.envID, tc.permission)
			if got != tc.want {
				t.Errorf("got %v, want %v", got, tc.want)
			}
		})
	}
}
