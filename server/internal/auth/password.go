package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword returns a bcrypt hash of the given plaintext password.
// Cost factor is 12 (≈250 ms on modern hardware).
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

// CheckPassword compares a plaintext password against a bcrypt hash.
func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
