package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/license"
)

func main() {
	genKeys := flag.Bool("genkeys", false, "Generate a new RSA key pair")
	keyBits := flag.Int("bits", 4096, "RSA key size in bits (for -genkeys)")
	privKeyFile := flag.String("key", "", "Path to RSA private key PEM file")
	outFile := flag.String("out", "", "Output file for generated license (stdout if empty)")

	licenseID := flag.String("id", "", "License ID")
	customerName := flag.String("customer", "", "Customer name")
	customerID := flag.String("customer-id", "", "Customer ID")
	plan := flag.String("plan", "enterprise", "Plan: pro or enterprise")
	maxSeats := flag.Int("seats", 50, "Maximum seats")
	maxProjects := flag.Int("projects", 100, "Maximum projects")
	features := flag.String("features", "", "Comma-separated feature list")
	validDays := flag.Int("days", 365, "License validity in days")

	flag.Parse()

	if *genKeys {
		if err := generateKeyPair(*keyBits); err != nil {
			fmt.Fprintf(os.Stderr, "Error generating keys: %v\n", err)
			os.Exit(1)
		}
		return
	}

	if *privKeyFile == "" || *licenseID == "" || *customerID == "" {
		fmt.Fprintln(os.Stderr, "Usage: licensegen -key <private.pem> -id <license-id> -customer-id <id> [options]")
		fmt.Fprintln(os.Stderr, "       licensegen -genkeys [-bits 4096]")
		flag.PrintDefaults()
		os.Exit(1)
	}

	privPEM, err := os.ReadFile(*privKeyFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading private key: %v\n", err)
		os.Exit(1)
	}

	var featureList []string
	if *features != "" {
		for _, f := range strings.Split(*features, ",") {
			if trimmed := strings.TrimSpace(f); trimmed != "" {
				featureList = append(featureList, trimmed)
			}
		}
	} else {
		featureList = defaultFeatures(license.Plan(*plan))
	}

	claims := &license.Claims{
		LicenseID:    *licenseID,
		CustomerName: *customerName,
		CustomerID:   *customerID,
		Plan:         license.Plan(*plan),
		MaxSeats:     *maxSeats,
		MaxProjects:  *maxProjects,
		Features:     featureList,
		IssuedAt:     time.Now().UTC(),
		ExpiresAt:    time.Now().UTC().Add(time.Duration(*validDays) * 24 * time.Hour),
	}

	key, err := license.Sign(claims, privPEM)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error signing license: %v\n", err)
		os.Exit(1)
	}

	encoded := key.Encode()

	if *outFile != "" {
		if err := os.WriteFile(*outFile, []byte(encoded), 0600); err != nil {
			fmt.Fprintf(os.Stderr, "Error writing license file: %v\n", err)
			os.Exit(1)
		}
		fmt.Fprintf(os.Stderr, "License written to %s\n", *outFile)
	} else {
		fmt.Println(encoded)
	}

	fmt.Fprintf(os.Stderr, "License ID:    %s\n", claims.LicenseID)
	fmt.Fprintf(os.Stderr, "Customer:      %s (%s)\n", claims.CustomerName, claims.CustomerID)
	fmt.Fprintf(os.Stderr, "Plan:          %s\n", claims.Plan)
	fmt.Fprintf(os.Stderr, "Seats:         %d\n", claims.MaxSeats)
	fmt.Fprintf(os.Stderr, "Projects:      %d\n", claims.MaxProjects)
	fmt.Fprintf(os.Stderr, "Features:      %s\n", strings.Join(claims.Features, ", "))
	fmt.Fprintf(os.Stderr, "Expires:       %s\n", claims.ExpiresAt.Format(time.DateOnly))
}

func generateKeyPair(bits int) error {
	privKey, err := rsa.GenerateKey(rand.Reader, bits)
	if err != nil {
		return fmt.Errorf("generate key: %w", err)
	}

	privDER, err := x509.MarshalPKCS8PrivateKey(privKey)
	if err != nil {
		return fmt.Errorf("marshal private key: %w", err)
	}
	privPEM := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privDER})

	pubDER, err := x509.MarshalPKIXPublicKey(&privKey.PublicKey)
	if err != nil {
		return fmt.Errorf("marshal public key: %w", err)
	}
	pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubDER})

	if err := os.WriteFile("license-private.pem", privPEM, 0600); err != nil {
		return fmt.Errorf("write private key: %w", err)
	}
	if err := os.WriteFile("license-public.pem", pubPEM, 0644); err != nil {
		return fmt.Errorf("write public key: %w", err)
	}

	fmt.Fprintln(os.Stderr, "Generated license-private.pem (keep secret!) and license-public.pem")
	return nil
}

func defaultFeatures(plan license.Plan) []string {
	pro := []string{
		"approvals", "webhooks", "scheduling", "audit_export", "mfa", "data_export",
	}
	enterprise := append(pro, "sso", "scim", "ip_allowlist", "custom_roles")

	switch plan {
	case license.PlanEnterprise:
		return enterprise
	case license.PlanPro:
		return pro
	default:
		return pro
	}
}
