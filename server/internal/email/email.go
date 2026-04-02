package email

// VerificationSender defines the interface for sending verification emails.
type VerificationSender interface {
	SendVerificationEmail(toEmail, token, baseURL string) error
}
