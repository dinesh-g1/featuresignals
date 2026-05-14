package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type scimStore interface {
	domain.UserReader
	domain.UserWriter
	domain.OrgMemberStore
	domain.AuditWriter
}

// SCIMHandler implements SCIM 2.0 /Users and /Groups endpoints for
// automated identity provisioning from IdPs like Okta, Azure AD, OneLogin.
type SCIMHandler struct {
	store scimStore
}

func NewSCIMHandler(store scimStore) *SCIMHandler {
	return &SCIMHandler{store: store}
}

// SCIM resource schemas
const (
	scimUserSchema  = "urn:ietf:params:scim:schemas:core:2.0:User"
	scimGroupSchema = "urn:ietf:params:scim:schemas:core:2.0:Group"
	scimListSchema  = "urn:ietf:params:scim:api:messages:2.0:ListResponse"
	scimErrorSchema = "urn:ietf:params:scim:api:messages:2.0:Error"
)

type scimName struct {
	GivenName  string `json:"givenName,omitempty"`
	FamilyName string `json:"familyName,omitempty"`
	Formatted  string `json:"formatted,omitempty"`
}

type scimEmail struct {
	Value   string `json:"value"`
	Type    string `json:"type,omitempty"`
	Primary bool   `json:"primary"`
}

type scimUser struct {
	Schemas    []string    `json:"schemas"`
	ID         string      `json:"id"`
	ExternalID string      `json:"externalId,omitempty"`
	UserName   string      `json:"userName"`
	Name       scimName    `json:"name"`
	Emails     []scimEmail `json:"emails"`
	Active     bool        `json:"active"`
	Meta       scimMeta    `json:"meta"`
}

type scimMeta struct {
	ResourceType string `json:"resourceType"`
	Created      string `json:"created,omitempty"`
	LastModified string `json:"lastModified,omitempty"`
	Location     string `json:"location,omitempty"`
}

type scimListResponse struct {
	Schemas      []string      `json:"schemas"`
	TotalResults int           `json:"totalResults"`
	StartIndex   int           `json:"startIndex"`
	ItemsPerPage int           `json:"itemsPerPage"`
	Resources    []interface{} `json:"Resources"`
}

type scimError struct {
	Schemas []string `json:"schemas"`
	Detail  string   `json:"detail"`
	Status  string   `json:"status"`
}

func scimJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/scim+json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func scimErr(w http.ResponseWriter, status int, detail string) {
	scimJSON(w, status, scimError{
		Schemas: []string{scimErrorSchema},
		Detail:  detail,
		Status:  strconv.Itoa(status),
	})
}

func domainUserToSCIM(u *domain.User) scimUser {
	return scimUser{
		Schemas:  []string{scimUserSchema},
		ID:       u.ID,
		UserName: u.Email,
		Name:     scimName{Formatted: u.Name},
		Emails:   []scimEmail{{Value: u.Email, Type: "work", Primary: true}},
		Active:   true,
		Meta: scimMeta{
			ResourceType: "User",
			Created:      u.CreatedAt.Format(time.RFC3339),
			LastModified: u.UpdatedAt.Format(time.RFC3339),
		},
	}
}

// ListUsers implements GET /v1/scim/Users
func (h *SCIMHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	members, err := h.store.ListOrgMembers(r.Context(), orgID, 0, 0)
	if err != nil {
		scimErr(w, http.StatusInternalServerError, "Member listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	startIndex, _ := strconv.Atoi(r.URL.Query().Get("startIndex"))
	if startIndex < 1 {
		startIndex = 1
	}
	count, _ := strconv.Atoi(r.URL.Query().Get("count"))
	if count < 1 || count > 100 {
		count = 100
	}

	filter := r.URL.Query().Get("filter")

	resources := make([]interface{}, 0, len(members))
	for _, m := range members {
		user, uErr := h.store.GetUserByID(r.Context(), m.UserID)
		if uErr != nil {
			continue
		}
		if filter != "" && !scimFilterMatch(filter, user) {
			continue
		}
		resources = append(resources, domainUserToSCIM(user))
	}

	end := startIndex - 1 + count
	if end > len(resources) {
		end = len(resources)
	}
	start := startIndex - 1
	if start > len(resources) {
		start = len(resources)
	}
	page := resources[start:end]

	scimJSON(w, http.StatusOK, scimListResponse{
		Schemas:      []string{scimListSchema},
		TotalResults: len(resources),
		StartIndex:   startIndex,
		ItemsPerPage: len(page),
		Resources:    page,
	})
}

// GetUser implements GET /v1/scim/Users/{id}
func (h *SCIMHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	orgID := middleware.GetOrgID(r.Context())

	if _, err := h.store.GetOrgMember(r.Context(), orgID, userID); err != nil {
		scimErr(w, http.StatusNotFound, "User lookup failed — no user matches the provided identifier. Verify the user ID or email.")
		return
	}

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			scimErr(w, http.StatusNotFound, "User lookup failed — no user matches the provided identifier. Verify the user ID or email.")
		} else {
			scimErr(w, http.StatusInternalServerError, "User retrieval failed — an unexpected error occurred on the server. Try again or contact support.")
		}
		return
	}
	scimJSON(w, http.StatusOK, domainUserToSCIM(user))
}

type scimCreateUserRequest struct {
	Schemas    []string    `json:"schemas"`
	UserName   string      `json:"userName"`
	Name       scimName    `json:"name"`
	Emails     []scimEmail `json:"emails"`
	ExternalID string      `json:"externalId"`
	Active     *bool       `json:"active"`
}

// CreateUser implements POST /v1/scim/Users (JIT provisioning via SCIM)
func (h *SCIMHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "scim")
	orgID := middleware.GetOrgID(r.Context())

	var req scimCreateUserRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		scimErr(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	email := req.UserName
	if email == "" && len(req.Emails) > 0 {
		email = req.Emails[0].Value
	}
	if email == "" {
		scimErr(w, http.StatusBadRequest, "User provisioning blocked — userName or at least one email is required. Provide user identification.")
		return
	}

	displayName := req.Name.Formatted
	if displayName == "" {
		displayName = strings.TrimSpace(req.Name.GivenName + " " + req.Name.FamilyName)
	}
	if displayName == "" {
		displayName = email
	}

	// Check if user already exists
	existing, _ := h.store.GetUserByEmail(r.Context(), email)
	if existing != nil {
		// Just add org membership if missing
		h.ensureOrgMembership(r.Context(), orgID, existing.ID)
		scimJSON(w, http.StatusOK, domainUserToSCIM(existing))
		return
	}

	randomPW, _ := generateEmailToken()
	hash, _ := auth.HashPassword(randomPW)

	user := &domain.User{
		Email:        email,
		Name:         displayName,
		PasswordHash: hash,
	}
	if err := h.store.CreateUser(r.Context(), user); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			scimErr(w, http.StatusConflict, "Creation blocked — a user with this email already exists. The user may already be provisioned.")
		} else {
			logger.Error("SCIM create user failed", "error", err, "email", email)
			scimErr(w, http.StatusInternalServerError, "User creation failed — an unexpected error occurred on the server. Try again or contact support.")
		}
		return
	}

	h.ensureOrgMembership(r.Context(), orgID, user.ID)

	actorID := middleware.GetUserID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &actorID, ActorType: "scim",
		Action: "scim.user.created", ResourceType: "user", ResourceID: &user.ID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	logger.Info("SCIM user provisioned", "user_id", user.ID, "email", email, "org_id", orgID)
	scimJSON(w, http.StatusCreated, domainUserToSCIM(user))
}

// UpdateUser implements PUT /v1/scim/Users/{id} (replace)
func (h *SCIMHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	orgID := middleware.GetOrgID(r.Context())

	if _, err := h.store.GetOrgMember(r.Context(), orgID, userID); err != nil {
		scimErr(w, http.StatusNotFound, "User lookup failed — no user matches the provided identifier. Verify the user ID or email.")
		return
	}

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			scimErr(w, http.StatusNotFound, "User lookup failed — no user matches the provided identifier. Verify the user ID or email.")
		} else {
			scimErr(w, http.StatusInternalServerError, "User retrieval failed — an unexpected error occurred on the server. Try again or contact support.")
		}
		return
	}

	var req scimCreateUserRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		scimErr(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	// Handle deactivation: active=false means remove org membership
	if req.Active != nil && !*req.Active {
		member, mErr := h.store.GetOrgMember(r.Context(), orgID, userID)
		if mErr == nil {
			_ = h.store.RemoveOrgMember(r.Context(), member.ID)
		}

		actorID := middleware.GetUserID(r.Context())
		h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
			OrgID: orgID, ActorID: &actorID, ActorType: "scim",
			Action: "scim.user.deactivated", ResourceType: "user", ResourceID: &userID,
			IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
		})
	}

	scimJSON(w, http.StatusOK, domainUserToSCIM(user))
}

// DeleteUser implements DELETE /v1/scim/Users/{id}
func (h *SCIMHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "userID")
	orgID := middleware.GetOrgID(r.Context())

	member, err := h.store.GetOrgMember(r.Context(), orgID, userID)
	if err != nil {
		scimErr(w, http.StatusNotFound, "Membership lookup failed — the user is not a member of this organization. Verify the user ID and organization.")
		return
	}
	_ = h.store.RemoveOrgMember(r.Context(), member.ID)

	actorID := middleware.GetUserID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &actorID, ActorType: "scim",
		Action: "scim.user.deleted", ResourceType: "user", ResourceID: &userID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *SCIMHandler) ensureOrgMembership(ctx context.Context, orgID, userID string) {
	_, err := h.store.GetOrgMember(ctx, orgID, userID)
	if err != nil {
		_ = h.store.AddOrgMember(ctx, &domain.OrgMember{
			OrgID:  orgID,
			UserID: userID,
			Role:   domain.RoleDeveloper,
		})
	}
}

// scimFilterMatch provides basic SCIM filter support for userName eq "value"
func scimFilterMatch(filter string, user *domain.User) bool {
	filter = strings.TrimSpace(filter)
	lower := strings.ToLower(filter)

	if strings.HasPrefix(lower, "username eq ") {
		val := strings.Trim(filter[12:], `"' `)
		return strings.EqualFold(user.Email, val)
	}
	if strings.HasPrefix(lower, "emails.value eq ") {
		val := strings.Trim(filter[16:], `"' `)
		return strings.EqualFold(user.Email, val)
	}
	return true
}
