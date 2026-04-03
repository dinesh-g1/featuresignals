package domain

import (
	"errors"
	"testing"
)

func TestValidationError_Unwrap(t *testing.T) {
	ve := NewValidationError("email", "is required")
	if !errors.Is(ve, ErrValidation) {
		t.Error("expected ValidationError to unwrap to ErrValidation")
	}
	if ve.Error() != "email: is required" {
		t.Errorf("got %q", ve.Error())
	}
}

func TestValidationError_EmptyField(t *testing.T) {
	ve := &ValidationError{Message: "general error"}
	if ve.Error() != "general error" {
		t.Errorf("got %q", ve.Error())
	}
}

func TestWrapNotFound(t *testing.T) {
	err := WrapNotFound("flag")
	if !errors.Is(err, ErrNotFound) {
		t.Error("expected wrapped error to match ErrNotFound")
	}
	if err.Error() != "flag not found" {
		t.Errorf("got %q", err.Error())
	}
}

func TestWrapConflict(t *testing.T) {
	err := WrapConflict("email")
	if !errors.Is(err, ErrConflict) {
		t.Error("expected wrapped error to match ErrConflict")
	}
	if err.Error() != "email conflict" {
		t.Errorf("got %q", err.Error())
	}
}

func TestSentinelErrors_AreDistinct(t *testing.T) {
	if errors.Is(ErrNotFound, ErrConflict) {
		t.Error("ErrNotFound should not match ErrConflict")
	}
	if errors.Is(ErrNotFound, ErrValidation) {
		t.Error("ErrNotFound should not match ErrValidation")
	}
}
