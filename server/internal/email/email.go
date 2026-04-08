package email

import "github.com/featuresignals/server/internal/domain"

// OTPSender is an alias for the canonical domain.OTPSender interface.
// Kept for backward compatibility; new code should depend on domain.OTPSender.
type OTPSender = domain.OTPSender
