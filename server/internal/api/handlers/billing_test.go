package handlers

import (
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"testing"
)

func TestPayUHasher_Hash(t *testing.T) {
	h := PayUHasher{MerchantKey: "testkey", Salt: "testsalt"}
	hash := h.Hash("TXN001", "999.00", "Pro Plan", "John", "john@test.com")
	if hash == "" {
		t.Error("hash should not be empty")
	}
	if len(hash) != 128 {
		t.Errorf("expected 128-char hash (SHA-512), got %d", len(hash))
	}

	hash2 := h.Hash("TXN001", "999.00", "Pro Plan", "John", "john@test.com")
	if hash != hash2 {
		t.Error("hash should be deterministic")
	}

	hash3 := h.Hash("TXN002", "999.00", "Pro Plan", "John", "john@test.com")
	if hash == hash3 {
		t.Error("different txnid should produce different hash")
	}
}

func TestPayUHasher_VerifyReverse_Valid(t *testing.T) {
	h := PayUHasher{MerchantKey: "testkey", Salt: "testsalt"}

	txnid := "TXN001"
	amount := "999.00"
	productinfo := "Pro Plan"
	firstname := "John"
	email := "john@test.com"
	status := "success"

	reverseStr := fmt.Sprintf("%s|%s|||||||||||%s|%s|%s|%s|%s|%s",
		h.Salt, status, email, firstname, productinfo, amount, txnid, h.MerchantKey)
	reverseHashBytes := sha512.Sum512([]byte(reverseStr))
	reverseHash := hex.EncodeToString(reverseHashBytes[:])

	params := map[string]string{
		"txnid":       txnid,
		"amount":      amount,
		"productinfo": productinfo,
		"firstname":   firstname,
		"email":       email,
		"status":      status,
		"hash":        reverseHash,
	}

	if !h.VerifyReverse(params) {
		t.Error("valid reverse hash should verify")
	}
}

func TestPayUHasher_VerifyReverse_Tampered(t *testing.T) {
	h := PayUHasher{MerchantKey: "testkey", Salt: "testsalt"}

	reverseStr := fmt.Sprintf("%s|%s|||||||||||%s|%s|%s|%s|%s|%s",
		h.Salt, "success", "john@test.com", "John", "Pro Plan", "999.00", "TXN001", h.MerchantKey)
	reverseHashBytes := sha512.Sum512([]byte(reverseStr))
	reverseHash := hex.EncodeToString(reverseHashBytes[:])

	params := map[string]string{
		"txnid":       "TXN001",
		"amount":      "1.00", // tampered
		"productinfo": "Pro Plan",
		"firstname":   "John",
		"email":       "john@test.com",
		"status":      "success",
		"hash":        reverseHash,
	}

	if h.VerifyReverse(params) {
		t.Error("tampered params should not verify")
	}
}

func TestPayUHasher_VerifyReverse_WrongHash(t *testing.T) {
	h := PayUHasher{MerchantKey: "testkey", Salt: "testsalt"}

	params := map[string]string{
		"txnid":       "TXN001",
		"amount":      "999.00",
		"productinfo": "Pro Plan",
		"firstname":   "John",
		"email":       "john@test.com",
		"status":      "success",
		"hash":        "badhash",
	}

	if h.VerifyReverse(params) {
		t.Error("wrong hash should not verify")
	}
}

func TestPayUHasher_Endpoint(t *testing.T) {
	h := PayUHasher{MerchantKey: "k", Salt: "s"}
	tests := []struct {
		mode string
		want string
	}{
		{"test", "https://test.payu.in/_payment"},
		{"live", "https://secure.payu.in/_payment"},
		{"", "https://test.payu.in/_payment"},
	}
	for _, tt := range tests {
		t.Run(tt.mode, func(t *testing.T) {
			if got := h.Endpoint(tt.mode); got != tt.want {
				t.Errorf("Endpoint(%q) = %q, want %q", tt.mode, got, tt.want)
			}
		})
	}
}

func TestSplitTxnID(t *testing.T) {
	tests := []struct {
		txnid     string
		wantOrg   string
		expectNil bool
	}{
		{"FS_abc12345_1234567890", "abc12345", false},
		{"FS_12345678_9999", "12345678", false},
		{"INVALID", "", true},
		{"FS_", "", true},
		{"", "", true},
		{"XX_abc_123", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.txnid, func(t *testing.T) {
			parts := splitTxnID(tt.txnid)
			if tt.expectNil {
				if parts != nil {
					t.Errorf("splitTxnID(%q) should be nil", tt.txnid)
				}
			} else {
				if parts == nil {
					t.Fatalf("splitTxnID(%q) should not be nil", tt.txnid)
				}
				if parts.orgPrefix != tt.wantOrg {
					t.Errorf("splitTxnID(%q).orgPrefix = %q, want %q", tt.txnid, parts.orgPrefix, tt.wantOrg)
				}
			}
		})
	}
}

func TestPayUHasher_Hash_FormatConsistency(t *testing.T) {
	h := PayUHasher{MerchantKey: "merchant", Salt: "salt"}

	txnid := "FS_test1234_1700000000"
	amount := "999.00"
	productinfo := "FeatureSignals Pro Plan"
	firstname := "Test"
	email := "test@example.com"

	expected := fmt.Sprintf("%s|%s|%s|%s|%s|%s|||||||||||%s",
		h.MerchantKey, txnid, amount, productinfo, firstname, email, h.Salt)
	expectedHash := sha512.Sum512([]byte(expected))
	want := hex.EncodeToString(expectedHash[:])

	got := h.Hash(txnid, amount, productinfo, firstname, email)
	if got != want {
		t.Errorf("Hash does not match manual computation")
	}
}
