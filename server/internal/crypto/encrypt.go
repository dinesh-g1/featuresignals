package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
)

var (
	ErrInvalidCiphertext = errors.New("invalid ciphertext")
	ErrInvalidKey        = errors.New("invalid encryption key length")
)

// Encrypt encrypts plaintext with AES-256-GCM using the given key.
// Returns ciphertext and a random 12-byte nonce.
func Encrypt(plaintext []byte, key [32]byte) (ciphertext, nonce []byte, err error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, nil, fmt.Errorf("aes new cipher: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, fmt.Errorf("aes gcm: %w", err)
	}

	nonce = make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("rand read: %w", err)
	}

	ciphertext = aesGCM.Seal(nil, nonce, plaintext, nil)
	return ciphertext, nonce, nil
}

// Decrypt decrypts ciphertext with AES-256-GCM using the given key and nonce.
func Decrypt(ciphertext, nonce []byte, key [32]byte) ([]byte, error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, fmt.Errorf("aes new cipher: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("aes gcm: %w", err)
	}

	if len(nonce) != aesGCM.NonceSize() {
		return nil, ErrInvalidCiphertext
	}

	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("aes open: %w", err)
	}

	return plaintext, nil
}

// Hash returns SHA-256 hex digest of plaintext for equality checks without decrypting.
func Hash(plaintext []byte) string {
	h := sha256.Sum256(plaintext)
	return hex.EncodeToString(h[:])
}