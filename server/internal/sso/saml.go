package sso

import (
	"crypto/x509"
	"encoding/pem"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/crewjam/saml"

	"github.com/featuresignals/server/internal/domain"
)

// SAMLProvider wraps the crewjam/saml service provider for a single org.
type SAMLProvider struct {
	SP *saml.ServiceProvider
}

// NewSAMLProvider builds a SAML Service Provider from stored config.
// It supports both metadata URL and inline metadata XML.
func NewSAMLProvider(cfg *domain.SSOConfig, appBaseURL string, orgSlug string) (*SAMLProvider, error) {
	acsURL, err := url.Parse(fmt.Sprintf("%s/v1/sso/saml/acs/%s", appBaseURL, orgSlug))
	if err != nil {
		return nil, fmt.Errorf("parse ACS URL: %w", err)
	}
	metadataURL, err := url.Parse(fmt.Sprintf("%s/v1/sso/saml/metadata/%s", appBaseURL, orgSlug))
	if err != nil {
		return nil, fmt.Errorf("parse metadata URL: %w", err)
	}

	sp := &saml.ServiceProvider{
		EntityID:          metadataURL.String(),
		AcsURL:            *acsURL,
		MetadataURL:       *metadataURL,
		AllowIDPInitiated: true,
	}

	if cfg.MetadataXML != "" {
		idpMetadata, mErr := parseIDPMetadata([]byte(cfg.MetadataXML))
		if mErr != nil {
			return nil, fmt.Errorf("parse IdP metadata XML: %w", mErr)
		}
		sp.IDPMetadata = idpMetadata
	} else if cfg.MetadataURL != "" {
		idpMetadata, mErr := fetchIDPMetadata(cfg.MetadataURL)
		if mErr != nil {
			return nil, fmt.Errorf("fetch IdP metadata from %s: %w", cfg.MetadataURL, mErr)
		}
		sp.IDPMetadata = idpMetadata
	} else if cfg.Certificate != "" && cfg.EntityID != "" {
		idpMetadata, mErr := buildIDPMetadataFromCert(cfg.EntityID, cfg.ACSURL, cfg.Certificate)
		if mErr != nil {
			return nil, fmt.Errorf("build IdP metadata from certificate: %w", mErr)
		}
		sp.IDPMetadata = idpMetadata
	} else {
		return nil, fmt.Errorf("SAML requires metadata_url, metadata_xml, or certificate + entity_id")
	}

	return &SAMLProvider{SP: sp}, nil
}

// Metadata returns the SP metadata XML for the IdP to import.
func (p *SAMLProvider) Metadata() []byte {
	buf, _ := xml.MarshalIndent(p.SP.Metadata(), "", "  ")
	return buf
}

// AuthnRequestURL generates the URL to redirect the user to the IdP for
// authentication.
func (p *SAMLProvider) AuthnRequestURL(relayState string) (string, error) {
	ssoLocation := p.SP.GetSSOBindingLocation(saml.HTTPRedirectBinding)
	if ssoLocation == "" {
		ssoLocation = p.SP.GetSSOBindingLocation(saml.HTTPPostBinding)
	}
	if ssoLocation == "" {
		return "", fmt.Errorf("no SSO binding location found in IdP metadata")
	}

	authnRequest, err := p.SP.MakeAuthenticationRequest(
		ssoLocation,
		saml.HTTPRedirectBinding,
		saml.HTTPPostBinding,
	)
	if err != nil {
		return "", fmt.Errorf("create SAML authn request: %w", err)
	}

	redirectURL, err := authnRequest.Redirect(relayState, p.SP)
	if err != nil {
		return "", fmt.Errorf("build SAML redirect: %w", err)
	}

	return redirectURL.String(), nil
}

// ParseResponse validates the SAML response from the IdP POST and extracts
// the user identity. It delegates XML signature validation to the crewjam/saml
// library.
func (p *SAMLProvider) ParseResponse(r *http.Request) (*Identity, error) {
	assertion, err := p.SP.ParseResponse(r, []string{""})
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidAssertion, err)
	}

	return extractIdentityFromAssertion(assertion)
}

func extractIdentityFromAssertion(assertion *saml.Assertion) (*Identity, error) {
	var email, firstName, lastName, name string
	var groups []string

	for _, stmt := range assertion.AttributeStatements {
		for _, attr := range stmt.Attributes {
			val := ""
			if len(attr.Values) > 0 {
				val = attr.Values[0].Value
			}

			nameLC := strings.ToLower(attr.Name)
			switch {
			case nameLC == "email" ||
				attr.Name == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" ||
				attr.Name == "urn:oid:0.9.2342.19200300.100.1.3":
				email = val
			case nameLC == "firstname" || nameLC == "givenname" ||
				attr.Name == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname" ||
				attr.Name == "urn:oid:2.5.4.42":
				firstName = val
			case nameLC == "lastname" || nameLC == "surname" ||
				attr.Name == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname" ||
				attr.Name == "urn:oid:2.5.4.4":
				lastName = val
			case nameLC == "displayname" || nameLC == "name" ||
				attr.Name == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name":
				name = val
			case nameLC == "groups" || nameLC == "group" || nameLC == "memberof" ||
				attr.Name == "http://schemas.xmlsoap.org/claims/group":
				for _, v := range attr.Values {
					groups = append(groups, v.Value)
				}
			}
		}
	}

	if email == "" && assertion.Subject != nil && assertion.Subject.NameID != nil {
		if strings.Contains(assertion.Subject.NameID.Value, "@") {
			email = assertion.Subject.NameID.Value
		}
	}

	if email == "" {
		return nil, ErrMissingEmail
	}

	if name == "" && (firstName != "" || lastName != "") {
		name = strings.TrimSpace(firstName + " " + lastName)
	}

	return &Identity{
		Email:     email,
		Name:      name,
		FirstName: firstName,
		LastName:  lastName,
		Groups:    groups,
	}, nil
}

func parseIDPMetadata(data []byte) (*saml.EntityDescriptor, error) {
	var ed saml.EntityDescriptor
	if err := xml.Unmarshal(data, &ed); err != nil {
		var entities saml.EntitiesDescriptor
		if err2 := xml.Unmarshal(data, &entities); err2 != nil {
			return nil, fmt.Errorf("invalid IdP metadata XML: %w (also tried EntitiesDescriptor: %v)", err, err2)
		}
		if len(entities.EntityDescriptors) == 0 {
			return nil, fmt.Errorf("no entity descriptors found in IdP metadata")
		}
		return &entities.EntityDescriptors[0], nil
	}
	return &ed, nil
}

func fetchIDPMetadata(metadataURL string) (*saml.EntityDescriptor, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(metadataURL)
	if err != nil {
		return nil, fmt.Errorf("fetch metadata: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("metadata endpoint returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read metadata response: %w", err)
	}

	return parseIDPMetadata(body)
}

func buildIDPMetadataFromCert(entityID, ssoURL, certPEM string) (*saml.EntityDescriptor, error) {
	block, _ := pem.Decode([]byte(certPEM))
	if block == nil {
		certPEM = "-----BEGIN CERTIFICATE-----\n" + certPEM + "\n-----END CERTIFICATE-----"
		block, _ = pem.Decode([]byte(certPEM))
		if block == nil {
			return nil, fmt.Errorf("cannot decode IdP certificate PEM")
		}
	}

	if _, err := x509.ParseCertificate(block.Bytes); err != nil {
		return nil, fmt.Errorf("parse IdP certificate: %w", err)
	}

	return &saml.EntityDescriptor{
		EntityID: entityID,
		IDPSSODescriptors: []saml.IDPSSODescriptor{
			{
				SingleSignOnServices: []saml.Endpoint{
					{
						Binding:  saml.HTTPRedirectBinding,
						Location: ssoURL,
					},
					{
						Binding:  saml.HTTPPostBinding,
						Location: ssoURL,
					},
				},
			},
		},
	}, nil
}
