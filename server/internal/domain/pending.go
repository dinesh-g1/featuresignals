package domain

import "time"

// PendingRegistration holds unverified signup data until the user confirms
// their email with the OTP. Rows are garbage-collected after expiry.
type PendingRegistration struct {
	ID           string    `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	Name         string    `json:"name" db:"name"`
	OrgName      string    `json:"org_name" db:"org_name"`
	DataRegion   string    `json:"data_region" db:"data_region"`
	PasswordHash string    `json:"-" db:"password_hash"`
	OTPHash      string    `json:"-" db:"otp_hash"`
	ExpiresAt    time.Time `json:"expires_at" db:"expires_at"`
	Attempts     int       `json:"attempts" db:"attempts"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

const (
	OTPLength          = 6
	OTPExpiryMinutes   = 10
	OTPMaxAttempts     = 5
	OTPResendCooldown  = 60 // seconds
)
