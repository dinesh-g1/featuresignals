package email

import "context"

// OTPSender sends OTP verification emails during signup.
type OTPSender interface {
	SendOTP(ctx context.Context, toEmail, toName, otp string) error
}

// VerificationSender is the legacy interface for link-based email verification.
// Deprecated: use OTPSender instead. Kept temporarily for backward compatibility.
type VerificationSender interface {
	SendVerificationEmail(toEmail, token, baseURL string) error
}
