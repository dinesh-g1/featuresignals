package domain

import (
	"errors"
	"fmt"
)

// Sentinel errors for the store and service layers.
// All store implementations must return these (wrapped via fmt.Errorf %w)
// so callers can use errors.Is for reliable HTTP status mapping.
var (
	ErrNotFound    = errors.New("not found")
	ErrConflict    = errors.New("conflict")
	ErrValidation  = errors.New("validation error")
	ErrMFARequired = errors.New("mfa_required")
	ErrMFAInvalid  = errors.New("invalid MFA code")
	ErrExpired     = errors.New("expired")
)

// ValidationError carries field-level detail for input validation failures.
// Unwrap returns ErrValidation so errors.Is(err, ErrValidation) works.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	if e.Field != "" {
		return e.Field + ": " + e.Message
	}
	return e.Message
}

func (e *ValidationError) Unwrap() error { return ErrValidation }

// NewValidationError is a convenience constructor.
func NewValidationError(field, message string) *ValidationError {
	return &ValidationError{Field: field, Message: message}
}

// WrapNotFound wraps ErrNotFound with a contextual noun (e.g. "flag not found").
func WrapNotFound(noun string) error {
	return fmt.Errorf("%s %w", noun, ErrNotFound)
}

// WrapConflict wraps ErrConflict with a contextual noun (e.g. "flag key conflict").
func WrapConflict(noun string) error {
	return fmt.Errorf("%s %w", noun, ErrConflict)
}

// WrapExpired wraps ErrExpired with a contextual noun.
func WrapExpired(noun string) error {
	return fmt.Errorf("%s %w", noun, ErrExpired)
}
