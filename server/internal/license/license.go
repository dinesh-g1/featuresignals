package license

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"time"
)

var (
	ErrInvalidLicense  = errors.New("invalid license")
	ErrExpiredLicense  = errors.New("license expired")
	ErrExceededSeats   = errors.New("seat limit exceeded")
	ErrExceededProjects = errors.New("project limit exceeded")
)

type Plan string

const (
	PlanPro        Plan = "pro"
	PlanEnterprise Plan = "enterprise"
)

// Claims contains the data embedded in a signed license key.
type Claims struct {
	LicenseID    string    `json:"license_id"`
	CustomerName string    `json:"customer_name"`
	CustomerID   string    `json:"customer_id"`
	Plan         Plan      `json:"plan"`
	MaxSeats     int       `json:"max_seats"`
	MaxProjects  int       `json:"max_projects"`
	Features     []string  `json:"features"`
	IssuedAt     time.Time `json:"issued_at"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// Validate checks that the claims represent a valid, non-expired license.
func (c *Claims) Validate() error {
	if c.LicenseID == "" || c.CustomerID == "" {
		return fmt.Errorf("%w: missing required fields", ErrInvalidLicense)
	}
	if c.Plan != PlanPro && c.Plan != PlanEnterprise {
		return fmt.Errorf("%w: unknown plan %q", ErrInvalidLicense, c.Plan)
	}
	if c.ExpiresAt.Before(time.Now()) {
		return fmt.Errorf("%w: expired on %s", ErrExpiredLicense, c.ExpiresAt.Format(time.DateOnly))
	}
	return nil
}

// HasFeature checks whether a specific feature is included.
func (c *Claims) HasFeature(feature string) bool {
	for _, f := range c.Features {
		if f == feature {
			return true
		}
	}
	return false
}

// Key is a signed license consisting of base64-encoded payload and signature
// separated by a period.
type Key struct {
	Payload   string `json:"payload"`
	Signature string `json:"signature"`
}

// Sign creates a signed license key from claims using an RSA private key.
func Sign(claims *Claims, privateKeyPEM []byte) (*Key, error) {
	payload, err := json.Marshal(claims)
	if err != nil {
		return nil, fmt.Errorf("marshal claims: %w", err)
	}

	privKey, err := parsePrivateKey(privateKeyPEM)
	if err != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}

	hash := sha256.Sum256(payload)
	sig, err := rsa.SignPKCS1v15(nil, privKey, crypto.SHA256, hash[:])
	if err != nil {
		return nil, fmt.Errorf("sign: %w", err)
	}

	return &Key{
		Payload:   base64.StdEncoding.EncodeToString(payload),
		Signature: base64.StdEncoding.EncodeToString(sig),
	}, nil
}

// Verify decodes and verifies a license key against the RSA public key,
// returning the validated claims.
func Verify(key *Key, publicKeyPEM []byte) (*Claims, error) {
	payload, err := base64.StdEncoding.DecodeString(key.Payload)
	if err != nil {
		return nil, fmt.Errorf("%w: decode payload: %v", ErrInvalidLicense, err)
	}

	sig, err := base64.StdEncoding.DecodeString(key.Signature)
	if err != nil {
		return nil, fmt.Errorf("%w: decode signature: %v", ErrInvalidLicense, err)
	}

	pubKey, err := parsePublicKey(publicKeyPEM)
	if err != nil {
		return nil, fmt.Errorf("%w: parse public key: %v", ErrInvalidLicense, err)
	}

	hash := sha256.Sum256(payload)
	if err := rsa.VerifyPKCS1v15(pubKey, crypto.SHA256, hash[:], sig); err != nil {
		return nil, fmt.Errorf("%w: signature verification failed", ErrInvalidLicense)
	}

	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("%w: unmarshal claims: %v", ErrInvalidLicense, err)
	}

	if err := claims.Validate(); err != nil {
		return nil, err
	}

	return &claims, nil
}

// Encode serializes a Key to a single string (payload.signature).
func (k *Key) Encode() string {
	return k.Payload + "." + k.Signature
}

// Decode parses a "payload.signature" string into a Key.
func Decode(raw string) (*Key, error) {
	for i := 0; i < len(raw); i++ {
		if raw[i] == '.' {
			return &Key{
				Payload:   raw[:i],
				Signature: raw[i+1:],
			}, nil
		}
	}
	return nil, fmt.Errorf("%w: malformed license key", ErrInvalidLicense)
}

func parsePrivateKey(pemData []byte) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode(pemData)
	if block == nil {
		return nil, errors.New("no PEM block found")
	}
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		key2, err2 := x509.ParsePKCS1PrivateKey(block.Bytes)
		if err2 != nil {
			return nil, fmt.Errorf("parse private key (PKCS8: %v, PKCS1: %v)", err, err2)
		}
		return key2, nil
	}
	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("key is not RSA")
	}
	return rsaKey, nil
}

func parsePublicKey(pemData []byte) (*rsa.PublicKey, error) {
	block, _ := pem.Decode(pemData)
	if block == nil {
		return nil, errors.New("no PEM block found")
	}
	key, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse public key: %w", err)
	}
	rsaKey, ok := key.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("key is not RSA")
	}
	return rsaKey, nil
}
