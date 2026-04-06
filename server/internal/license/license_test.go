package license

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"testing"
	"time"
)

func generateTestKeyPair(t *testing.T) ([]byte, []byte) {
	t.Helper()
	privKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	privDER, err := x509.MarshalPKCS8PrivateKey(privKey)
	if err != nil {
		t.Fatalf("marshal private key: %v", err)
	}
	privPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privDER})

	pubDER, err := x509.MarshalPKIXPublicKey(&privKey.PublicKey)
	if err != nil {
		t.Fatalf("marshal public key: %v", err)
	}
	pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubDER})

	return privPEM, pubPEM
}

func validClaims() *Claims {
	return &Claims{
		LicenseID:    "lic-001",
		CustomerName: "Acme Corp",
		CustomerID:   "cust-001",
		Plan:         PlanEnterprise,
		MaxSeats:     50,
		MaxProjects:  20,
		Features:     []string{"sso", "scim", "audit_export", "ip_allowlist"},
		IssuedAt:     time.Now(),
		ExpiresAt:    time.Now().Add(365 * 24 * time.Hour),
	}
}

func TestSignAndVerify(t *testing.T) {
	privPEM, pubPEM := generateTestKeyPair(t)
	claims := validClaims()

	key, err := Sign(claims, privPEM)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	verified, err := Verify(key, pubPEM)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}

	if verified.LicenseID != claims.LicenseID {
		t.Errorf("license_id: got %q, want %q", verified.LicenseID, claims.LicenseID)
	}
	if verified.Plan != claims.Plan {
		t.Errorf("plan: got %q, want %q", verified.Plan, claims.Plan)
	}
	if verified.MaxSeats != claims.MaxSeats {
		t.Errorf("max_seats: got %d, want %d", verified.MaxSeats, claims.MaxSeats)
	}
}

func TestEncodeAndDecode(t *testing.T) {
	privPEM, pubPEM := generateTestKeyPair(t)
	claims := validClaims()

	key, err := Sign(claims, privPEM)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	encoded := key.Encode()
	decoded, err := Decode(encoded)
	if err != nil {
		t.Fatalf("decode: %v", err)
	}

	verified, err := Verify(decoded, pubPEM)
	if err != nil {
		t.Fatalf("verify decoded: %v", err)
	}

	if verified.CustomerID != claims.CustomerID {
		t.Errorf("customer_id mismatch after encode/decode")
	}
}

func TestVerify_ExpiredLicense(t *testing.T) {
	privPEM, pubPEM := generateTestKeyPair(t)
	claims := validClaims()
	claims.ExpiresAt = time.Now().Add(-24 * time.Hour)

	key, err := Sign(claims, privPEM)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	_, err = Verify(key, pubPEM)
	if err == nil {
		t.Fatal("expected error for expired license")
	}
}

func TestVerify_TamperedPayload(t *testing.T) {
	privPEM, pubPEM := generateTestKeyPair(t)
	claims := validClaims()

	key, err := Sign(claims, privPEM)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	// Tamper with first char of payload
	runes := []rune(key.Payload)
	if runes[0] == 'A' {
		runes[0] = 'B'
	} else {
		runes[0] = 'A'
	}
	key.Payload = string(runes)

	_, err = Verify(key, pubPEM)
	if err == nil {
		t.Fatal("expected error for tampered payload")
	}
}

func TestVerify_WrongPublicKey(t *testing.T) {
	privPEM, _ := generateTestKeyPair(t)
	_, pubPEM2 := generateTestKeyPair(t)
	claims := validClaims()

	key, err := Sign(claims, privPEM)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	_, err = Verify(key, pubPEM2)
	if err == nil {
		t.Fatal("expected error for wrong public key")
	}
}

func TestDecode_Malformed(t *testing.T) {
	_, err := Decode("no-dot-separator")
	if err == nil {
		t.Fatal("expected error for malformed key")
	}
}

func TestClaims_HasFeature(t *testing.T) {
	claims := validClaims()

	if !claims.HasFeature("sso") {
		t.Error("expected HasFeature(sso) = true")
	}
	if claims.HasFeature("nonexistent") {
		t.Error("expected HasFeature(nonexistent) = false")
	}
}

func TestClaims_Validate_MissingFields(t *testing.T) {
	tests := []struct {
		name   string
		claims *Claims
	}{
		{
			name:   "missing license_id",
			claims: &Claims{CustomerID: "c1", Plan: PlanPro, ExpiresAt: time.Now().Add(time.Hour)},
		},
		{
			name:   "missing customer_id",
			claims: &Claims{LicenseID: "l1", Plan: PlanPro, ExpiresAt: time.Now().Add(time.Hour)},
		},
		{
			name:   "unknown plan",
			claims: &Claims{LicenseID: "l1", CustomerID: "c1", Plan: "unknown", ExpiresAt: time.Now().Add(time.Hour)},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if err := tc.claims.Validate(); err == nil {
				t.Error("expected validation error")
			}
		})
	}
}
