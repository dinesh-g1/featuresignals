# SSO — Single Sign-On

## Why SSO?

Single Sign-On (SSO) is an authentication mechanism that lets users sign in to multiple applications with one set of credentials managed by a centralized identity provider (IdP). Instead of each application maintaining its own password store and login flow, authentication is delegated to a trusted third-party service.

### Why Companies Prefer SSO

| Benefit | Description |
|---------|-------------|
| **Security** | Passwords are stored in one hardened system (the IdP) rather than scattered across dozens of applications. Breach blast radius is contained. |
| **User Experience** | Employees sign in once and access all authorized applications without re-authenticating. No password fatigue, no sticky notes. |
| **IT Operations** | Onboarding and offboarding are centralized. When an employee leaves, disabling their IdP account instantly revokes access to every connected application. |
| **Compliance** | SSO enables unified audit trails, centralized MFA enforcement, and consistent access policies — requirements for SOC 2, ISO 27001, HIPAA, and FedRAMP. |
| **Reduced Support Costs** | Password reset tickets represent 20-50% of IT helpdesk volume. SSO eliminates per-application passwords and their associated resets. |
| **Group-Based Access Control** | Roles and permissions are managed in the IdP via group membership. Application access control follows organizational hierarchy automatically. |
| **Phishing Resistance** | Modern IdPs support FIDO2/WebAuthn hardware keys, certificate-based auth, and adaptive MFA — security levels most individual applications cannot justify building. |

### When SSO Becomes a Requirement

- **10+ employees** — Manual user management becomes unsustainable
- **Regulated industries** — Healthcare, finance, government mandate centralized access controls
- **Enterprise sales** — Large customers require SSO as a procurement prerequisite (this is why FeatureSignals gates SSO behind the Enterprise plan)
- **M&A activity** — Acquiring companies need unified identity management across organizations

---

## Why SSO Matters for FeatureSignals

### For Our SaaS Customers

FeatureSignals Cloud customers use SSO to integrate their team's existing identity infrastructure (Okta, Azure AD, Google Workspace) directly into the platform. When a company purchases FeatureSignals Enterprise, they expect their engineers, PMs, and analysts to log in with the same credentials they use for every other internal tool — not to manage a separate password. SSO removes friction from their daily workflow while giving their security team the centralized control they require.

For enterprise buyers, SSO is often a **hard requirement** in procurement checklists. Without it, FeatureSignals cannot close deals with large organizations. The SSO feature directly drives Enterprise plan conversions and is a key differentiator against competitors that charge per-MAU or lack native SSO entirely.

### For Our On-Premises Customers

FeatureSignals supports full on-premises and self-hosted deployments via `deploy/onprem/`. SSO works identically in on-prem deployments — the same SAML 2.0 and OIDC flows, the same identity extraction, the same JIT provisioning. This is critical because:

1. **Air-gapped environments** — Government, defense, and healthcare customers run FeatureSignals in isolated networks with no outbound internet. Their IdP (often ADFS or an internal Keycloak) is the only authentication source available. SSO is not optional — it's the only login path.

2. **Data sovereignty** — Customers who self-host to keep data within specific geographic regions still need enterprise authentication. Their compliance requirements (HIPAA, FedRAMP, GDPR) mandate SSO regardless of where FeatureSignals runs.

3. **Unified IT policy** — Even self-hosted customers want their IT department to manage access through their existing IdP. Nobody wants to maintain a separate user directory just for FeatureSignals.

### Deployment Modes and SSO Availability

| Deployment Mode | SSO Available? | Plan Gate | Notes |
|----------------|---------------|-----------|-------|
| **FeatureSignals Cloud (SaaS)** | Yes | Enterprise plan | Gated by `FeatureGate` middleware. Free, Pro, and Trial plans cannot access SSO settings. |
| **On-Premises (self-hosted)** | Yes | Enterprise plan (same gate) | The `DEPLOYMENT_MODE=onprem` flag disables multi-region and billing, but SSO still requires the Enterprise plan level. An optional `LICENSE_KEY` can be configured for enterprise license validation. |
| **Open-source (community)** | Code is available | Plan check applies | The source code is Apache-2.0 and fully readable, but the runtime plan check still gates the SSO config endpoints. Organizations that want SSO without a paid plan would need to modify the source. |

### How SSO Drives Our Business

| Impact | Details |
|--------|---------|
| **Revenue** | SSO is an Enterprise-only feature. It directly motivates upgrades from Pro → Enterprise, increasing ACV (average contract value). |
| **Competitive positioning** | LaunchDarkly charges per-MAU for SSO. We include it in Enterprise flat-rate pricing — a key differentiator in sales conversations. |
| **Customer retention** | Once a customer integrates their IdP with FeatureSignals, switching costs are high. SSO creates natural lock-in through operational integration. |
| **Security reputation** | Offering PKCE, nonce, SAML signature validation, and IdP-initiated flows signals to security teams that we take authentication seriously — shortening sales cycles. |
| **Compliance enablement** | Customers pursuing SOC 2, ISO 27001, or HIPAA certification need SSO. By providing it, we unblock entire deal pipelines. |
| **On-prem parity** | SSO works identically in cloud and on-prem. Customers can migrate between deployment modes without re-engineering their authentication flow. |

## Two Distinct Concepts: Mechanism vs. Features

It's important to distinguish between the **SSO authentication mechanism** (the technical plumbing) and the **SSO product features** (what customers actually get). They are related but fundamentally different.

### 1. SSO Authentication Mechanism — "How it works"

This is the technical implementation — the protocol handling that makes SSO login possible. It's invisible to the end user but essential for security and reliability.

| Component | What It Does | Where in Code |
|-----------|-------------|---------------|
| **SAML 2.0 flow** | Parses IdP metadata, generates AuthnRequest, validates XML signatures and assertions | `saml.go` |
| **OIDC flow** | Performs discovery, generates state/nonce/code_verifier, exchanges tokens, validates ID tokens | `oidc.go` |
| **PKCE (RFC 7636)** | Prevents authorization code injection attacks via S256 challenge/verifier | `oidc.go` (`GenerateCodeVerifier`, `GenerateCodeChallenge`) |
| **Nonce validation** | Prevents ID token replay attacks by matching nonce in auth request to ID token claim | `oidc.go` (Exchange method) |
| **State management** | CSRF protection via cryptographically random, single-use, time-limited state tokens | `handlers/sso_state.go` |
| **Identity extraction** | Normalizes user data from SAML attributes or OIDC claims into a common `Identity` struct | `sso.go` (`extractIdentityFromAssertion`) |

The customer never sees any of this. It either works or it doesn't. If it works, the user simply logs in.

### 2. SSO Product Features — "What customers get"

These are the capabilities available to customers once SSO is configured. These are the **reason** customers buy the Enterprise plan.

| Feature | Description | User-Facing |
|---------|-------------|-------------|
| **JIT User Provisioning** | Users are automatically created on first SSO login. No manual account setup needed. | ✅ User sees immediate access |
| **Group-Based Role Mapping** | IdP groups (`admins`, `engineering`, `viewers`) are mapped to FeatureSignals roles (Admin, Developer, Viewer). | ✅ Determines what users can do |
| **SSO Enforcement** | Admins can block email/password login entirely, forcing all users through SSO. | ✅ Login page rejects non-SSO attempts |
| **Owner Break-Glass** | Organization owners can always use password login even when SSO is enforced — emergency access. | ✅ Admins retain access |
| **Audit Logging** | Every SSO login and config change is recorded with IP, user agent, actor, and timestamp. | ✅ Visible in audit trail |
| **IdP-Initiated Login** | Users can click FeatureSignals in their IdP dashboard and be logged in without visiting FeatureSignals first. | ✅ Single-click access from IdP portal |
| **Email Verified Propagation** | Respects the IdP's `email_verified` claim instead of blindly trusting all identities. | ✅ Security posture |
| **Discovery Endpoint** | Login page queries `/v1/sso/discovery/{org}` to determine whether to show SSO option and which protocol to use. | ✅ Login page UX |
| **Test Connection** | Admins can validate their SSO configuration from Settings before enabling it for their team. | ✅ Settings → SSO UI |
| **SP Metadata Serving** | For SAML, FeatureSignals serves its own metadata XML so IdPs can auto-configure. | ✅ IdP setup experience |

### How They Relate

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SSO PRODUCT FEATURES                             │
│  (What the customer experiences and pays for)                       │
│                                                                     │
│  JIT Provisioning │ Role Mapping │ Enforcement │ Audit │ Discovery  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              SSO AUTHENTICATION MECHANISM                      │ │
│  │         (The technical plumbing that makes it all work)       │ │
│  │                                                               │ │
│  │  SAML flow │ OIDC flow │ PKCE │ Nonce │ State │ Signature   │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  The mechanism enables the features.                                │
│  The features deliver the value.                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Example**: When a customer enables "SSO Enforcement," here's what happens at each layer:

| Layer | What Happens |
|-------|-------------|
| **Product feature** | Admin checks "Enforce SSO" → non-owners get 403 on email/password login |
| **Mechanism** | `auth.go` handler calls `GetSSOConfig`, checks `Enforce == true`, rejects with `httputil.Error(403)` |

**Another example**: A user logs in via Okta (OIDC):

| Layer | What Happens |
|-------|-------------|
| **Product feature** | User is created automatically, gets "Developer" role because they're in the `engineering` group |
| **Mechanism** | OIDC discovery → PKCE auth code flow → token exchange → nonce validation → `extractIdentityFromAssertion` → `MapRole(groups, "developer")` → `CreateUser` → `AddOrgMember` |

---

## Architecture

This package implements the SSO protocol handlers for FeatureSignals. It supports both **SAML 2.0** and **OpenID Connect (OIDC)**, covering every major enterprise identity provider.

### Design

```
                    ┌─────────────────────────────────────────┐
                    │           SSO Package (this)             │
                    │                                          │
                    │  ┌──────────┐    ┌──────────┐           │
   Identity ──────► │  │  SAML    │    │   OIDC   │           │
   extracted        │  │ Provider │    │ Provider │           │
                    │  │(crewjam) │    │(go-oidc) │           │
                    │  └────┬─────┘    └────┬─────┘           │
                    │       │               │                  │
                    │       └───────┬───────┘                  │
                    │               ▼                          │
                    │         Identity struct                  │
                    │       (email, name, groups,              │
                    │        email_verified)                   │
                    │               │                          │
                    │               ▼                          │
                    │          MapRole()                       │
                    │    (IdP groups → platform role)          │
                    └─────────────────────────────────────────┘
                                    │
                                    ▼
              ┌─────────────────────────────────────────┐
              │     SSOAuthHandler (handlers package)    │
              │                                          │
              │  ┌─────────────────────────────────┐    │
              │  │ provisionAndLogin()              │    │
              │  │  - JIT user creation             │    │
              │  │  - Org membership with role      │    │
              │  │  - JWT token generation          │    │
              │  │  - Audit entry                   │    │
              │  └─────────────────────────────────┘    │
              └─────────────────────────────────────────┘
```

### OIDC Flow (Authorization Code + PKCE + Nonce)

```
Browser → GET /v1/sso/discovery/{orgSlug}          → Server (returns provider type)
Browser → GET /v1/sso/oidc/authorize/{orgSlug}     → Server (generates state + nonce + code_verifier)
Server  → 302 Redirect to IdP                       (with code_challenge=S256(hash(code_verifier)) + nonce)
IdP     → User authenticates, consents
IdP     → 302 Redirect to /v1/sso/oidc/callback/{orgSlug}?code=...&state=...
Server  → Validate state (single-use, 10-min TTL, org-slug match)
Server  → Exchange code + code_verifier for tokens
Server  → Verify ID token signature, expiry, audience, nonce
Server  → Extract identity (email, name, groups, email_verified)
Server  → JIT provision / login, generate JWTs
Server  → 302 Redirect to /sso/callback#access_token=...&refresh_token=...
```

### SAML Flow (SP-Initiated)

```
Browser → GET /v1/sso/saml/login/{orgSlug}         → Server (builds SP from config)
Server  → 302 Redirect to IdP SSO URL               (with SAML AuthnRequest)
IdP     → User authenticates
IdP     → POST to /v1/sso/saml/acs/{orgSlug}        (with SAML Response)
Server  → Validate XML signature against IdP certificate
Server  → Validate assertion: audience, time validity, conditions
Server  → Extract identity (email, name, groups, email_verified)
Server  → JIT provision / login, generate JWTs
Server  → 302 Redirect to /sso/callback#tokens
```

### SAML Flow (IdP-Initiated)

```
IdP     → POST to /v1/sso/saml/acs/{orgSlug}        (with SAML Response, no prior AuthnRequest)
Server  → AllowIDPInitiated=true, full validation still applies
Server  → Validate XML signature, assertion, audience, time
Server  → Extract identity, JIT provision / login
Server  → 302 Redirect to /sso/callback#tokens
```

---

## Security Properties

| Property | Implementation |
|----------|---------------|
| **CSRF Prevention** | Cryptographically random 32-byte state parameter, validated on callback |
| **Replay Attack Prevention** | OIDC nonce generated per-request, validated against ID token `nonce` claim |
| **Authorization Code Injection** | PKCE S256 code challenge/challenge_method, code verifier sent during token exchange |
| **Single-Use Tokens** | State/nonce/code_verifier consumed on first read and immediately deleted |
| **Time-Limited Sessions** | State entries expire after 10 minutes with automatic cleanup |
| **XML Signature Validation** | SAML assertions validated against IdP certificate via `crewjam/saml` |
| **Assertion Validity** | SAML NotBefore/NotOnOrAfter checked with built-in clock drift tolerance |
| **Audience Restriction** | SAML audience validated, OIDC audience validated against client ID |
| **Org Isolation** | State is namespaced to org slug; mismatched org rejects the callback |
| **Token Delivery** | JWTs delivered in URL fragment (`#`) not query params — excluded from server logs and browser history |
| **Secret Masking** | Client secrets, certificates, and metadata XML never exposed in API responses |
| **Audit Trail** | Every SSO login and config change creates an audit entry with IP, user agent, and actor |

---

## Supported Identity Providers

### OIDC
- Okta
- Google Workspace / Google Cloud Identity
- Azure AD / Microsoft Entra ID
- Auth0
- Keycloak
- OneLogin
- PingIdentity
- Any OIDC-compliant provider

### SAML 2.0
- Okta
- Azure AD / Microsoft Entra ID
- OneLogin
- PingFederate / PingOne
- Active Directory Federation Services (ADFS)
- Keycloak
- JumpCloud
- Any SAML 2.0-compliant provider

---

## Configuration Methods

### SAML
The SAML provider supports three configuration approaches (in order of preference):

1. **Metadata URL** — Provide the IdP's metadata endpoint URL. The server fetches and parses the XML automatically.
2. **Metadata XML** — Paste the full IdP metadata XML directly. Useful when the metadata endpoint requires authentication.
3. **Certificate + Entity ID + SSO URL** — Manually provide the IdP's signing certificate (PEM), entity ID, and SSO endpoint. Minimal configuration for custom setups.

### OIDC
OIDC requires three fields:

1. **Issuer URL** — The OIDC discovery endpoint (e.g., `https://your-org.okta.com/oauth2/default`). The server appends `/.well-known/openid-configuration` to discover endpoints.
2. **Client ID** — The OAuth 2.0 client identifier from your IdP.
3. **Client Secret** — The OAuth 2.0 client secret from your IdP.

---

## Role Mapping

IdP group membership is mapped to FeatureSignals roles via the `MapRole()` function:

| IdP Group | FeatureSignals Role |
|-----------|-------------------|
| `admin`, `admins`, `FeatureSignals-Admin` | Admin |
| `developer`, `developers`, `engineering`, `FeatureSignals-Developer` | Developer |
| `viewer`, `viewers`, `readonly`, `FeatureSignals-Viewer` | Viewer |
| (no matching group) | Falls back to configured `default_role` |

The first matching group wins. If no groups match, the `default_role` from the SSO config is used (defaults to `developer`).

---

## Testing

### Running Automated Tests

```bash
cd server
go test ./internal/sso/... ./internal/api/handlers/... -run "SSO|SAML|OIDC" -v -count=1
```

All tests should pass, including:

| Test | What It Validates |
|------|-------------------|
| `TestMapRole_*` | Role mapping from IdP groups with fallback |
| `TestGenerateState` | Cryptographic state uniqueness |
| `TestGenerateNonce` | Cryptographic nonce uniqueness |
| `TestGenerateCodeVerifier` | PKCE verifier length (43-128 chars) |
| `TestGenerateCodeChallenge` | PKCE S256 deterministic derivation |
| `TestSSOHandler_Get_NotConfigured` | 404 for missing config |
| `TestSSOHandler_Upsert_OIDC_Valid` | OIDC config creation |
| `TestSSOHandler_Upsert_OIDC_MissingFields` | OIDC validation |
| `TestSSOHandler_Upsert_SAML_MissingFields` | SAML validation |
| `TestSSOHandler_Upsert_InvalidProviderType` | Provider type validation |
| `TestSSOHandler_Delete` | Config deletion |
| `TestSSOAuthHandler_Discovery_NoSSO` | Discovery for unknown org |
| `TestSSOAuthHandler_Discovery_SSOEnabled` | Discovery returns provider type |
| `TestSSOAuthHandler_Discovery_SSODisabled` | Discovery returns false when disabled |
| `TestSSOAuthHandler_SAMLMetadata_NotConfigured` | 404 for missing SAML config |
| `TestSSOAuthHandler_OIDCAuthorize_NotConfigured` | 404 for missing OIDC config |
| `TestAuthHandler_Login_SSOEnforced_BlocksNonOwner` | SSO enforcement blocks developer |
| `TestAuthHandler_Login_SSOEnforced_AllowsOwner` | Owner break-glass works |
| `TestAuthHandler_Login_SSONotEnforced_AllowsPassword` | Password login works when not enforced |

### Manual Testing — OIDC

#### 1. Configure Your OIDC Application in the IdP

**Okta:**
1. Applications → Create App Integration → OIDC - OpenID Connect → Web Application
2. Sign-in redirect URI: `https://your-api-domain.com/v1/sso/oidc/callback/{your-org-slug}`
3. Grant type: Authorization Code. Scopes: `openid`, `email`, `profile`
4. Note Client ID and Client Secret
5. Issuer URL: `https://{your-okta-domain}.okta.com/oauth2/default`

**Google Workspace:**
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Authorized redirect URI: `https://your-api-domain.com/v1/sso/oidc/callback/{your-org-slug}`
3. Issuer URL: `https://accounts.google.com`

**Azure AD:**
1. Microsoft Entra ID → App registrations → New registration
2. Redirect URI: Web → `https://your-api-domain.com/v1/sso/oidc/callback/{your-org-slug}`
3. Enable ID tokens under Authentication
4. Issuer URL: `https://login.microsoftonline.com/{tenant-id}/v2.0`

#### 2. Configure in FeatureSignals

1. Settings → SSO → Select **OpenID Connect**
2. Fill in Issuer URL, Client ID, Client Secret
3. Set Default Role, enable SSO
4. Click **Test Connection** → should show "OIDC discovery successful"
5. Click **Save Configuration**

#### 3. Test the Flow

1. Log out → Sign in with SSO → Enter org slug → Continue
2. Authenticate at your IdP
3. You should be redirected back to FeatureSignals, logged in

#### 4. Verify PKCE and Nonce

1. Open Browser DevTools → Network tab
2. Initiate SSO login, find the redirect to your IdP
3. Verify query params include:
   - `code_challenge` (43+ chars, base64url-encoded SHA-256 hash)
   - `code_challenge_method=S256`
   - `nonce` parameter present

### Manual Testing — SAML

#### 1. Get SP Metadata

After saving a SAML config, the settings page shows:
- **SP Entity ID / Metadata URL**: `https://your-api-domain.com/v1/sso/saml/metadata/{org-slug}`
- **ACS URL**: `https://your-api-domain.com/v1/sso/saml/acs/{org-slug}`

#### 2. Configure Your SAML Application in the IdP

**Okta:**
1. Applications → Create App Integration → SAML 2.0
2. Audience URI: The Metadata URL from above
3. ACS URL: The ACS URL from above
4. Attribute Statements: `email` → `user.email`, `firstName` → `user.firstName`, `lastName` → `user.lastName`, `groups` → `groups`
5. Download IdP metadata XML

**Azure AD:**
1. Enterprise applications → New application → Non-gallery → SAML
2. Identifier (Entity ID): The Metadata URL from above
3. Reply URL (ACS URL): The ACS URL from above
4. Attributes: `emailaddress` → `user.mail`, `givenname` → `user.givenname`, `surname` → `user.surname`
5. Download Federation Metadata XML

**Keycloak:**
1. Create SAML client with client ID = your org slug
2. Valid Redirect URIs: `https://your-api-domain.com/v1/sso/saml/acs/{org-slug}`
3. Name ID Format: `email`
4. Download SAML Metadata from Installation tab

#### 3. Configure in FeatureSignals

1. Settings → SSO → Select **SAML 2.0**
2. Choose: Metadata URL (recommended), Metadata XML, or Certificate + Entity ID + SSO URL
3. Set Default Role, enable SSO
4. Click **Test Connection** → should show "SAML configuration is valid"
5. Click **Save Configuration**

#### 4. Test SP-Initiated Flow

1. Log out → Sign in with SSO → Enter org slug → Continue
2. Authenticate at your IdP
3. You should be redirected back to FeatureSignals, logged in

#### 5. Test IdP-Initiated Flow

1. Go to your IdP's application portal (e.g., Okta dashboard)
2. Click the FeatureSignals application tile
3. The IdP POSTs a SAML assertion directly to the ACS URL
4. You should be logged in automatically

### Testing SSO Enforcement

| Scenario | Steps | Expected |
|----------|-------|----------|
| Enforce SSO (non-owner) | Enable "Enforce SSO", try email/password login as non-owner | 403: "This organization requires SSO login" |
| Owner break-glass | With enforcement enabled, owner logs in with email/password | Login succeeds |
| SSO not enforced | Non-owner logs in with email/password | Login succeeds |

### Testing Group-Based Role Mapping

1. In your IdP, assign a test user to a group (e.g., `admins`)
2. Log in via SSO as that user
3. Check the user's role in Settings → Team
4. The role should match the group mapping in the table above

### Testing Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Invalid state parameter | `/login?sso_error=Invalid+or+expired+SSO+session` |
| IdP returns error | `/login?sso_error=Identity+provider+returned+an+error` |
| Missing email in assertion | `/login?sso_error=Invalid+SSO+response+from+identity+provider` |
| SSO not configured | `/login?sso_error=SSO+not+configured+for+this+organization` |
| Expired state (>10 min) | `/login?sso_error=Invalid+or+expired+SSO+session` |
| State reuse (replay) | Second use rejected — state is single-use |

### Testing API Endpoints

```bash
# SSO Discovery
curl https://your-api-domain.com/v1/sso/discovery/{org-slug}
# Expected: {"sso_enabled": true, "provider_type": "oidc", "enforce": false}

# SAML Metadata
curl https://your-api-domain.com/v1/sso/saml/metadata/{org-slug}
# Expected: SAML SP metadata XML

# SSO Config (requires admin token)
curl -H "Authorization: Bearer {token}" https://your-api-domain.com/v1/sso/config

# Test Connection (requires admin token)
curl -X POST -H "Authorization: Bearer {token}" https://your-api-domain.com/v1/sso/config/test
```

---

## Troubleshooting

### OIDC Discovery Fails
- Verify the issuer URL is correct and accessible
- Check that your IdP's `/.well-known/openid-configuration` endpoint is publicly accessible
- Ensure no firewall blocks outbound HTTPS from your server

### SAML Metadata Fetch Fails
- Verify the metadata URL is publicly accessible
- Some IdPs require authentication to access metadata — use the XML paste method instead

### "Invalid SSO response" Error
- Check that your IdP is sending the correct attributes (especially `email`)
- Verify the IdP certificate matches what's configured in FeatureSignals
- Check that the audience in the SAML assertion matches your SP Entity ID

### "Nonce mismatch" Error
- This indicates a potential replay attack or a bug in the IdP
- Ensure your IdP supports and returns the `nonce` parameter in the ID token
- Some older IdPs may not support nonce — the validation still passes if the IdP returns the same nonce it received

### State Parameter Errors
- State expires after 10 minutes — complete the login within this window
- State is single-use — refreshing the callback page will fail
- Ensure browser cookies/session aren't cleared during the IdP redirect
