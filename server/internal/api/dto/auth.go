package dto

import (
	"time"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
)

type SafeUserResponse struct {
	ID            string    `json:"id"`
	Email         string    `json:"email"`
	Name          string    `json:"name"`
	EmailVerified bool      `json:"email_verified"`
	CreatedAt     time.Time `json:"created_at"`
}

func SafeUserFromDomain(u *domain.User) *SafeUserResponse {
	if u == nil {
		return nil
	}
	return &SafeUserResponse{
		ID:            u.ID,
		Email:         u.Email,
		Name:          u.Name,
		EmailVerified: u.EmailVerified,
		CreatedAt:     u.CreatedAt,
	}
}

type AuthTokensResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

func AuthTokensFromPair(tp *auth.TokenPair) *AuthTokensResponse {
	if tp == nil {
		return nil
	}
	return &AuthTokensResponse{
		AccessToken:  tp.AccessToken,
		RefreshToken: tp.RefreshToken,
		ExpiresAt:    tp.ExpiresAt,
	}
}

type LoginResponse struct {
	User                 *SafeUserResponse       `json:"user"`
	Organization         *OrganizationResponse    `json:"organization"`
	Tokens               *AuthTokensResponse      `json:"tokens"`
	OnboardingCompleted  bool                     `json:"onboarding_completed"`
}

type RefreshResponse struct {
	AccessToken         string                `json:"access_token"`
	RefreshToken        string                `json:"refresh_token"`
	ExpiresAt           int64                 `json:"expires_at"`
	User                *SafeUserResponse     `json:"user,omitempty"`
	Organization        *OrganizationResponse `json:"organization,omitempty"`
	OnboardingCompleted bool                  `json:"onboarding_completed"`
}

type TokenExchangeResponse struct {
	Tokens *AuthTokensResponse `json:"tokens"`
	User   *SafeUserResponse   `json:"user,omitempty"`
}

type SignupInitResponse struct {
	Message   string `json:"message"`
	ExpiresIn int    `json:"expires_in"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

type LogoutResponse = MessageResponse
