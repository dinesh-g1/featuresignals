package crypto

import (
	"bytes"
	"crypto/rand"
	"testing"
)

func TestEncryptDecrypt_RoundTrip(t *testing.T) {
	key := [32]byte{}
	for i := range key {
		key[i] = byte(i)
	}

	tests := []struct {
		name      string
		plaintext []byte
	}{
		{"empty", []byte{}},
		{"small", []byte("hello")},
		{"medium", []byte("this is a test message with some length to it")},
		{"large", bytes.Repeat([]byte("A"), 10000)},
		{"binary", []byte{0x00, 0x01, 0xFF, 0xFE}},
		{"unicode", []byte("Hello, 世界! 🌍")},
		{"json", []byte(`{"key":"value","nested":{"a":1,"b":2}}`)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ciphertext, nonce, err := Encrypt(tt.plaintext, key)
			if err != nil {
				t.Fatalf("Encrypt() error = %v", err)
			}
			if len(ciphertext) == 0 && len(tt.plaintext) > 0 {
				t.Error("Encrypt() returned empty ciphertext for non-empty plaintext")
			}
			if len(nonce) == 0 {
				t.Error("Encrypt() returned empty nonce")
			}

			got, err := Decrypt(ciphertext, nonce, key)
			if err != nil {
				t.Fatalf("Decrypt() error = %v", err)
			}
			if !bytes.Equal(got, tt.plaintext) {
				t.Errorf("Decrypt() = %v, want %v", got, tt.plaintext)
			}
		})
	}
}

func TestEncrypt_UniqueNonces(t *testing.T) {
	key := [32]byte{}
	plaintext := []byte("same message")

	nonces := make(map[string]bool)
	for i := 0; i < 10; i++ {
		_, nonce, err := Encrypt(plaintext, key)
		if err != nil {
			t.Fatalf("Encrypt() error = %v", err)
		}
		nonceStr := string(nonce)
		if nonces[nonceStr] {
			t.Error("Encrypt() produced duplicate nonce")
		}
		nonces[nonceStr] = true
	}
}

func TestEncrypt_DifferentKeys_DifferentCiphertext(t *testing.T) {
	plaintext := []byte("test message")
	key1 := [32]byte{1, 2, 3}
	key2 := [32]byte{4, 5, 6}

	c1, _, _ := Encrypt(plaintext, key1)
	c2, _, _ := Encrypt(plaintext, key2)

	if bytes.Equal(c1, c2) {
		t.Error("different keys should produce different ciphertext")
	}
}

func TestDecrypt_WrongKey(t *testing.T) {
	plaintext := []byte("secret data")
	encKey := [32]byte{1, 2, 3}
	decKey := [32]byte{9, 9, 9}

	ciphertext, nonce, err := Encrypt(plaintext, encKey)
	if err != nil {
		t.Fatalf("Encrypt() error = %v", err)
	}

	_, err = Decrypt(ciphertext, nonce, decKey)
	if err == nil {
		t.Error("Decrypt() with wrong key should error")
	}
}

func TestDecrypt_TamperedCiphertext(t *testing.T) {
	key := [32]byte{}
	plaintext := []byte("tamper test")
	ciphertext, nonce, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("Encrypt() error = %v", err)
	}

	// Tamper with ciphertext
	ciphertext[0] ^= 0xFF
	_, err = Decrypt(ciphertext, nonce, key)
	if err == nil {
		t.Error("Decrypt() with tampered ciphertext should error")
	}
}

func TestDecrypt_WrongNonce(t *testing.T) {
	key := [32]byte{}
	plaintext := []byte("nonce test")
	ciphertext, nonce, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("Encrypt() error = %v", err)
	}

	// Tamper with nonce
	nonce[0] ^= 0xFF
	_, err = Decrypt(ciphertext, nonce, key)
	if err == nil {
		t.Error("Decrypt() with wrong nonce should error")
	}
}

func TestDecrypt_ShortNonce(t *testing.T) {
	key := [32]byte{}
	_, err := Decrypt([]byte("ciphertext"), []byte{1, 2}, key)
	if err != ErrInvalidCiphertext {
		t.Errorf("Decrypt() with short nonce = %v, want ErrInvalidCiphertext", err)
	}
}

func TestHash_Consistency(t *testing.T) {
	plaintext := []byte("hash me")
	h1 := Hash(plaintext)
	h2 := Hash(plaintext)
	if h1 != h2 {
		t.Error("Hash() should be deterministic")
	}
}

func TestHash_DifferentInputs(t *testing.T) {
	h1 := Hash([]byte("input1"))
	h2 := Hash([]byte("input2"))
	if h1 == h2 {
		t.Error("Hash() should produce different outputs for different inputs")
	}
}

func TestHash_Empty(t *testing.T) {
	h := Hash([]byte{})
	if h == "" {
		t.Error("Hash() of empty input should not be empty")
	}
}

func TestEncryptDecrypt_LargeKey(t *testing.T) {
	// Ensure 32-byte key works
	key := [32]byte{}
	rand.Read(key[:])

	plaintext := []byte("large key test")
	ciphertext, nonce, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("Encrypt() error = %v", err)
	}

	got, err := Decrypt(ciphertext, nonce, key)
	if err != nil {
		t.Fatalf("Decrypt() error = %v", err)
	}
	if !bytes.Equal(got, plaintext) {
		t.Error("Decrypt() returned different plaintext")
	}
}