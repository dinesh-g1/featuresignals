package handlers

import (
	"net"
	"net/mail"
	"net/url"
	"regexp"
	"strings"

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

// privateNetworks defines CIDR ranges that must not be reachable via webhooks.
var privateNetworks = []net.IPNet{
	{IP: net.IPv4(10, 0, 0, 0), Mask: net.CIDRMask(8, 32)},
	{IP: net.IPv4(172, 16, 0, 0), Mask: net.CIDRMask(12, 32)},
	{IP: net.IPv4(192, 168, 0, 0), Mask: net.CIDRMask(16, 32)},
	{IP: net.IPv4(127, 0, 0, 0), Mask: net.CIDRMask(8, 32)},
	{IP: net.IPv4(169, 254, 0, 0), Mask: net.CIDRMask(16, 32)},
	{IP: net.IPv4(0, 0, 0, 0), Mask: net.CIDRMask(8, 32)},
}

func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return true
	}
	for _, n := range privateNetworks {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

func validateWebhookURL(s string) bool {
	u, err := url.Parse(s)
	if err != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}

	host := u.Hostname()
	if strings.EqualFold(host, "localhost") || strings.HasSuffix(strings.ToLower(host), ".local") {
		return false
	}

	if ip := net.ParseIP(host); ip != nil {
		return !isPrivateIP(ip)
	}

	ips, err := net.LookupIP(host)
	if err != nil {
		return false
	}
	for _, ip := range ips {
		if isPrivateIP(ip) {
			return false
		}
	}
	return true
}
