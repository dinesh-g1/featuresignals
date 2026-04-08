package email

import "context"

// OTPSender sends OTP verification emails during signup.
type OTPSender interface {
	SendOTP(ctx context.Context, toEmail, toName, otp string) error
}
