// Package docs provides route metadata for OpenAPI spec generation.
// Each entry maps a chi router route to its OpenAPI documentation attributes.
// When routes are added, updated, or removed in router.go, this registry
// must be updated to keep the spec in sync.
//
// Run "make docs" to regenerate the OpenAPI spec from this registry.
package docs

// RouteMeta holds the OpenAPI documentation for a single route.
type RouteMeta struct {
	Method      string   // HTTP method (GET, POST, PUT, DELETE, PATCH)
	Path        string   // chi route pattern (e.g. "/v1/projects/{projectID}")
	Tag         string   // OpenAPI tag group
	Summary     string   // One-line summary
	Description string   // Multi-line description
	Security    []string // "bearer" or "apikey" (empty = no auth)
	ReqType     string   // Request body Go struct type name (empty = no body)
	RespType    string   // Response body Go struct type name (empty = special handling)
	Status      int      // Success status code (200, 201, 204)
}

// AllRouteMeta is the canonical list of all API routes for OpenAPI generation.
// Keep this in sync with router.go.
var AllRouteMeta = []RouteMeta{
	// ── Public endpoints (no auth) ──────────────────────────────────────
	{Method: "GET", Path: "/health", Tag: "Health", Summary: "Health check", Description: "Returns service health status.", Status: 200},
	{Method: "GET", Path: "/v1/status", Tag: "Status", Summary: "Get service status", Description: "Returns the current local status of the FeatureSignals service.", Status: 200},
	{Method: "GET", Path: "/v1/status/global", Tag: "Status", Summary: "Get global status", Description: "Returns the global status across all regions.", Status: 200},
	{Method: "GET", Path: "/v1/status/history", Tag: "Status", Summary: "Get status history", Description: "Returns historical status records.", Status: 200},
	{Method: "GET", Path: "/v1/status/sla", Tag: "Status", Summary: "Get SLA info", Description: "Returns current SLA compliance metrics.", Status: 200},
	{Method: "GET", Path: "/v1/pricing", Tag: "Pricing", Summary: "Get pricing", Description: "Returns canonical pricing for all plans. Public endpoint.", Status: 200},
	{Method: "GET", Path: "/v1/pricing/regions", Tag: "Pricing", Summary: "Get region pricing", Description: "Returns region-adjust pricing configuration.", Status: 200},
	{Method: "GET", Path: "/v1/regions", Tag: "Pricing", Summary: "List data regions", Description: "Returns all available data regions for account creation.", Status: 200},
	{Method: "GET", Path: "/v1/capabilities", Tag: "Pricing", Summary: "Get server capabilities", Description: "Returns deployment mode, billing status, and regions enablement.", Status: 200},

	// ── Auth ────────────────────────────────────────────────────────────
	{Method: "POST", Path: "/v1/auth/login", Tag: "Auth", Summary: "Log in", Description: "Authenticates a user and returns JWT tokens. Supports MFA verification.", Security: []string{}, ReqType: "LoginRequest", RespType: "LoginResponse", Status: 200},
	{Method: "POST", Path: "/v1/auth/initiate-signup", Tag: "Auth", Summary: "Initiate signup", Description: "Starts the signup flow by sending an OTP to the provided email.", Security: []string{}, ReqType: "InitiateSignupRequest", RespType: "SignupInitResponse", Status: 200},
	{Method: "POST", Path: "/v1/auth/complete-signup", Tag: "Auth", Summary: "Complete signup", Description: "Verifies the OTP code and completes registration, returning JWT tokens.", Security: []string{}, ReqType: "CompleteSignupRequest", RespType: "LoginResponse", Status: 200},
	{Method: "POST", Path: "/v1/auth/resend-signup-otp", Tag: "Auth", Summary: "Resend signup OTP", Description: "Resends the OTP for a pending signup.", Security: []string{}, ReqType: "ResendOTPRequest", RespType: "MessageResponse", Status: 200},
	{Method: "POST", Path: "/v1/auth/refresh", Tag: "Auth", Summary: "Refresh token", Description: "Exchanges a valid refresh token for a new access token pair.", Security: []string{}, ReqType: "RefreshRequest", RespType: "RefreshResponse", Status: 200},
	{Method: "GET", Path: "/v1/auth/verify-email", Tag: "Auth", Summary: "Verify email", Description: "Verifies the user's email using a token from the verification link. Redirects to dashboard on success.", Security: []string{}, Status: 302},
	{Method: "POST", Path: "/v1/auth/send-verification-email", Tag: "Auth", Summary: "Send verification email", Description: "Sends a verification link to the user's email address.", Security: []string{"bearer"}, RespType: "MessageResponse", Status: 200},
	{Method: "POST", Path: "/v1/auth/logout", Tag: "Auth", Summary: "Log out", Description: "Revokes the current refresh token and ends the session.", Security: []string{"bearer"}, RespType: "MessageResponse", Status: 200},
	{Method: "POST", Path: "/v1/auth/token-exchange", Tag: "Auth", Summary: "Exchange one-time token", Description: "Exchanges a single-use one-time token for a full JWT pair. Used for cross-domain authentication after payment redirects.", Security: []string{}, ReqType: "TokenExchangeRequest", RespType: "TokenExchangeResponse", Status: 200},

	// ── MFA ─────────────────────────────────────────────────────────────
	{Method: "POST", Path: "/v1/auth/mfa/enable", Tag: "MFA", Summary: "Enable MFA", Description: "Generates a new TOTP secret and returns it with a QR code URI. MFA is not active until verified.", Security: []string{"bearer"}, RespType: "MFAEnableResponse", Status: 200},
	{Method: "POST", Path: "/v1/auth/mfa/verify", Tag: "MFA", Summary: "Verify MFA code", Description: "Validates a TOTP code and activates MFA for the user.", Security: []string{"bearer"}, ReqType: "MFAVerifyRequest", RespType: "MessageResponse", Status: 200},
	{Method: "POST", Path: "/v1/auth/mfa/disable", Tag: "MFA", Summary: "Disable MFA", Description: "Removes MFA for the user after verifying their password.", Security: []string{"bearer"}, ReqType: "MFADisableRequest", RespType: "MessageResponse", Status: 200},
	{Method: "GET", Path: "/v1/auth/mfa/status", Tag: "MFA", Summary: "Get MFA status", Description: "Returns the current MFA status for the authenticated user.", Security: []string{"bearer"}, RespType: "MFAStatusResponse", Status: 200},

	// ── Billing & Onboarding ────────────────────────────────────────────
	{Method: "POST", Path: "/v1/billing/checkout", Tag: "Billing", Summary: "Create checkout session", Description: "Initiates a payment session via the org's configured gateway (PayU or Stripe).", Security: []string{"bearer"}, RespType: "CheckoutResponse", Status: 200},
	{Method: "GET", Path: "/v1/billing/subscription", Tag: "Billing", Summary: "Get subscription", Description: "Returns the current subscription plan, status, and renewal date.", Security: []string{"bearer"}, RespType: "SubscriptionResponse", Status: 200},
	{Method: "GET", Path: "/v1/billing/usage", Tag: "Billing", Summary: "Get usage", Description: "Returns current billing period usage: seats, projects, environments.", Security: []string{"bearer"}, RespType: "UsageResponse", Status: 200},
	{Method: "POST", Path: "/v1/billing/cancel", Tag: "Billing", Summary: "Cancel subscription", Description: "Cancels the current subscription. Supports at_period_end flag.", Security: []string{"bearer"}, ReqType: "CancelRequest", RespType: "CancelResponse", Status: 200},
	{Method: "POST", Path: "/v1/billing/portal", Tag: "Billing", Summary: "Get billing portal URL", Description: "Generates a URL to the Stripe billing portal.", Security: []string{"bearer"}, RespType: "PortalResponse", Status: 200},
	{Method: "PUT", Path: "/v1/billing/gateway", Tag: "Billing", Summary: "Update payment gateway", Description: "Switches the organization's payment gateway.", Security: []string{"bearer"}, ReqType: "GatewayRequest", RespType: "GatewayResponse", Status: 200},
	{Method: "GET", Path: "/v1/onboarding", Tag: "Onboarding", Summary: "Get onboarding state", Description: "Returns the current onboarding progress for the authenticated org.", Security: []string{"bearer"}, RespType: "OnboardingState", Status: 200},
	{Method: "PATCH", Path: "/v1/onboarding", Tag: "Onboarding", Summary: "Update onboarding state", Description: "Patches onboarding step completion flags.", Security: []string{"bearer"}, ReqType: "UpdateOnboardingRequest", RespType: "OnboardingState", Status: 200},

	// ── Evaluation API (API Key auth) ──────────────────────────────────
	{Method: "POST", Path: "/v1/evaluate", Tag: "Evaluation", Summary: "Evaluate a single flag", Description: "Evaluates a feature flag for the given context and returns its value, variation key, and reason.", Security: []string{"apikey"}, ReqType: "EvaluateRequest", RespType: "EvalResult", Status: 200},
	{Method: "POST", Path: "/v1/evaluate/bulk", Tag: "Evaluation", Summary: "Bulk evaluate", Description: "Evaluates multiple flags (max 100) for the given context in a single request.", Security: []string{"apikey"}, ReqType: "BulkEvaluateRequest", Status: 200},
	{Method: "GET", Path: "/v1/client/{envKey}/flags", Tag: "Evaluation", Summary: "Get all flags for client", Description: "Returns all evaluated flag values for a client environment. Used by client-side SDKs.", Security: []string{"apikey"}, Status: 200},
	{Method: "GET", Path: "/v1/stream/{envKey}", Tag: "Evaluation", Summary: "SSE stream", Description: "Opens a Server-Sent Events stream for real-time flag updates.", Security: []string{"apikey"}, Status: 200},
	{Method: "POST", Path: "/v1/track", Tag: "Metrics", Summary: "Track impression", Description: "Records a flag impression for A/B testing analytics.", Security: []string{"apikey"}, ReqType: "TrackImpressionRequest", Status: 204},

	// ── Projects ────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/projects", Tag: "Projects", Summary: "List projects", Description: "Returns all projects the authenticated user has access to.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},
	{Method: "GET", Path: "/v1/projects/{projectID}", Tag: "Projects", Summary: "Get project", Description: "Returns a single project by ID.", Security: []string{"bearer"}, RespType: "ProjectResponse", Status: 200},
	{Method: "POST", Path: "/v1/projects", Tag: "Projects", Summary: "Create project", Description: "Creates a new project with default environments.", Security: []string{"bearer"}, ReqType: "CreateProjectRequest", RespType: "ProjectResponse", Status: 201},
	{Method: "DELETE", Path: "/v1/projects/{projectID}", Tag: "Projects", Summary: "Delete project", Description: "Permanently deletes a project and all associated resources.", Security: []string{"bearer"}, Status: 204},

	// ── Environments ────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/projects/{projectID}/environments", Tag: "Environments", Summary: "List environments", Description: "Returns all environments in a project.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},
	{Method: "POST", Path: "/v1/projects/{projectID}/environments", Tag: "Environments", Summary: "Create environment", Description: "Creates a new environment in the specified project.", Security: []string{"bearer"}, ReqType: "CreateEnvironmentRequest", RespType: "EnvironmentResponse", Status: 201},
	{Method: "DELETE", Path: "/v1/projects/{projectID}/environments/{envID}", Tag: "Environments", Summary: "Delete environment", Description: "Permanently deletes an environment and its flag states.", Security: []string{"bearer"}, Status: 204},

	// ── Flags ───────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/projects/{projectID}/flags", Tag: "Flags", Summary: "List flags", Description: "Returns all feature flags in a project.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},
	{Method: "GET", Path: "/v1/projects/{projectID}/flags/{flagKey}", Tag: "Flags", Summary: "Get flag", Description: "Returns a single feature flag by key.", Security: []string{"bearer"}, RespType: "FlagResponse", Status: 200},
	{Method: "POST", Path: "/v1/projects/{projectID}/flags", Tag: "Flags", Summary: "Create flag", Description: "Creates a new feature flag in the project.", Security: []string{"bearer"}, ReqType: "CreateFlagRequest", RespType: "FlagResponse", Status: 201},
	{Method: "PUT", Path: "/v1/projects/{projectID}/flags/{flagKey}", Tag: "Flags", Summary: "Update flag", Description: "Updates the flag definition (name, description, tags, category, status).", Security: []string{"bearer"}, ReqType: "CreateFlagRequest", RespType: "FlagResponse", Status: 200},
	{Method: "DELETE", Path: "/v1/projects/{projectID}/flags/{flagKey}", Tag: "Flags", Summary: "Delete flag", Description: "Permanently deletes a feature flag and all associated state.", Security: []string{"bearer"}, Status: 204},

	// ── Flag State ──────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/projects/{projectID}/flags/{flagKey}/environments/{envID}", Tag: "Flag State", Summary: "Get flag state", Description: "Returns the flag's state for a specific environment.", Security: []string{"bearer"}, RespType: "FlagStateResponse", Status: 200},
	{Method: "PUT", Path: "/v1/projects/{projectID}/flags/{flagKey}/environments/{envID}", Tag: "Flag State", Summary: "Update flag state", Description: "Updates the flag's enabled status, rules, rollout percentage, or schedule for a specific environment.", Security: []string{"bearer"}, ReqType: "UpdateFlagStateRequest", RespType: "FlagStateResponse", Status: 200},
	{Method: "POST", Path: "/v1/projects/{projectID}/flags/{flagKey}/promote", Tag: "Flag State", Summary: "Promote flag", Description: "Copies the flag state from one environment to another.", Security: []string{"bearer"}, ReqType: "PromoteRequest", RespType: "FlagStateResponse", Status: 200},
	{Method: "POST", Path: "/v1/projects/{projectID}/flags/{flagKey}/kill", Tag: "Flag State", Summary: "Kill switch", Description: "Instantly disables the flag in the specified environment. Use for emergency rollbacks.", Security: []string{"bearer"}, ReqType: "KillFlagRequest", RespType: "FlagStateResponse", Status: 200},
	{Method: "GET", Path: "/v1/projects/{projectID}/environments/{envID}/flag-states", Tag: "Flag State", Summary: "List flag states", Description: "Returns all flag states for a given environment in one batch.", Security: []string{"bearer"}, RespType: "ListFlagStatesResponse", Status: 200},

	// ── Flag Management (cross-environment) ─────────────────────────────
	{Method: "GET", Path: "/v1/projects/{projectID}/flags/compare-environments", Tag: "Flag Management", Summary: "Compare environments", Description: "Returns per-flag differences between two environments.", Security: []string{"bearer"}, RespType: "EnvComparisonResponse", Status: 200},
	{Method: "POST", Path: "/v1/projects/{projectID}/flags/sync-environments", Tag: "Flag Management", Summary: "Sync environments", Description: "Bulk-promotes selected flags from source to target environment.", Security: []string{"bearer"}, ReqType: "SyncEnvironmentsRequest", Status: 200},

	// ── Segments ────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/projects/{projectID}/segments", Tag: "Segments", Summary: "List segments", Description: "Returns all segments in a project.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},
	{Method: "GET", Path: "/v1/projects/{projectID}/segments/{segmentKey}", Tag: "Segments", Summary: "Get segment", Description: "Returns a single segment by key.", Security: []string{"bearer"}, RespType: "SegmentResponse", Status: 200},
	{Method: "POST", Path: "/v1/projects/{projectID}/segments", Tag: "Segments", Summary: "Create segment", Description: "Creates a new user segment with targeting rules.", Security: []string{"bearer"}, ReqType: "CreateSegmentRequest", RespType: "SegmentResponse", Status: 201},
	{Method: "PUT", Path: "/v1/projects/{projectID}/segments/{segmentKey}", Tag: "Segments", Summary: "Update segment", Description: "Updates a segment's name, description, match type, or rules.", Security: []string{"bearer"}, ReqType: "UpdateSegmentRequest", RespType: "SegmentResponse", Status: 200},
	{Method: "DELETE", Path: "/v1/projects/{projectID}/segments/{segmentKey}", Tag: "Segments", Summary: "Delete segment", Description: "Permanently deletes a segment.", Security: []string{"bearer"}, Status: 204},

	// ── API Keys ────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/environments/{envID}/api-keys", Tag: "API Keys", Summary: "List API keys", Description: "Returns all API keys for an environment.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},
	{Method: "POST", Path: "/v1/environments/{envID}/api-keys", Tag: "API Keys", Summary: "Create API key", Description: "Creates a new API key. The full key is returned only on creation.", Security: []string{"bearer"}, ReqType: "CreateAPIKeyRequest", Status: 201},
	{Method: "DELETE", Path: "/v1/api-keys/{keyID}", Tag: "API Keys", Summary: "Revoke API key", Description: "Revokes and permanently deletes an API key.", Security: []string{"bearer"}, Status: 204},
	{Method: "POST", Path: "/v1/api-keys/{keyID}/rotate", Tag: "API Keys", Summary: "Rotate API key", Description: "Generates a new key value with a grace period for the old key.", Security: []string{"bearer"}, ReqType: "RotateAPIKeyRequest", Status: 201},

	// ── Team ────────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/members", Tag: "Team", Summary: "List members", Description: "Returns all members of the current organization.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},
	{Method: "POST", Path: "/v1/members/invite", Tag: "Team", Summary: "Invite member", Description: "Invites a user to the organization by email.", Security: []string{"bearer"}, ReqType: "InviteRequest", RespType: "MemberResponse", Status: 201},
	{Method: "PUT", Path: "/v1/members/{memberID}", Tag: "Team", Summary: "Update member role", Description: "Changes a team member's role.", Security: []string{"bearer"}, ReqType: "UpdateRoleRequest", Status: 204},
	{Method: "DELETE", Path: "/v1/members/{memberID}", Tag: "Team", Summary: "Remove member", Description: "Removes a team member from the organization.", Security: []string{"bearer"}, Status: 204},
	{Method: "GET", Path: "/v1/members/{memberID}/permissions", Tag: "Team", Summary: "Get member permissions", Description: "Returns per-environment permissions for a member.", Security: []string{"bearer"}, Status: 200},
	{Method: "PUT", Path: "/v1/members/{memberID}/permissions", Tag: "Team", Summary: "Update member permissions", Description: "Replaces per-environment permissions for a member.", Security: []string{"bearer"}, ReqType: "UpdatePermissionsRequest", Status: 200},

	// ── Approvals ───────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/approvals", Tag: "Approvals", Summary: "List approvals", Description: "Returns approval requests for the org, optionally filtered by status.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},
	{Method: "GET", Path: "/v1/approvals/{approvalID}", Tag: "Approvals", Summary: "Get approval", Description: "Returns a single approval request.", Security: []string{"bearer"}, RespType: "ApprovalResponse", Status: 200},
	{Method: "POST", Path: "/v1/approvals", Tag: "Approvals", Summary: "Create approval", Description: "Submits a new change request for review.", Security: []string{"bearer"}, ReqType: "CreateApprovalRequest", RespType: "ApprovalResponse", Status: 201},
	{Method: "POST", Path: "/v1/approvals/{approvalID}/review", Tag: "Approvals", Summary: "Review approval", Description: "Approves or rejects a pending approval request. If approved, the change is applied.", Security: []string{"bearer"}, ReqType: "ReviewRequest", RespType: "ApprovalResponse", Status: 200},

	// ── Webhooks ────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/webhooks", Tag: "Webhooks", Summary: "List webhooks", Description: "Returns all configured webhooks for the org.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},
	{Method: "GET", Path: "/v1/webhooks/{webhookID}", Tag: "Webhooks", Summary: "Get webhook", Description: "Returns a single webhook by ID.", Security: []string{"bearer"}, RespType: "WebhookResponse", Status: 200},
	{Method: "POST", Path: "/v1/webhooks", Tag: "Webhooks", Summary: "Create webhook", Description: "Creates a new webhook endpoint for flag change events.", Security: []string{"bearer"}, ReqType: "CreateWebhookRequest", RespType: "WebhookResponse", Status: 201},
	{Method: "PUT", Path: "/v1/webhooks/{webhookID}", Tag: "Webhooks", Summary: "Update webhook", Description: "Updates a webhook's URL, events, secret, or enabled state.", Security: []string{"bearer"}, ReqType: "UpdateWebhookRequest", RespType: "WebhookResponse", Status: 200},
	{Method: "DELETE", Path: "/v1/webhooks/{webhookID}", Tag: "Webhooks", Summary: "Delete webhook", Description: "Permanently deletes a webhook.", Security: []string{"bearer"}, Status: 204},
	{Method: "GET", Path: "/v1/webhooks/{webhookID}/deliveries", Tag: "Webhooks", Summary: "List deliveries", Description: "Returns delivery history for a webhook.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},

	// ── Audit ───────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/audit", Tag: "Audit", Summary: "List audit log", Description: "Returns a paginated audit log of all organization actions.", Security: []string{"bearer"}, RespType: "PaginatedResponse", Status: 200},
	{Method: "GET", Path: "/v1/audit/export", Tag: "Audit", Summary: "Export audit log", Description: "Exports the full audit log as JSON.", Security: []string{"bearer"}, Status: 200},

	// ── Metrics ─────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/metrics/evaluations", Tag: "Metrics", Summary: "Get evaluation metrics", Description: "Returns evaluation counts and latency metrics.", Security: []string{"bearer"}, RespType: "EvalSummary", Status: 200},
	{Method: "POST", Path: "/v1/metrics/evaluations/reset", Tag: "Metrics", Summary: "Reset evaluation metrics", Description: "Resets evaluation counters.", Security: []string{"bearer"}, RespType: "MetricsResetResponse", Status: 200},
	{Method: "GET", Path: "/v1/metrics/impressions", Tag: "Metrics", Summary: "Get impression metrics", Description: "Returns A/B experiment impression counts.", Security: []string{"bearer"}, Status: 200},
	{Method: "POST", Path: "/v1/metrics/impressions/flush", Tag: "Metrics", Summary: "Flush impressions", Description: "Forces the in-memory impression buffer to persist.", Security: []string{"bearer"}, Status: 200},

	// ── Insights ────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/projects/{projectID}/environments/{envID}/flag-insights", Tag: "Insights", Summary: "Flag insights", Description: "Returns per-flag evaluation distribution for the environment.", Security: []string{"bearer"}, Status: 200},
	{Method: "POST", Path: "/v1/projects/{projectID}/environments/{envID}/inspect-entity", Tag: "Insights", Summary: "Inspect entity", Description: "Evaluates all flags for a specific target context.", Security: []string{"bearer"}, ReqType: "InspectEntityRequest", Status: 200},
	{Method: "POST", Path: "/v1/projects/{projectID}/environments/{envID}/compare-entities", Tag: "Insights", Summary: "Compare entities", Description: "Evaluates all flags for two targets and returns a diff.", Security: []string{"bearer"}, ReqType: "CompareEntitiesRequest", Status: 200},

	// ── Analytics ───────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/analytics/overview", Tag: "Analytics", Summary: "Analytics overview", Description: "Returns internal KPI analytics.", Security: []string{"bearer"}, Status: 200},

	// ── Features (plan capabilities) ────────────────────────────────────
	{Method: "GET", Path: "/v1/features", Tag: "Billing", Summary: "List enabled features", Description: "Returns plan capabilities and their enabled state.", Security: []string{"bearer"}, RespType: "FeaturesResponse", Status: 200},

	// ── User Privacy / GDPR ────────────────────────────────────────────
	{Method: "GET", Path: "/v1/users/me/data", Tag: "User", Summary: "Export personal data (GDPR)", Description: "Returns a JSON export of all personal data for the authenticated user.", Security: []string{"bearer"}, Status: 200},
	{Method: "DELETE", Path: "/v1/users/me", Tag: "User", Summary: "Delete account (GDPR)", Description: "Soft-deletes the authenticated user's account with a 30-day grace period.", Security: []string{"bearer"}, Status: 200},
	{Method: "GET", Path: "/v1/users/me/hints", Tag: "User", Summary: "Get dismissed hints", Description: "Returns dismissed UI hint IDs.", Security: []string{"bearer"}, Status: 200},
	{Method: "POST", Path: "/v1/users/me/hints", Tag: "User", Summary: "Dismiss hint", Description: "Marks a UI hint as dismissed.", Security: []string{"bearer"}, ReqType: "DismissHintRequest", RespType: "MessageResponse", Status: 200},
	{Method: "PUT", Path: "/v1/users/me/email-preferences", Tag: "User", Summary: "Update email preferences", Description: "Updates the user's email notification preferences.", Security: []string{"bearer"}, Status: 200},
	{Method: "POST", Path: "/v1/feedback", Tag: "User", Summary: "Submit feedback", Description: "Submits user feedback about the product.", Security: []string{"bearer"}, ReqType: "FeedbackRequest", Status: 200},

	// ── Sales ───────────────────────────────────────────────────────────
	{Method: "POST", Path: "/v1/sales/inquiry", Tag: "Sales", Summary: "Submit sales inquiry", Description: "Submits an Enterprise plan inquiry.", Security: []string{}, ReqType: "SalesInquiryRequest", Status: 201},

	// ── Billing callbacks (public) ──────────────────────────────────────
	{Method: "POST", Path: "/v1/billing/payu/callback", Tag: "Billing", Summary: "PayU callback", Description: "Handles PayU payment callback. Redirects to dashboard.", Security: []string{}, Status: 303},
	{Method: "POST", Path: "/v1/billing/payu/failure", Tag: "Billing", Summary: "PayU failure", Description: "Handles PayU payment failure redirect.", Security: []string{}, Status: 303},
	{Method: "POST", Path: "/v1/billing/stripe/webhook", Tag: "Billing", Summary: "Stripe webhook", Description: "Processes Stripe webhook events.", Security: []string{}, Status: 200},

	// ── SSO ─────────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/sso/discovery/{orgSlug}", Tag: "SSO", Summary: "SSO discovery", Description: "Returns the SSO configuration type and login URL for an organization.", Security: []string{}, Status: 200},
	{Method: "GET", Path: "/v1/sso/saml/metadata/{orgSlug}", Tag: "SSO", Summary: "SAML metadata", Description: "Returns SAML SP metadata XML.", Security: []string{}, Status: 200},
	{Method: "GET", Path: "/v1/sso/saml/login/{orgSlug}", Tag: "SSO", Summary: "Initiate SAML login", Description: "Redirects to the IdP for SAML authentication.", Security: []string{}, Status: 302},
	{Method: "POST", Path: "/v1/sso/saml/acs/{orgSlug}", Tag: "SSO", Summary: "SAML ACS", Description: "Receives the SAML response from the IdP.", Security: []string{}, Status: 302},
	{Method: "GET", Path: "/v1/sso/oidc/authorize/{orgSlug}", Tag: "SSO", Summary: "Initiate OIDC login", Description: "Redirects to the OIDC provider.", Security: []string{}, Status: 302},
	{Method: "GET", Path: "/v1/sso/oidc/callback/{orgSlug}", Tag: "SSO", Summary: "OIDC callback", Description: "Handles the OIDC provider callback.", Security: []string{}, Status: 302},
	{Method: "GET", Path: "/v1/sso/config", Tag: "SSO", Summary: "Get SSO config", Description: "Returns the SSO configuration. Secrets are masked.", Security: []string{"bearer"}, RespType: "SSOConfigResponse", Status: 200},
	{Method: "POST", Path: "/v1/sso/config", Tag: "SSO", Summary: "Create/update SSO config", Description: "Creates or updates the SSO configuration.", Security: []string{"bearer"}, ReqType: "UpsertSSOConfigRequest", RespType: "SSOConfigResponse", Status: 200},
	{Method: "DELETE", Path: "/v1/sso/config", Tag: "SSO", Summary: "Delete SSO config", Description: "Deletes the SSO configuration.", Security: []string{"bearer"}, Status: 204},
	{Method: "POST", Path: "/v1/sso/config/test", Tag: "SSO", Summary: "Test SSO connection", Description: "Validates the SSO configuration by testing the IdP connection.", Security: []string{"bearer"}, Status: 200},

	// ── SCIM ────────────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/scim/Users", Tag: "SCIM", Summary: "List SCIM users", Description: "Lists users via SCIM 2.0 protocol.", Security: []string{"bearer"}, Status: 200},
	{Method: "GET", Path: "/v1/scim/Users/{userID}", Tag: "SCIM", Summary: "Get SCIM user", Description: "Gets a single user via SCIM 2.0.", Security: []string{"bearer"}, Status: 200},
	{Method: "POST", Path: "/v1/scim/Users", Tag: "SCIM", Summary: "Create SCIM user", Description: "Provisions a user via SCIM 2.0.", Security: []string{"bearer"}, Status: 201},
	{Method: "PUT", Path: "/v1/scim/Users/{userID}", Tag: "SCIM", Summary: "Update SCIM user", Description: "Updates a user via SCIM 2.0.", Security: []string{"bearer"}, Status: 200},
	{Method: "DELETE", Path: "/v1/scim/Users/{userID}", Tag: "SCIM", Summary: "Delete SCIM user", Description: "Deprovisions a user via SCIM 2.0.", Security: []string{"bearer"}, Status: 204},

	// ── IP Allowlist ───────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/ip-allowlist", Tag: "IP Allowlist", Summary: "Get IP allowlist", Description: "Returns the IP allowlist configuration.", Security: []string{"bearer"}, RespType: "IPAllowlistResponse", Status: 200},
	{Method: "PUT", Path: "/v1/ip-allowlist", Tag: "IP Allowlist", Summary: "Update IP allowlist", Description: "Creates or updates the IP allowlist.", Security: []string{"bearer"}, ReqType: "IPAllowlistRequest", RespType: "IPAllowlistResponse", Status: 200},

	// ── Custom Roles ───────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/roles", Tag: "Custom Roles", Summary: "List custom roles", Description: "Returns all custom role templates for the org.", Security: []string{"bearer"}, Status: 200},
	{Method: "GET", Path: "/v1/roles/{roleID}", Tag: "Custom Roles", Summary: "Get custom role", Description: "Returns a single custom role.", Security: []string{"bearer"}, Status: 200},
	{Method: "POST", Path: "/v1/roles", Tag: "Custom Roles", Summary: "Create custom role", Description: "Creates a new custom role template.", Security: []string{"bearer"}, Status: 201},
	{Method: "PUT", Path: "/v1/roles/{roleID}", Tag: "Custom Roles", Summary: "Update custom role", Description: "Updates a custom role template.", Security: []string{"bearer"}, Status: 200},
	{Method: "DELETE", Path: "/v1/roles/{roleID}", Tag: "Custom Roles", Summary: "Delete custom role", Description: "Deletes a custom role template.", Security: []string{"bearer"}, Status: 204},

	// ── Data Export ─────────────────────────────────────────────────────
	{Method: "GET", Path: "/v1/data/export", Tag: "Data Export", Summary: "Export organization data", Description: "Streams the complete org data as a JSON download.", Security: []string{"bearer"}, Status: 200},

	// ── API Docs ────────────────────────────────────────────────────────
	{Method: "GET", Path: "/docs", Tag: "Documentation", Summary: "API documentation index", Description: "Returns API documentation metadata including the OpenAPI spec URL.", Security: []string{}, Status: 200},
	{Method: "GET", Path: "/docs/openapi.json", Tag: "Documentation", Summary: "OpenAPI specification", Description: "Returns the complete OpenAPI 3.0.3 specification for the FeatureSignals API. Used by the Scalar playground and code generation tools.", Security: []string{}, Status: 200},
}
