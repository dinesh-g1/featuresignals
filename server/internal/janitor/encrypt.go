// Package janitor implements the AI-driven stale flag detection and cleanup engine.
// This file provides AES-256-GCM encryption/decryption for securely storing
// Git provider tokens at rest.
package janitor

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
)

// ─── TokenEncryptor ───────────────────────────────────────────────────────

// TokenEncryptor provides encrypt/decrypt operations for Git provider tokens.
// Uses AES-256-GCM with a random nonce per encryption.
type TokenEncryptor struct {
	key []byte // 32 bytes for AES-256
}

// NewTokenEncryptor creates a TokenEncryptor from a hex-encoded 32-byte key.
// The key must be exactly 64 hex characters (32 bytes).
func NewTokenEncryptor(hexKey string) (*TokenEncryptor, error) {
	if hexKey == "" {
		return nil, fmt.Errorf("encryption key is empty")
	}
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("invalid encryption key (must be hex-encoded): %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("invalid encryption key length: got %d bytes, want 32", len(key))
	}
	return &TokenEncryptor{key: key}, nil
}

// Encrypt encrypts a plaintext string using AES-256-GCM.
// Returns base64-encoded (nonce + ciphertext).
func (e *TokenEncryptor) Encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(e.key)
	if err != nil {
		return "", fmt.Errorf("aes new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("aes gcm: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("nonce generation: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts a base64-encoded (nonce + ciphertext) string.
func (e *TokenEncryptor) Decrypt(ciphertext string) (string, error) {
	block, err := aes.NewCipher(e.key)
	if err != nil {
		return "", fmt.Errorf("aes new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("aes gcm: %w", err)
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("base64 decode: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}

	return string(plaintext), nil
}