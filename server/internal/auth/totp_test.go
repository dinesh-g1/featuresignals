package auth

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"math"
	"testing"
	"time"
)

func TestGenerateTOTPSecret(t *testing.T) {
	secret, err := GenerateTOTPSecret()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if secret == "" {
		t.Fatal("expected non-empty secret")
	}
	if len(secret) < 20 {
		t.Fatalf("expected secret length >= 20, got %d", len(secret))
	}

	secret2, _ := GenerateTOTPSecret()
	if secret == secret2 {
		t.Fatal("two generated secrets should differ")
	}
}

func TestTOTPKeyURI(t *testing.T) {
	uri := TOTPKeyURI("JBSWY3DPEHPK3PXP", "user@example.com", "FeatureSignals")
	if uri == "" {
		t.Fatal("expected non-empty URI")
	}
	expected := "otpauth://totp/"
	if len(uri) < len(expected) || uri[:len(expected)] != expected {
		t.Fatalf("expected URI to start with %q, got %q", expected, uri)
	}
}

func TestValidateTOTP_InvalidSecret(t *testing.T) {
	if ValidateTOTP("!!!invalid!!!", "123456") {
		t.Fatal("expected invalid secret to fail")
	}
}

func TestValidateTOTP_SelfConsistency(t *testing.T) {
	secret, err := GenerateTOTPSecret()
	if err != nil {
		t.Fatalf("generate: %v", err)
	}

	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(secret)
	if err != nil {
		t.Fatalf("decode: %v", err)
	}

	counter := time.Now().Unix() / totpPeriod
	code := testGenerateHOTP(key, counter)

	if !ValidateTOTP(secret, code) {
		t.Fatalf("expected self-generated code %q to validate for secret", code)
	}
}

func TestValidateTOTP_WrongCode(t *testing.T) {
	secret, _ := GenerateTOTPSecret()
	if ValidateTOTP(secret, "000000") && ValidateTOTP(secret, "111111") && ValidateTOTP(secret, "999999") {
		t.Fatal("extremely unlikely that all random codes validate")
	}
}

func TestValidateTOTP_EmptyCode(t *testing.T) {
	secret, _ := GenerateTOTPSecret()
	if ValidateTOTP(secret, "") {
		t.Fatal("empty code should not validate")
	}
}

func testGenerateHOTP(key []byte, counter int64) string {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(counter))
	mac := hmac.New(sha1.New, key)
	mac.Write(buf)
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0xf
	code := binary.BigEndian.Uint32(sum[offset:offset+4]) & 0x7fffffff
	otp := code % uint32(math.Pow10(totpDigits))
	return fmt.Sprintf("%0*d", totpDigits, otp)
}
