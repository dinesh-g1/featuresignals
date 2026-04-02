package handlers

import (
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"testing"
)

func TestBillingHandler_GenerateHash(t *testing.T) {
	h := &BillingHandler{
		payuMerchantKey: "testkey",
		payuSalt:        "testsalt",
	}
	hash := h.generateHash("TXN001", "999.00", "Pro Plan", "John", "john@test.com")
	if hash == "" {
		t.Error("hash should not be empty")
	}
	if len(hash) != 128 {
		t.Errorf("expected 128-char hash (SHA-512), got %d", len(hash))
	}

	hash2 := h.generateHash("TXN001", "999.00", "Pro Plan", "John", "john@test.com")
	if hash != hash2 {
		t.Error("hash should be deterministic")
	}

	hash3 := h.generateHash("TXN002", "999.00", "Pro Plan", "John", "john@test.com")
	if hash == hash3 {
		t.Error("different txnid should produce different hash")
	}
}

func TestBillingHandler_VerifyReverseHash_Valid(t *testing.T) {
	h := &BillingHandler{
		payuMerchantKey: "testkey",
		payuSalt:        "testsalt",
	}

	txnid := "TXN001"
	amount := "999.00"
	productinfo := "Pro Plan"
	firstname := "John"
	email := "john@test.com"
	status := "success"

	reverseStr := fmt.Sprintf("%s|%s|||||||||||%s|%s|%s|%s|%s|%s",
		h.payuSalt, status, email, firstname, productinfo, amount, txnid, h.payuMerchantKey)
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

	if !h.verifyReverseHash(params) {
		t.Error("valid reverse hash should verify")
	}
}

func TestBillingHandler_VerifyReverseHash_Tampered(t *testing.T) {
	h := &BillingHandler{
		payuMerchantKey: "testkey",
		payuSalt:        "testsalt",
	}

	reverseStr := fmt.Sprintf("%s|%s|||||||||||%s|%s|%s|%s|%s|%s",
		h.payuSalt, "success", "john@test.com", "John", "Pro Plan", "999.00", "TXN001", h.payuMerchantKey)
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

	if h.verifyReverseHash(params) {
		t.Error("tampered params should not verify")
	}
}

func TestBillingHandler_VerifyReverseHash_WrongHash(t *testing.T) {
	h := &BillingHandler{
		payuMerchantKey: "testkey",
		payuSalt:        "testsalt",
	}

	params := map[string]string{
		"txnid":       "TXN001",
		"amount":      "999.00",
		"productinfo": "Pro Plan",
		"firstname":   "John",
		"email":       "john@test.com",
		"status":      "success",
		"hash":        "badhash",
	}

	if h.verifyReverseHash(params) {
		t.Error("wrong hash should not verify")
	}
}

func TestBillingHandler_PayuEndpoint(t *testing.T) {
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
			h := &BillingHandler{payuMode: tt.mode}
			if got := h.payuEndpoint(); got != tt.want {
				t.Errorf("payuEndpoint(%q) = %q, want %q", tt.mode, got, tt.want)
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

func TestBillingHandler_GenerateHash_FormatConsistency(t *testing.T) {
	h := &BillingHandler{
		payuMerchantKey: "merchant",
		payuSalt:        "salt",
	}

	txnid := "FS_test1234_1700000000"
	amount := "999.00"
	productinfo := "FeatureSignals Pro Plan"
	firstname := "Test"
	email := "test@example.com"

	expected := fmt.Sprintf("%s|%s|%s|%s|%s|%s|||||||||||%s",
		h.payuMerchantKey, txnid, amount, productinfo, firstname, email, h.payuSalt)
	expectedHash := sha512.Sum512([]byte(expected))
	want := hex.EncodeToString(expectedHash[:])

	got := h.generateHash(txnid, amount, productinfo, firstname, email)
	if got != want {
		t.Errorf("generateHash does not match manual computation")
	}
}
