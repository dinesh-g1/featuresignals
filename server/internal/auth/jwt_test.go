package auth

import (
	"testing"
	"time"
)

func TestGenerateTokenPair(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin", "", "")
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

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin", "", "")
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

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "developer", "", "")
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

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin", "", "")
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

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin", "", "")
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

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin", "", "")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	_, err = mgr.ValidateToken(pair.AccessToken)
	if err == nil {
		t.Error("expected error for expired token")
	}
	if err != ErrTokenExpired {
		t.Errorf("expected ErrTokenExpired,  got %v", err)
	}
}

func TestValidateRefreshToken_ExpiredToken(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", -1*time.Minute, -1*time.Minute)

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin", "", "")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	_, err = mgr.ValidateRefreshToken(pair.RefreshToken)
	if err == nil {
		t.Error("expected error for expired refresh token")
	}
	if err != ErrTokenExpired {
		t.Errorf("expected ErrTokenExpired,  got %v", err)
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

	pair, err := mgr1.GenerateTokenPair("user-123", "org-456", "admin", "", "")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	_, err = mgr2.ValidateToken(pair.AccessToken)
	if err == nil {
		t.Error("expected error when validating with wrong secret")
	}
	if err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken for wrong secret,  got %v", err)
	}
}

func TestExpiredVsInvalid_AreDifferentErrors(t *testing.T) {
	if ErrTokenExpired == ErrInvalidToken {
		t.Error("ErrTokenExpired and ErrInvalidToken should be distinct sentinel errors")
	}
}

func TestValidateToken_ExpiredReturnsExpiredNotInvalid(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", -1*time.Minute, 24*time.Hour)

	pair, err := mgr.GenerateTokenPair("user-123", "org-456", "admin", "", "")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error: %v", err)
	}

	_, err = mgr.ValidateToken(pair.AccessToken)
	if err == nil {
		t.Fatal("expected error for expired token")
	}
	if err == ErrInvalidToken {
		t.Error("expired token should return ErrTokenExpired, not ErrInvalidToken")
	}
	if err != ErrTokenExpired {
		t.Errorf("expected ErrTokenExpired, got %v", err)
	}
}

func TestValidateToken_GarbageReturnsInvalidNotExpired(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	_, err := mgr.ValidateToken("not-a-jwt")
	if err == nil {
		t.Fatal("expected error for garbage token")
	}
	if err == ErrTokenExpired {
		t.Error("garbage token should return ErrInvalidToken, not ErrTokenExpired")
	}
	if err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken, got %v", err)
	}
}

func TestGenerateTokenPair_DifferentUsersGetDifferentTokens(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair1, _ := mgr.GenerateTokenPair("user-1", "org-1", "admin", "", "")
	pair2, _ := mgr.GenerateTokenPair("user-2", "org-1", "admin", "", "")

	if pair1.AccessToken == pair2.AccessToken {
		t.Error("different users should get different tokens")
	}
}

func TestGenerateTokenPair_ContainsJTI(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	pair, err := mgr.GenerateTokenPair("user-1", "org-1", "admin", "", "")
	if err != nil {
		t.Fatalf("GenerateTokenPair error: %v", err)
	}

	claims, err := mgr.ValidateToken(pair.AccessToken)
	if err != nil {
		t.Fatalf("ValidateToken error: %v", err)
	}
	if claims.ID == "" {
		t.Fatal("expected non-empty JTI (claims.ID) in access token")
	}

	refreshClaims, err := mgr.ValidateRefreshToken(pair.RefreshToken)
	if err != nil {
		t.Fatalf("ValidateRefreshToken error: %v", err)
	}
	if refreshClaims.ID == "" {
		t.Fatal("expected non-empty JTI (claims.ID) in refresh token")
	}

	if claims.ID == refreshClaims.ID {
		t.Fatal("access and refresh tokens should have different JTIs")
	}
}

func TestGenerateTokenPair_UniqueJTIs(t *testing.T) {
	mgr := NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	pair1, _ := mgr.GenerateTokenPair("user-1", "org-1", "admin", "", "")
	pair2, _ := mgr.GenerateTokenPair("user-1", "org-1", "admin", "", "")

	c1, _ := mgr.ValidateToken(pair1.AccessToken)
	c2, _ := mgr.ValidateToken(pair2.AccessToken)

	if c1.ID == c2.ID {
		t.Fatal("successive token generations should produce unique JTIs")
	}
}
