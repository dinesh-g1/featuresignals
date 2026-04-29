package domain

import (
	"errors"
	"fmt"
)

// Sentinel errors for the store and service layers.
var (
	ErrNotFound   = errors.New("not found")
	ErrConflict   = errors.New("conflict")
	ErrValidation = errors.New("validation error")
	ErrExpired    = errors.New("expired")
	ErrForbidden  = errors.New("forbidden")
)

// ValidationError carries field-level detail for input validation failures.
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

func NewValidationError(field, message string) *ValidationError {
	return &ValidationError{Field: field, Message: message}
}

func WrapNotFound(noun string) error {
	return fmt.Errorf("%s %w", noun, ErrNotFound)
}

func WrapConflict(noun string) error {
	return fmt.Errorf("%s %w", noun, ErrConflict)
}

func WrapExpired(noun string) error {
	return fmt.Errorf("%s %w", noun, ErrExpired)
}