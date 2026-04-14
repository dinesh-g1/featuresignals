// Package auth provides JWT-based authentication for the management API.
//
// All handlers and middleware depend on the TokenManager interface, not the
// concrete JWTManager, so authentication can be mocked in tests.
package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ErrInvalidToken is returned when a token cannot be parsed or is otherwise invalid.
var ErrInvalidToken = errors.New("invalid or expired token")

// ErrTokenExpired is returned when a token is well-formed but has expired.
// Clients should attempt a refresh when they see this error.
var ErrTokenExpired = errors.New("token expired")

// TokenManager defines the contract for JWT token operations.
// Depend on this interface instead of *JWTManager for testability.
type TokenManager interface {
	GenerateTokenPair(userID, orgID, role, email, dataRegion string) (*TokenPair, error)
	ValidateToken(tokenStr string) (*Claims, error)
	ValidateRefreshToken(tokenStr string) (*Claims, error)
}

type Claims struct {
	UserID     string `json:"user_id"`
	OrgID      string `json:"org_id"`
	Role       string `json:"role"`
	Email      string `json:"email,omitempty"`
	DataRegion string `json:"data_region,omitempty"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

type JWTManager struct {
	secret     []byte
	tokenTTL   time.Duration
	refreshTTL time.Duration
}

func NewJWTManager(secret string, tokenTTL, refreshTTL time.Duration) *JWTManager {
	return &JWTManager{
		secret:     []byte(secret),
		tokenTTL:   tokenTTL,
		refreshTTL: refreshTTL,
	}
}

func generateJTI() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (m *JWTManager) GenerateTokenPair(userID, orgID, role, email, dataRegion string) (*TokenPair, error) {
	now := time.Now()
	expiresAt := now.Add(m.tokenTTL)

	claims := Claims{
		UserID:     userID,
		OrgID:      orgID,
		Role:       role,
		Email:      email,
		DataRegion: dataRegion,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        generateJTI(),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "featuresignals",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, err := token.SignedString(m.secret)
	if err != nil {
		return nil, err
	}

	refreshClaims := Claims{
		UserID:     userID,
		OrgID:      orgID,
		Role:       role,
		Email:      email,
		DataRegion: dataRegion,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        generateJTI(),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.refreshTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "featuresignals-refresh",
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenStr, err := refreshToken.SignedString(m.secret)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshTokenStr,
		ExpiresAt:    expiresAt.Unix(),
	}, nil
}

func (m *JWTManager) ValidateToken(tokenStr string) (*Claims, error) {
	return m.validateTokenWithIssuer(tokenStr, "featuresignals")
}

// ValidateRefreshToken validates a refresh token specifically, rejecting access tokens.
func (m *JWTManager) ValidateRefreshToken(tokenStr string) (*Claims, error) {
	return m.validateTokenWithIssuer(tokenStr, "featuresignals-refresh")
}

func (m *JWTManager) validateTokenWithIssuer(tokenStr, expectedIssuer string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return m.secret, nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.Issuer != expectedIssuer {
		return nil, ErrInvalidToken
	}

	return claims, nil
}
