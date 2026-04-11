// Command genspec generates an OpenAPI 3.0.3 spec from the chi router routes
// and the route metadata registry. It outputs the spec as JSON to stdout or
// to a file specified by -o.
//
// Usage:
//
//	genspec                                    # write to stdout
//	genspec -o docs/static/openapi/featuresignals.json  # write to file
//
// When adding a new route to router.go, add its metadata to
// internal/api/docs/route_meta.go and run "make docs" to regenerate.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"strings"

	"github.com/featuresignals/server/internal/api/docs"
)

func main() {
	outPath := flag.String("o", "", "output file path (default: stdout)")
	flag.Parse()

	spec := buildSpec()

	data, err := json.MarshalIndent(spec, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "genspec: marshal failed: %v\n", err)
		os.Exit(1)
	}

	if *outPath == "" {
		fmt.Println(string(data))
		return
	}

	if err := os.WriteFile(*outPath, data, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "genspec: write failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Fprintf(os.Stderr, "genspec: wrote %s (%d bytes, %d paths)\n", *outPath, len(data), len(spec["paths"].(map[string]interface{})))
}

func buildSpec() map[string]interface{} {
	// Collect tags, paths, and schemas from route metadata.
	tags := collectTags()
	paths := buildPaths()
	schemas := buildSchemas()

	return map[string]interface{}{
		"openapi": "3.0.3",
		"info": map[string]interface{}{
			"title":       "FeatureSignals API",
			"description": "Complete API reference for FeatureSignals — feature flag management platform.",
			"version":     "1.0.0",
			"contact":     map[string]interface{}{"name": "FeatureSignals", "url": "https://featuresignals.com"},
			"license":     map[string]interface{}{"name": "Apache-2.0", "url": "https://www.apache.org/licenses/LICENSE-2.0"},
		},
		"servers": []interface{}{
			map[string]interface{}{"url": "https://api.featuresignals.com", "description": "Production"},
		},
		"tags":     tags,
		"security": []interface{}{map[string]interface{}{"BearerAuth": []interface{}{}}},
		"paths":    paths,
		"components": map[string]interface{}{
			"securitySchemes": map[string]interface{}{
				"BearerAuth": map[string]interface{}{
					"type":         "http",
					"scheme":       "bearer",
					"bearerFormat": "JWT",
					"description":  "JWT access token obtained from /v1/auth/login or /v1/auth/register",
				},
				"ApiKeyAuth": map[string]interface{}{
					"type":        "apiKey",
					"in":          "header",
					"name":        "X-API-Key",
					"description": "Environment API key for server-side or client-side SDK access",
				},
			},
			"parameters": commonParameters(),
			"schemas":    schemas,
		},
	}
}

func collectTags() []interface{} {
	seen := map[string]bool{}
	var tags []interface{}
	for _, m := range docs.AllRouteMeta {
		if !seen[m.Tag] {
			seen[m.Tag] = true
			tags = append(tags, map[string]interface{}{
				"name":        m.Tag,
				"description": tagDescription(m.Tag),
			})
		}
	}
	sort.Slice(tags, func(i, j int) bool {
		return tags[i].(map[string]interface{})["name"].(string) < tags[j].(map[string]interface{})["name"].(string)
	})
	return tags
}

func tagDescription(tag string) string {
	descs := map[string]string{
		"Auth":            "Authentication, signup, and session management",
		"MFA":             "Multi-factor authentication (TOTP) — Pro+",
		"Billing":         "Subscription and usage billing",
		"Onboarding":      "Onboarding progress tracking",
		"Evaluation":      "Flag evaluation for SDKs and clients",
		"Projects":        "Project management",
		"Environments":    "Environment management within projects",
		"Flags":           "Feature flag CRUD operations",
		"Flag State":      "Per-environment flag state and promotion",
		"Flag Management": "Cross-environment flag operations",
		"Segments":        "User segment targeting rules",
		"API Keys":        "API key management for environments",
		"Team":            "Team member and permission management",
		"Approvals":       "Approval workflow for flag changes — Pro+",
		"Webhooks":        "Webhook configuration and delivery history — Pro+",
		"Audit":           "Tamper-evident audit log",
		"Metrics":         "Evaluation metrics and A/B analytics",
		"Insights":        "Target inspection and flag usage insights",
		"Analytics":       "Internal KPI analytics",
		"User":            "User preferences, feedback, and data privacy",
		"Sales":           "Sales inquiry",
		"Pricing":         "Public pricing configuration",
		"SSO":             "SSO configuration (SAML 2.0 / OIDC) — Enterprise",
		"SCIM":            "SCIM 2.0 user provisioning — Enterprise",
		"IP Allowlist":    "IP allowlist management — Enterprise",
		"Custom Roles":    "Custom role templates — Enterprise",
		"Data Export":     "Organization data export — Pro+",
		"Status":          "Service health and SLA status",
		"Health":          "Health check endpoint",
	}
	if d, ok := descs[tag]; ok {
		return d
	}
	return tag
}

func buildPaths() map[string]interface{} {
	paths := map[string]interface{}{}

	for _, m := range docs.AllRouteMeta {
		pathObj, ok := paths[m.Path].(map[string]interface{})
		if !ok {
			pathObj = map[string]interface{}{}
			paths[m.Path] = pathObj
		}

		method := strings.ToLower(m.Method)
		op := buildOperation(m)
		pathObj[method] = op
	}

	return paths
}

func buildOperation(m docs.RouteMeta) map[string]interface{} {
	op := map[string]interface{}{
		"tags":        []interface{}{m.Tag},
		"summary":     m.Summary,
		"description": m.Description,
	}

	// Security
	if len(m.Security) > 0 {
		sec := map[string]interface{}{}
		for _, s := range m.Security {
			switch s {
			case "bearer":
				sec["BearerAuth"] = []interface{}{}
			case "apikey":
				sec["ApiKeyAuth"] = []interface{}{}
			}
		}
		op["security"] = []interface{}{sec}
	} else {
		op["security"] = []interface{}{}
	}

	// Path parameters
	params := buildPathParams(m.Path)
	if len(params) > 0 {
		op["parameters"] = params
	}

	// Request body
	if m.ReqType != "" {
		op["requestBody"] = map[string]interface{}{
			"required": true,
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{
					"schema": map[string]interface{}{
						"$ref": "#/components/schemas/" + m.ReqType,
					},
				},
			},
		}
	}

	// Responses
	responses := map[string]interface{}{}
	successStatus := fmt.Sprintf("%d", m.Status)
	if m.RespType != "" {
		responses[successStatus] = map[string]interface{}{
			"description": m.Summary + " — success",
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{
					"schema": map[string]interface{}{
						"$ref": "#/components/schemas/" + m.RespType,
					},
				},
			},
		}
	} else {
		responses[successStatus] = map[string]interface{}{
			"description": "Success",
		}
	}

	// Standard error responses
	addStandardErrors(responses)

	op["responses"] = responses
	return op
}

func buildPathParams(path string) []interface{} {
	var params []interface{}
	segments := strings.Split(path, "/")
	for _, seg := range segments {
		if strings.HasPrefix(seg, "{") && strings.HasSuffix(seg, "}") {
			name := seg[1 : len(seg)-1]
			param := map[string]interface{}{
				"name":     name,
				"in":       "path",
				"required": true,
			}

			// Use $ref for known path params
			refMap := map[string]string{
				"projectID":  "ProjectID",
				"envID":      "EnvID",
				"envKey":     "EnvKey",
				"flagKey":    "FlagKey",
				"segmentKey": "SegmentKey",
				"memberID":   "MemberID",
				"approvalID": "ApprovalID",
				"webhookID":  "WebhookID",
				"roleID":     "RoleID",
				"userID":     "UserID",
				"orgSlug":    "OrgSlug",
				"keyID":      "KeyID",
			}

			if refName, ok := refMap[name]; ok {
				param["$ref"] = "#/components/parameters/" + refName
				param = map[string]interface{}{
					"$ref": "#/components/parameters/" + refName,
				}
			} else {
				param["schema"] = map[string]interface{}{"type": "string"}
			}

			params = append(params, param)
		}
	}
	return params
}

func addStandardErrors(responses map[string]interface{}) {
	if _, ok := responses["400"]; !ok {
		responses["400"] = map[string]interface{}{
			"description": "Bad request",
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{
					"schema": map[string]interface{}{"$ref": "#/components/schemas/ErrorResponse"},
				},
			},
		}
	}
	if _, ok := responses["401"]; !ok {
		responses["401"] = map[string]interface{}{
			"description": "Unauthorized",
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{
					"schema": map[string]interface{}{"$ref": "#/components/schemas/ErrorResponse"},
				},
			},
		}
	}
	if _, ok := responses["403"]; !ok {
		responses["403"] = map[string]interface{}{
			"description": "Forbidden",
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{
					"schema": map[string]interface{}{"$ref": "#/components/schemas/ErrorResponse"},
				},
			},
		}
	}
	if _, ok := responses["404"]; !ok {
		responses["404"] = map[string]interface{}{
			"description": "Not found",
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{
					"schema": map[string]interface{}{"$ref": "#/components/schemas/ErrorResponse"},
				},
			},
		}
	}
}

func commonParameters() map[string]interface{} {
	return map[string]interface{}{
		"ProjectID": map[string]interface{}{
			"name": "projectID", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string", "format": "uuid"},
			"description": "Project ID",
		},
		"EnvID": map[string]interface{}{
			"name": "envID", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string", "format": "uuid"},
			"description": "Environment ID",
		},
		"EnvKey": map[string]interface{}{
			"name": "envKey", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string"},
			"description": "Environment public key",
		},
		"FlagKey": map[string]interface{}{
			"name": "flagKey", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string"},
			"description": "Feature flag key",
		},
		"SegmentKey": map[string]interface{}{
			"name": "segmentKey", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string"},
			"description": "Segment key",
		},
		"MemberID": map[string]interface{}{
			"name": "memberID", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string", "format": "uuid"},
			"description": "Team member ID",
		},
		"ApprovalID": map[string]interface{}{
			"name": "approvalID", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string", "format": "uuid"},
			"description": "Approval request ID",
		},
		"WebhookID": map[string]interface{}{
			"name": "webhookID", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string", "format": "uuid"},
			"description": "Webhook ID",
		},
		"RoleID": map[string]interface{}{
			"name": "roleID", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string", "format": "uuid"},
			"description": "Custom role ID",
		},
		"UserID": map[string]interface{}{
			"name": "userID", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string", "format": "uuid"},
			"description": "User ID",
		},
		"OrgSlug": map[string]interface{}{
			"name": "orgSlug", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string"},
			"description": "Organization slug",
		},
		"KeyID": map[string]interface{}{
			"name": "keyID", "in": "path", "required": true,
			"schema":      map[string]interface{}{"type": "string", "format": "uuid"},
			"description": "API key ID",
		},
	}
}

func buildSchemas() map[string]interface{} {
	return map[string]interface{}{
		// ── Common ─────────────────────────────────────────────────
		"ErrorResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"error":      map[string]interface{}{"type": "string"},
				"code":       map[string]interface{}{"type": "string"},
				"details":    map[string]interface{}{"type": "string"},
				"request_id": map[string]interface{}{"type": "string"},
			},
			"required": []interface{}{"error"},
		},
		"PaginatedResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"data":     map[string]interface{}{"type": "array", "items": map[string]interface{}{}},
				"total":    map[string]interface{}{"type": "integer"},
				"limit":    map[string]interface{}{"type": "integer"},
				"offset":   map[string]interface{}{"type": "integer"},
				"has_more": map[string]interface{}{"type": "boolean"},
			},
		},
		"MessageResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"message": map[string]interface{}{"type": "string"},
			},
		},

		// ── Auth ───────────────────────────────────────────────────
		"LoginRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"email", "password"},
			"properties": map[string]interface{}{
				"email":    map[string]interface{}{"type": "string", "format": "email"},
				"password": map[string]interface{}{"type": "string"},
				"mfa_code": map[string]interface{}{"type": "string", "description": "TOTP code if MFA is enabled"},
			},
		},
		"LoginResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"user":                 map[string]interface{}{"$ref": "#/components/schemas/SafeUserResponse"},
				"organization":         map[string]interface{}{"$ref": "#/components/schemas/OrganizationResponse"},
				"tokens":               map[string]interface{}{"$ref": "#/components/schemas/AuthTokensResponse"},
				"onboarding_completed": map[string]interface{}{"type": "boolean"},
			},
		},
		"InitiateSignupRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"email", "password", "name"},
			"properties": map[string]interface{}{
				"email":    map[string]interface{}{"type": "string", "format": "email"},
				"password": map[string]interface{}{"type": "string", "minLength": 8},
				"name":     map[string]interface{}{"type": "string"},
				"org_name": map[string]interface{}{"type": "string"},
			},
		},
		"CompleteSignupRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"email", "otp"},
			"properties": map[string]interface{}{
				"email": map[string]interface{}{"type": "string", "format": "email"},
				"otp":   map[string]interface{}{"type": "string"},
			},
		},
		"ResendOTPRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"email"},
			"properties": map[string]interface{}{
				"email": map[string]interface{}{"type": "string", "format": "email"},
			},
		},
		"RefreshRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"refresh_token"},
			"properties": map[string]interface{}{
				"refresh_token": map[string]interface{}{"type": "string"},
			},
		},
		"RefreshResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"access_token":         map[string]interface{}{"type": "string"},
				"refresh_token":        map[string]interface{}{"type": "string"},
				"expires_at":           map[string]interface{}{"type": "integer"},
				"user":                 map[string]interface{}{"$ref": "#/components/schemas/SafeUserResponse"},
				"organization":         map[string]interface{}{"$ref": "#/components/schemas/OrganizationResponse"},
				"onboarding_completed": map[string]interface{}{"type": "boolean"},
			},
		},
		"TokenExchangeRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"token"},
			"properties": map[string]interface{}{
				"token": map[string]interface{}{"type": "string"},
			},
		},
		"TokenExchangeResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"tokens": map[string]interface{}{"$ref": "#/components/schemas/AuthTokensResponse"},
				"user":   map[string]interface{}{"$ref": "#/components/schemas/SafeUserResponse"},
			},
		},
		"SignupInitResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"message":    map[string]interface{}{"type": "string"},
				"expires_in": map[string]interface{}{"type": "integer"},
			},
		},
		"SafeUserResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":             map[string]interface{}{"type": "string", "format": "uuid"},
				"email":          map[string]interface{}{"type": "string", "format": "email"},
				"name":           map[string]interface{}{"type": "string"},
				"email_verified": map[string]interface{}{"type": "boolean"},
				"created_at":     map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"AuthTokensResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"access_token":  map[string]interface{}{"type": "string"},
				"refresh_token": map[string]interface{}{"type": "string"},
				"expires_at":    map[string]interface{}{"type": "integer"},
			},
		},

		// ── MFA ────────────────────────────────────────────────────
		"MFAEnableResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"secret": map[string]interface{}{"type": "string"},
				"qr_uri": map[string]interface{}{"type": "string"},
			},
		},
		"MFAVerifyRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"code"},
			"properties": map[string]interface{}{
				"code": map[string]interface{}{"type": "string"},
			},
		},
		"MFADisableRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"password"},
			"properties": map[string]interface{}{
				"password": map[string]interface{}{"type": "string"},
			},
		},
		"MFAStatusResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"enabled":     map[string]interface{}{"type": "boolean"},
				"verified_at": map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},

		// ── Organization & Projects ────────────────────────────────
		"OrganizationResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":               map[string]interface{}{"type": "string", "format": "uuid"},
				"name":             map[string]interface{}{"type": "string"},
				"slug":             map[string]interface{}{"type": "string"},
				"plan":             map[string]interface{}{"type": "string"},
				"data_region":      map[string]interface{}{"type": "string"},
				"trial_expires_at": map[string]interface{}{"type": "string", "format": "date-time"},
				"created_at":       map[string]interface{}{"type": "string", "format": "date-time"},
				"updated_at":       map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"ProjectResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":         map[string]interface{}{"type": "string", "format": "uuid"},
				"name":       map[string]interface{}{"type": "string"},
				"slug":       map[string]interface{}{"type": "string"},
				"created_at": map[string]interface{}{"type": "string", "format": "date-time"},
				"updated_at": map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"CreateProjectRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"name"},
			"properties": map[string]interface{}{
				"name": map[string]interface{}{"type": "string"},
				"slug": map[string]interface{}{"type": "string"},
			},
		},

		// ── Environments ───────────────────────────────────────────
		"EnvironmentResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":         map[string]interface{}{"type": "string", "format": "uuid"},
				"name":       map[string]interface{}{"type": "string"},
				"slug":       map[string]interface{}{"type": "string"},
				"color":      map[string]interface{}{"type": "string"},
				"created_at": map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"CreateEnvironmentRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"name"},
			"properties": map[string]interface{}{
				"name":  map[string]interface{}{"type": "string"},
				"slug":  map[string]interface{}{"type": "string"},
				"color": map[string]interface{}{"type": "string"},
			},
		},

		// ── Flags ──────────────────────────────────────────────────
		"FlagResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":                     map[string]interface{}{"type": "string", "format": "uuid"},
				"key":                    map[string]interface{}{"type": "string"},
				"name":                   map[string]interface{}{"type": "string"},
				"description":            map[string]interface{}{"type": "string"},
				"flag_type":              map[string]interface{}{"type": "string", "enum": []interface{}{"boolean", "string", "number", "json"}},
				"category":               map[string]interface{}{"type": "string", "enum": []interface{}{"release", "experiment", "ops", "permission"}},
				"status":                 map[string]interface{}{"type": "string", "enum": []interface{}{"active", "rolled_out", "deprecated", "archived"}},
				"default_value":          map[string]interface{}{},
				"tags":                   map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"prerequisites":          map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"mutual_exclusion_group": map[string]interface{}{"type": "string"},
				"created_at":             map[string]interface{}{"type": "string", "format": "date-time"},
				"updated_at":             map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"CreateFlagRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"key", "name"},
			"properties": map[string]interface{}{
				"key":                    map[string]interface{}{"type": "string", "pattern": "^[a-z0-9][a-z0-9_-]{0,127}$"},
				"name":                   map[string]interface{}{"type": "string"},
				"description":            map[string]interface{}{"type": "string"},
				"flag_type":              map[string]interface{}{"type": "string", "enum": []interface{}{"boolean", "string", "number", "json"}, "default": "boolean"},
				"category":               map[string]interface{}{"type": "string", "enum": []interface{}{"release", "experiment", "ops", "permission"}, "default": "release"},
				"status":                 map[string]interface{}{"type": "string", "enum": []interface{}{"active", "rolled_out", "deprecated", "archived"}, "default": "active"},
				"default_value":          map[string]interface{}{},
				"tags":                   map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"prerequisites":          map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"mutual_exclusion_group": map[string]interface{}{"type": "string"},
			},
		},
		"UpdateFlagStateRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"enabled":              map[string]interface{}{"type": "boolean"},
				"default_value":        map[string]interface{}{},
				"rules":                map[string]interface{}{"type": "array", "items": map[string]interface{}{"$ref": "#/components/schemas/TargetingRule"}},
				"percentage_rollout":   map[string]interface{}{"type": "integer", "minimum": 0, "maximum": 10000},
				"variants":             map[string]interface{}{"type": "array", "items": map[string]interface{}{"$ref": "#/components/schemas/Variant"}},
				"scheduled_enable_at":  map[string]interface{}{"type": "string", "format": "date-time"},
				"scheduled_disable_at": map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"FlagStateResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":                   map[string]interface{}{"type": "string", "format": "uuid"},
				"enabled":              map[string]interface{}{"type": "boolean"},
				"default_value":        map[string]interface{}{},
				"rules":                map[string]interface{}{"type": "array", "items": map[string]interface{}{"$ref": "#/components/schemas/TargetingRule"}},
				"percentage_rollout":   map[string]interface{}{"type": "integer", "minimum": 0, "maximum": 10000},
				"variants":             map[string]interface{}{"type": "array", "items": map[string]interface{}{"$ref": "#/components/schemas/Variant"}},
				"scheduled_enable_at":  map[string]interface{}{"type": "string", "format": "date-time"},
				"scheduled_disable_at": map[string]interface{}{"type": "string", "format": "date-time"},
				"updated_at":           map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"PromoteRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"source_env_id", "target_env_id"},
			"properties": map[string]interface{}{
				"source_env_id": map[string]interface{}{"type": "string", "format": "uuid"},
				"target_env_id": map[string]interface{}{"type": "string", "format": "uuid"},
			},
		},
		"KillFlagRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"env_id"},
			"properties": map[string]interface{}{
				"env_id": map[string]interface{}{"type": "string", "format": "uuid"},
			},
		},
		"SyncEnvironmentsRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"source_env_id", "target_env_id", "flag_keys"},
			"properties": map[string]interface{}{
				"source_env_id": map[string]interface{}{"type": "string"},
				"target_env_id": map[string]interface{}{"type": "string"},
				"flag_keys":     map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			},
		},
		"EnvComparisonResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"total":      map[string]interface{}{"type": "integer"},
				"diff_count": map[string]interface{}{"type": "integer"},
				"diffs": map[string]interface{}{"type": "array", "items": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"flag_key":       map[string]interface{}{"type": "string"},
						"source_enabled": map[string]interface{}{"type": "boolean"},
						"target_enabled": map[string]interface{}{"type": "boolean"},
						"source_rollout": map[string]interface{}{"type": "integer"},
						"target_rollout": map[string]interface{}{"type": "integer"},
						"source_rules":   map[string]interface{}{"type": "integer"},
						"target_rules":   map[string]interface{}{"type": "integer"},
						"differences":    map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
					},
				}},
			},
		},

		// ── Targeting Rules & Variants ─────────────────────────────
		"TargetingRule": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":         map[string]interface{}{"type": "string"},
				"segment_id": map[string]interface{}{"type": "string"},
				"value":      map[string]interface{}{},
				"percentage": map[string]interface{}{"type": "number"},
			},
		},
		"Variant": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"key":    map[string]interface{}{"type": "string"},
				"value":  map[string]interface{}{},
				"weight": map[string]interface{}{"type": "integer", "minimum": 0, "maximum": 10000},
			},
		},

		// ── Segments ───────────────────────────────────────────────
		"SegmentResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":          map[string]interface{}{"type": "string", "format": "uuid"},
				"key":         map[string]interface{}{"type": "string"},
				"name":        map[string]interface{}{"type": "string"},
				"description": map[string]interface{}{"type": "string"},
				"match_type":  map[string]interface{}{"type": "string", "enum": []interface{}{"all", "any"}},
				"rules":       map[string]interface{}{"type": "array", "items": map[string]interface{}{"$ref": "#/components/schemas/Condition"}},
				"created_at":  map[string]interface{}{"type": "string", "format": "date-time"},
				"updated_at":  map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"CreateSegmentRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"key", "name"},
			"properties": map[string]interface{}{
				"key":         map[string]interface{}{"type": "string"},
				"name":        map[string]interface{}{"type": "string"},
				"description": map[string]interface{}{"type": "string"},
				"match_type":  map[string]interface{}{"type": "string", "enum": []interface{}{"all", "any"}},
				"rules":       map[string]interface{}{"type": "array", "items": map[string]interface{}{"$ref": "#/components/schemas/Condition"}},
			},
		},
		"UpdateSegmentRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"name":        map[string]interface{}{"type": "string"},
				"description": map[string]interface{}{"type": "string"},
				"match_type":  map[string]interface{}{"type": "string", "enum": []interface{}{"all", "any"}},
				"rules":       map[string]interface{}{"type": "array", "items": map[string]interface{}{"$ref": "#/components/schemas/Condition"}},
			},
		},
		"Condition": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"attribute": map[string]interface{}{"type": "string"},
				"operator":  map[string]interface{}{"type": "string", "enum": []interface{}{"eq", "neq", "in", "not_in", "contains", "starts_with", "ends_with", "gt", "gte", "lt", "lte", "regex"}},
				"values":    map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			},
		},

		// ── API Keys ───────────────────────────────────────────────
		"CreateAPIKeyRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"name"},
			"properties": map[string]interface{}{
				"name":            map[string]interface{}{"type": "string"},
				"type":            map[string]interface{}{"type": "string", "enum": []interface{}{"server", "client"}},
				"expires_in_days": map[string]interface{}{"type": "integer"},
			},
		},
		"RotateAPIKeyRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"name":          map[string]interface{}{"type": "string"},
				"grace_minutes": map[string]interface{}{"type": "integer"},
			},
		},

		// ── Evaluation ─────────────────────────────────────────────
		"EvaluateRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"flag_key", "context"},
			"properties": map[string]interface{}{
				"flag_key": map[string]interface{}{"type": "string"},
				"context":  map[string]interface{}{"$ref": "#/components/schemas/EvalContext"},
			},
		},
		"BulkEvaluateRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"context"},
			"properties": map[string]interface{}{
				"flag_keys": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}, "maxItems": 100},
				"context":   map[string]interface{}{"$ref": "#/components/schemas/EvalContext"},
			},
		},
		"EvalContext": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"key":        map[string]interface{}{"type": "string", "description": "Target identifier"},
				"attributes": map[string]interface{}{"type": "object", "additionalProperties": true},
			},
			"required": []interface{}{"key"},
		},
		"EvalResult": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"flag_key":    map[string]interface{}{"type": "string"},
				"value":       map[string]interface{}{},
				"reason":      map[string]interface{}{"type": "string"},
				"rule_index":  map[string]interface{}{"type": "integer"},
				"duration_ms": map[string]interface{}{"type": "number"},
			},
		},
		"TrackImpressionRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"flag_key":    map[string]interface{}{"type": "string"},
				"variant_key": map[string]interface{}{"type": "string"},
				"user_key":    map[string]interface{}{"type": "string"},
			},
		},

		// ── Team ───────────────────────────────────────────────────
		"MemberResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":     map[string]interface{}{"type": "string", "format": "uuid"},
				"org_id": map[string]interface{}{"type": "string", "format": "uuid"},
				"email":  map[string]interface{}{"type": "string", "format": "email"},
				"name":   map[string]interface{}{"type": "string"},
				"role":   map[string]interface{}{"type": "string", "enum": []interface{}{"owner", "admin", "developer", "viewer"}},
			},
		},
		"InviteRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"email"},
			"properties": map[string]interface{}{
				"email": map[string]interface{}{"type": "string", "format": "email"},
				"role":  map[string]interface{}{"type": "string", "enum": []interface{}{"owner", "admin", "developer", "viewer"}},
			},
		},
		"UpdateRoleRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"role"},
			"properties": map[string]interface{}{
				"role": map[string]interface{}{"type": "string", "enum": []interface{}{"owner", "admin", "developer", "viewer"}},
			},
		},
		"UpdatePermissionsRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"permissions": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"environment_id": map[string]interface{}{"type": "string"},
							"can_toggle":     map[string]interface{}{"type": "boolean"},
							"can_edit_rules": map[string]interface{}{"type": "boolean"},
						},
					},
				},
			},
		},

		// ── Approvals ──────────────────────────────────────────────
		"ApprovalResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":          map[string]interface{}{"type": "string", "format": "uuid"},
				"org_id":      map[string]interface{}{"type": "string", "format": "uuid"},
				"flag_id":     map[string]interface{}{"type": "string"},
				"env_id":      map[string]interface{}{"type": "string"},
				"change_type": map[string]interface{}{"type": "string"},
				"payload":     map[string]interface{}{},
				"status":      map[string]interface{}{"type": "string", "enum": []interface{}{"pending", "approved", "rejected", "applied"}},
				"reviewer_id": map[string]interface{}{"type": "string"},
				"review_note": map[string]interface{}{"type": "string"},
				"reviewed_at": map[string]interface{}{"type": "string", "format": "date-time"},
				"created_at":  map[string]interface{}{"type": "string", "format": "date-time"},
				"updated_at":  map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"CreateApprovalRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"flag_id", "env_id", "change_type"},
			"properties": map[string]interface{}{
				"flag_id":     map[string]interface{}{"type": "string"},
				"env_id":      map[string]interface{}{"type": "string"},
				"change_type": map[string]interface{}{"type": "string"},
				"payload":     map[string]interface{}{},
			},
		},
		"ReviewRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"action"},
			"properties": map[string]interface{}{
				"action": map[string]interface{}{"type": "string", "enum": []interface{}{"approve", "reject"}},
				"note":   map[string]interface{}{"type": "string"},
			},
		},

		// ── Webhooks ───────────────────────────────────────────────
		"WebhookResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":         map[string]interface{}{"type": "string", "format": "uuid"},
				"org_id":     map[string]interface{}{"type": "string", "format": "uuid"},
				"name":       map[string]interface{}{"type": "string"},
				"url":        map[string]interface{}{"type": "string", "format": "uri"},
				"events":     map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"enabled":    map[string]interface{}{"type": "boolean"},
				"has_secret": map[string]interface{}{"type": "boolean"},
				"created_at": map[string]interface{}{"type": "string", "format": "date-time"},
				"updated_at": map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"CreateWebhookRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"name", "url"},
			"properties": map[string]interface{}{
				"name":   map[string]interface{}{"type": "string"},
				"url":    map[string]interface{}{"type": "string", "format": "uri"},
				"secret": map[string]interface{}{"type": "string"},
				"events": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			},
		},
		"UpdateWebhookRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"name":    map[string]interface{}{"type": "string"},
				"url":     map[string]interface{}{"type": "string", "format": "uri"},
				"secret":  map[string]interface{}{"type": "string"},
				"events":  map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
				"enabled": map[string]interface{}{"type": "boolean"},
			},
		},

		// ── Billing & Onboarding ───────────────────────────────────
		"CheckoutResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"gateway":      map[string]interface{}{"type": "string"},
				"redirect_url": map[string]interface{}{"type": "string", "format": "uri"},
			},
		},
		"SubscriptionResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"plan":                 map[string]interface{}{"type": "string"},
				"status":               map[string]interface{}{"type": "string"},
				"seats_used":           map[string]interface{}{"type": "integer"},
				"seats_limit":          map[string]interface{}{"type": "integer"},
				"projects_used":        map[string]interface{}{"type": "integer"},
				"projects_limit":       map[string]interface{}{"type": "integer"},
				"environments_used":    map[string]interface{}{"type": "integer"},
				"environments_limit":   map[string]interface{}{"type": "integer"},
				"current_period_start": map[string]interface{}{"type": "string", "format": "date-time"},
				"current_period_end":   map[string]interface{}{"type": "string", "format": "date-time"},
				"cancel_at_period_end": map[string]interface{}{"type": "boolean"},
			},
		},
		"UsageResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"seats_used":         map[string]interface{}{"type": "integer"},
				"seats_limit":        map[string]interface{}{"type": "integer"},
				"projects_used":      map[string]interface{}{"type": "integer"},
				"projects_limit":     map[string]interface{}{"type": "integer"},
				"environments_used":  map[string]interface{}{"type": "integer"},
				"environments_limit": map[string]interface{}{"type": "integer"},
				"plan":               map[string]interface{}{"type": "string"},
			},
		},
		"CancelRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"at_period_end": map[string]interface{}{"type": "boolean"},
			},
		},
		"CancelResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"status": map[string]interface{}{"type": "string"},
			},
		},
		"PortalResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"url": map[string]interface{}{"type": "string", "format": "uri"},
			},
		},
		"GatewayRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"gateway"},
			"properties": map[string]interface{}{
				"gateway": map[string]interface{}{"type": "string", "enum": []interface{}{"payu", "stripe"}},
			},
		},
		"GatewayResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"gateway": map[string]interface{}{"type": "string"},
			},
		},
		"OnboardingState": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"completed":           map[string]interface{}{"type": "boolean"},
				"plan_selected":       map[string]interface{}{"type": "boolean"},
				"first_flag_created":  map[string]interface{}{"type": "boolean"},
				"first_sdk_connected": map[string]interface{}{"type": "boolean"},
				"first_evaluation":    map[string]interface{}{"type": "boolean"},
				"completed_at":        map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},
		"UpdateOnboardingRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"plan_selected":       map[string]interface{}{"type": "boolean"},
				"first_flag_created":  map[string]interface{}{"type": "boolean"},
				"first_sdk_connected": map[string]interface{}{"type": "boolean"},
				"first_evaluation":    map[string]interface{}{"type": "boolean"},
			},
		},
		"FeaturesResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"features": map[string]interface{}{
					"type": "object",
					"additionalProperties": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"enabled":     map[string]interface{}{"type": "boolean"},
							"description": map[string]interface{}{"type": "string"},
						},
					},
				},
			},
		},

		// ── Insights ───────────────────────────────────────────────
		"InspectEntityRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"key"},
			"properties": map[string]interface{}{
				"key":        map[string]interface{}{"type": "string"},
				"attributes": map[string]interface{}{"type": "object", "additionalProperties": true},
			},
		},
		"CompareEntitiesRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"entity_a", "entity_b"},
			"properties": map[string]interface{}{
				"entity_a": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"key":        map[string]interface{}{"type": "string"},
						"attributes": map[string]interface{}{"type": "object", "additionalProperties": true},
					},
				},
				"entity_b": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"key":        map[string]interface{}{"type": "string"},
						"attributes": map[string]interface{}{"type": "object", "additionalProperties": true},
					},
				},
			},
		},

		// ── User ───────────────────────────────────────────────────
		"DismissHintRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"hint_id"},
			"properties": map[string]interface{}{
				"hint_id": map[string]interface{}{"type": "string"},
			},
		},
		"FeedbackRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"message": map[string]interface{}{"type": "string"},
				"type":    map[string]interface{}{"type": "string"},
				"rating":  map[string]interface{}{"type": "integer", "minimum": 1, "maximum": 5},
			},
		},

		// ── Sales ──────────────────────────────────────────────────
		"SalesInquiryRequest": map[string]interface{}{
			"type":     "object",
			"required": []interface{}{"contact_name", "email", "company"},
			"properties": map[string]interface{}{
				"contact_name": map[string]interface{}{"type": "string"},
				"email":        map[string]interface{}{"type": "string", "format": "email"},
				"company":      map[string]interface{}{"type": "string"},
				"team_size":    map[string]interface{}{"type": "string"},
				"message":      map[string]interface{}{"type": "string"},
			},
		},

		// ── SSO ────────────────────────────────────────────────────
		"UpsertSSOConfigRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"provider_type": map[string]interface{}{"type": "string", "enum": []interface{}{"saml", "oidc"}},
				"metadata_url":  map[string]interface{}{"type": "string", "format": "uri"},
				"metadata_xml":  map[string]interface{}{"type": "string"},
				"entity_id":     map[string]interface{}{"type": "string"},
				"acs_url":       map[string]interface{}{"type": "string", "format": "uri"},
				"certificate":   map[string]interface{}{"type": "string"},
				"client_id":     map[string]interface{}{"type": "string"},
				"client_secret": map[string]interface{}{"type": "string"},
				"issuer_url":    map[string]interface{}{"type": "string"},
				"enabled":       map[string]interface{}{"type": "boolean"},
				"enforce":       map[string]interface{}{"type": "boolean"},
				"default_role":  map[string]interface{}{"type": "string"},
			},
		},
		"SSOConfigResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"id":            map[string]interface{}{"type": "string"},
				"org_id":        map[string]interface{}{"type": "string"},
				"provider_type": map[string]interface{}{"type": "string"},
				"metadata_url":  map[string]interface{}{"type": "string"},
				"has_metadata":  map[string]interface{}{"type": "boolean"},
				"entity_id":     map[string]interface{}{"type": "string"},
				"acs_url":       map[string]interface{}{"type": "string"},
				"has_cert":      map[string]interface{}{"type": "boolean"},
				"client_id":     map[string]interface{}{"type": "string"},
				"has_secret":    map[string]interface{}{"type": "boolean"},
				"issuer_url":    map[string]interface{}{"type": "string"},
				"enabled":       map[string]interface{}{"type": "boolean"},
				"enforce":       map[string]interface{}{"type": "boolean"},
				"default_role":  map[string]interface{}{"type": "string"},
				"created_at":    map[string]interface{}{"type": "string", "format": "date-time"},
				"updated_at":    map[string]interface{}{"type": "string", "format": "date-time"},
			},
		},

		// ── IP Allowlist ──────────────────────────────────────────
		"IPAllowlistResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"enabled":     map[string]interface{}{"type": "boolean"},
				"cidr_ranges": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			},
		},
		"IPAllowlistRequest": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"enabled":     map[string]interface{}{"type": "boolean"},
				"cidr_ranges": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}},
			},
		},

		// ── Metrics ────────────────────────────────────────────────
		"EvalSummary": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"total_evals":    map[string]interface{}{"type": "integer"},
				"avg_latency_ms": map[string]interface{}{"type": "number"},
				"reasons": map[string]interface{}{
					"type":                 "object",
					"additionalProperties": map[string]interface{}{"type": "integer"},
				},
			},
		},
		"MetricsResetResponse": map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"status": map[string]interface{}{"type": "string"},
			},
		},
	}
}
