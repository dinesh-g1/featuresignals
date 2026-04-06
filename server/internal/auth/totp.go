package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"math"
	"time"
)

const (
	totpDigits = 6
	totpPeriod = 30
)

// GenerateTOTPSecret generates a random 20-byte base32-encoded TOTP secret.
func GenerateTOTPSecret() (string, error) {
	secret := make([]byte, 20)
	if _, err := rand.Read(secret); err != nil {
		return "", fmt.Errorf("generate TOTP secret: %w", err)
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secret), nil
}

// TOTPKeyURI generates the otpauth:// URI for QR code generation.
func TOTPKeyURI(secret, email, issuer string) string {
	return fmt.Sprintf("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d",
		issuer, email, secret, issuer, totpDigits, totpPeriod)
}

// ValidateTOTP validates a TOTP code against the secret, checking the current
// window and one step before/after to account for clock drift.
func ValidateTOTP(secret, code string) bool {
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(secret)
	if err != nil {
		return false
	}

	now := time.Now().Unix()
	counter := now / totpPeriod

	for i := int64(-1); i <= 1; i++ {
		if generateHOTP(key, counter+i) == code {
			return true
		}
	}
	return false
}

func generateHOTP(key []byte, counter int64) string {
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
