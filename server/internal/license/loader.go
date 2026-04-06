package license

import (
	"fmt"
	"log/slog"
	"os"
	"time"
)

// Info represents the loaded and validated license state for the running server.
type Info struct {
	Claims  *Claims
	Valid   bool
	Message string
}

// Load reads a license key string and public key PEM file, verifies the
// signature, and returns license info. If licenseKey is empty the server
// runs in free/cloud mode (no license needed).
func Load(licenseKey, publicKeyPath string, logger *slog.Logger) *Info {
	if licenseKey == "" {
		logger.Info("no license key configured, running in cloud/free mode")
		return &Info{Valid: true, Message: "cloud mode (no license)"}
	}

	if publicKeyPath == "" {
		logger.Warn("LICENSE_KEY set but LICENSE_PUBLIC_KEY_PATH missing")
		return &Info{Valid: false, Message: "license public key path not configured"}
	}

	pubPEM, err := os.ReadFile(publicKeyPath)
	if err != nil {
		logger.Error("failed to read license public key", "path", publicKeyPath, "error", err)
		return &Info{Valid: false, Message: fmt.Sprintf("cannot read public key: %v", err)}
	}

	key, err := Decode(licenseKey)
	if err != nil {
		logger.Error("failed to decode license key", "error", err)
		return &Info{Valid: false, Message: "malformed license key"}
	}

	claims, err := Verify(key, pubPEM)
	if err != nil {
		logger.Error("license verification failed", "error", err)
		return &Info{Valid: false, Message: fmt.Sprintf("invalid license: %v", err)}
	}

	daysLeft := int(time.Until(claims.ExpiresAt).Hours() / 24)
	logger.Info("license validated",
		"license_id", claims.LicenseID,
		"customer", claims.CustomerName,
		"plan", claims.Plan,
		"seats", claims.MaxSeats,
		"projects", claims.MaxProjects,
		"expires", claims.ExpiresAt.Format(time.DateOnly),
		"days_left", daysLeft,
	)

	if daysLeft <= 30 {
		logger.Warn("license expiring soon", "days_left", daysLeft)
	}

	return &Info{
		Claims:  claims,
		Valid:   true,
		Message: fmt.Sprintf("valid license: %s plan, expires %s", claims.Plan, claims.ExpiresAt.Format(time.DateOnly)),
	}
}
