package dto

import "github.com/featuresignals/server/internal/domain"

type MemberResponse struct {
	ID    string      `json:"id"`
	OrgID string      `json:"org_id"`
	Role  domain.Role `json:"role"`
	Email string      `json:"email"`
	Name  string      `json:"name"`
}
