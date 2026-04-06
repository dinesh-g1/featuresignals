package dto

import "time"

type MFAEnableResponse struct {
	Secret string `json:"secret"`
	QRURI  string `json:"qr_uri"`
}

type MFAStatusResponse struct {
	Enabled    bool       `json:"enabled"`
	VerifiedAt *time.Time `json:"verified_at,omitempty"`
}
