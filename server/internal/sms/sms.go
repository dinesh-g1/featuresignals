package sms

// Sender defines the interface for sending OTPs via SMS.
type Sender interface {
	SendOTP(phone, otp string) error
}
