package auth

import (
	"testing"
)

func TestHashPassword(t *testing.T) {
	hash, err := HashPassword("my-secure-password")
	if err != nil {
		t.Fatalf("HashPassword() error: %v", err)
	}

	if hash == "" {
		t.Error("expected non-empty hash")
	}
	if hash == "my-secure-password" {
		t.Error("hash should not equal plaintext")
	}
}

func TestCheckPassword_Correct(t *testing.T) {
	hash, err := HashPassword("my-secure-password")
	if err != nil {
		t.Fatalf("HashPassword() error: %v", err)
	}

	if !CheckPassword("my-secure-password", hash) {
		t.Error("expected correct password to match")
	}
}

func TestCheckPassword_Incorrect(t *testing.T) {
	hash, err := HashPassword("my-secure-password")
	if err != nil {
		t.Fatalf("HashPassword() error: %v", err)
	}

	if CheckPassword("wrong-password", hash) {
		t.Error("expected wrong password to not match")
	}
}

func TestCheckPassword_EmptyPassword(t *testing.T) {
	hash, err := HashPassword("my-secure-password")
	if err != nil {
		t.Fatalf("HashPassword() error: %v", err)
	}

	if CheckPassword("", hash) {
		t.Error("expected empty password to not match")
	}
}

func TestHashPassword_DifferentPasswords(t *testing.T) {
	h1, _ := HashPassword("password1")
	h2, _ := HashPassword("password2")

	if h1 == h2 {
		t.Error("different passwords should produce different hashes")
	}
}

func TestHashPassword_SamePasswordDifferentHashes(t *testing.T) {
	h1, _ := HashPassword("same-password")
	h2, _ := HashPassword("same-password")

	if h1 == h2 {
		t.Error("bcrypt should produce different hashes for same password due to salt")
	}

	// But both should verify correctly
	if !CheckPassword("same-password", h1) || !CheckPassword("same-password", h2) {
		t.Error("both hashes should verify against the same password")
	}
}

func TestCheckPassword_InvalidHash(t *testing.T) {
	if CheckPassword("password", "not-a-valid-hash") {
		t.Error("expected invalid hash to not match")
	}
}
