package handlers

import (
	"net/mail"
	"net/url"
	"regexp"

	"github.com/featuresignals/server/internal/domain"
)

var (
	phoneRe   = regexp.MustCompile(`^\+?[0-9]{7,15}$`)
	flagKeyRe = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,127}$`)
)

var validFlagTypes = map[domain.FlagType]bool{
	domain.FlagTypeBoolean: true,
	domain.FlagTypeString:  true,
	domain.FlagTypeNumber:  true,
	domain.FlagTypeJSON:    true,
	domain.FlagTypeAB:      true,
}

func validateEmail(s string) bool {
	_, err := mail.ParseAddress(s)
	return err == nil
}

func validatePhone(s string) bool {
	return phoneRe.MatchString(s)
}

func validateFlagKey(s string) bool {
	return flagKeyRe.MatchString(s)
}

func validateFlagType(s string) bool {
	return validFlagTypes[domain.FlagType(s)]
}

func validateStringLength(s string, max int) bool {
	return len(s) <= max
}

func validateWebhookURL(s string) bool {
	u, err := url.Parse(s)
	if err != nil {
		return false
	}
	return u.Scheme == "http" || u.Scheme == "https"
}
