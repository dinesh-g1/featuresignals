package auth

import (
	"testing"
	"time"
)

func TestGenerateTokenPair(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	if pair.AccessToken == "" {
		t.Error("expected non-empty access token")
	}
	if pair.RefreshToken == "" {
		t.Error("expected non-empty refresh token")
	}
	if pair.AccessToken == pair.RefreshToken {
		t.Error("access and refresh tokens should be different")
	}
	if pair.ExpiresAt <= time.Now().Unix() {
		t.Error("expected ExpiresAt in the future")
	}
}

func TestValidateToken_Valid(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	claims, err := mgr.ValidateToken(pair.AccessToken)
	if err != nil {
		t.Fatalf("ValidateToken() error: %v", err)
	}

	if claims.UserID != "user-123" {
		t.Errorf("expected UserID 'user-123', got '%s'", claims.UserID)
	}
	if claims.OrgID != "org-456" {
		t.Errorf("expected OrgID 'org-456', got '%s'", claims.OrgID)
	}
	if claims.Role != "admin" {
		t.Errorf("expected Role 'admin', got '%s'", claims.Role)
	}
}

func TestValidateRefreshToken(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "developer")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	claims, err := mgr.ValidateRefreshToken(pair.RefreshToken)
	if err != nil {
		t.Fatalf("ValidateRefreshToken() error: %v", err)
	}

	if claims.UserID != "user-123" {
		t.Errorf("expected UserID 'user-123', got '%s'", claims.UserID)
	}
	if claims.Issuer != "featuresignals-refresh" {
		t.Errorf("expected Issuer 'featuresignals-refresh', got '%s'", claims.Issuer)
	}
}

func TestValidateToken_RejectsRefreshToken(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	_, err = mgr.ValidateToken(pair.RefreshToken)
	if err == nil {
		t.Error("ValidateToken() should reject refresh tokens")
	}
}

func TestValidateRefreshToken_RejectsAccessToken(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	_, err = mgr.ValidateRefreshToken(pair.AccessToken)
	if err == nil {
		t.Error("ValidateRefreshToken() should reject access tokens")
	}
}

func TestValidateToken_ExpiredToken(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", -1*time.Minute, -1*time.Minute)

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	_, err = mgr.ValidateToken(pair.AccessToken)
	if err == nil {
		t.Error("expected error for expired token")
	}
	if err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken, got %v", err)
	}
}

func TestValidateToken_InvalidToken(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	_, err := mgr.ValidateToken("garbage.token.here")
	if err == nil {
		t.Error("expected error for garbage token")
	}

	_, err = mgr.ValidateToken("")
	if err == nil {
		t.Error("expected error for empty token")
	}
}

func TestValidateToken_WrongSecret(t *testing.T) {
	mgr1 := NewJWTManager("secret-one-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	mgr2 := NewJWTManager("secret-two-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair, err := mgr1.GenerateTokenPair("user-123", "org-456", "admin")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	_, err = mgr2.ValidateToken(pair.AccessToken)
	if err == nil {
		t.Error("expected error when validating with wrong secret")
	}
}

func TestGenerateTokenPair_DifferentUsersGetDifferentTokens(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair1, _ := mgr.GenerateTokenPair("user-1", "org-1", "admin")
	pair2, _ := mgr.GenerateTokenPair("user-2", "org-1", "admin")

	if pair1.AccessToken == pair2.AccessToken {
		t.Error("different users should get different tokens")
	}
}

