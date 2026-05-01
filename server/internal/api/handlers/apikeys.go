package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type apiKeyHandlerStore interface {
	domain.APIKeyStore
	domain.AuditWriter
	envAndProjectGetter
}

type APIKeyHandler struct {
	store apiKeyHandlerStore
}

func NewAPIKeyHandler(store apiKeyHandlerStore) *APIKeyHandler {
	return &APIKeyHandler{store: store}
}

func generateAPIKey(keyType domain.APIKeyType) (string, string, string) {
	prefix := "fs_srv_"
	if keyType == domain.APIKeyClient {
		prefix = "fs_cli_"
	}

	b := make([]byte, 24)
	rand.Read(b)
	rawKey := prefix + hex.EncodeToString(b)

	// Use HMAC-SHA-256 with server-side pepper for API key hashing.
	// See HashAPIKey for rationale.
	keyHash := HashAPIKey(rawKey)

	return rawKey, keyHash, rawKey[:12]
}

type CreateAPIKeyRequest struct {
	Name          string `json:"name"`
	Type          string `json:"type"` // "server" or "client"
	ExpiresInDays *int   `json:"expires_in_days,omitempty"`
}

func (h *APIKeyHandler) Create(w http.ResponseWriter, r *http.Request) {
	env, ok := verifyEnvironmentOwnership(h.store, r, w)
	if !ok {
		return
	}
	envID := env.ID

	var req CreateAPIKeyRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name is required")
		return
	}

	keyType := domain.APIKeyType(req.Type)
	if keyType != domain.APIKeyServer && keyType != domain.APIKeyClient {
		keyType = domain.APIKeyServer
	}

	rawKey, keyHash, keyPrefix := generateAPIKey(keyType)

	orgID := middleware.GetOrgID(r.Context())
	apiKey := &domain.APIKey{
		EnvID:     envID,
		OrgID:     orgID,
		KeyHash:   keyHash,
		KeyPrefix: keyPrefix,
		Name:      req.Name,
		Type:      keyType,
	}
	if req.ExpiresInDays != nil && *req.ExpiresInDays > 0 {
		exp := time.Now().Add(time.Duration(*req.ExpiresInDays) * 24 * time.Hour)
		apiKey.ExpiresAt = &exp
	}

	if err := h.store.CreateAPIKey(r.Context(), apiKey); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to create API key")
		return
	}

	// Return the full key only on creation — it's never shown again
	resp := map[string]interface{}{
		"id":         apiKey.ID,
		"key":        rawKey,
		"key_prefix": apiKey.KeyPrefix,
		"name":       apiKey.Name,
		"type":       apiKey.Type,
		"env_id":     apiKey.EnvID,
		"created_at": apiKey.CreatedAt,
	}
	if apiKey.ExpiresAt != nil {
		resp["expires_at"] = apiKey.ExpiresAt
	}

	actorID := middleware.GetUserID(r.Context())
	keyIDStr := apiKey.ID
	meta, _ := json.Marshal(map[string]string{"key_prefix": apiKey.KeyPrefix, "env_id": envID})
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ProjectID:    &env.ProjectID,
		ActorID:      &actorID,
		ActorType:    "user",
		Action:       "api_key.created",
		ResourceType: "api_key",
		ResourceID:   &keyIDStr,
		Metadata:     meta,
	})

	httputil.JSON(w, http.StatusCreated, resp)
}

type rotateRequest struct {
	Name         string `json:"name"`
	GraceMinutes int    `json:"grace_minutes"`
}

func (h *APIKeyHandler) Rotate(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "api_keys")
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	oldKeyID := chi.URLParam(r, "keyID")

	var req rotateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	oldKey, err := h.store.GetAPIKeyByID(r.Context(), oldKeyID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "API key not found")
		return
	}

	env, err := h.store.GetEnvironment(r.Context(), oldKey.EnvID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "API key not found")
		return
	}
	project, err := h.store.GetProject(r.Context(), env.ProjectID)
	if err != nil || project.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "API key not found")
		return
	}

	name := req.Name
	if name == "" {
		name = oldKey.Name + " (rotated)"
	}
	gracePeriod := time.Duration(req.GraceMinutes) * time.Minute
	if gracePeriod == 0 {
		gracePeriod = 24 * time.Hour
	}

	rawKey, keyHash, keyPrefix := generateAPIKey(oldKey.Type)

	newKey, err := h.store.RotateAPIKey(r.Context(), oldKeyID, oldKey.EnvID, name, keyHash, keyPrefix, gracePeriod)
	if err != nil {
		logger.Error("failed to rotate API key", "error", err, "old_key_id", oldKeyID)
		httputil.Error(w, http.StatusInternalServerError, "failed to rotate key")
		return
	}

	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &env.ProjectID, ActorID: &userID, ActorType: "user",
		Action: "apikey.rotated", ResourceType: "api_key", ResourceID: &newKey.ID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	graceMinutes := req.GraceMinutes
	if graceMinutes == 0 {
		graceMinutes = 1440
	}
	logger.Info("API key rotated", "old_key_id", oldKeyID, "new_key_id", newKey.ID, "grace_minutes", graceMinutes)
	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"key":     newKey,
		"raw_key": rawKey,
		"message": fmt.Sprintf("Old key will remain valid for %d minutes", graceMinutes),
	})
}

func (h *APIKeyHandler) List(w http.ResponseWriter, r *http.Request) {
	env, ok := verifyEnvironmentOwnership(h.store, r, w)
	if !ok {
		return
	}
	keys, err := h.store.ListAPIKeys(r.Context(), env.ID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list API keys")
		return
	}
	if keys == nil {
		keys = []domain.APIKey{}
	}
	all := dto.APIKeySliceFromDomain(keys)
	p := dto.ParsePagination(r)
	page, total := dto.Paginate(all, p)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(page, total, p.Limit, p.Offset))
}

func (h *APIKeyHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	keyID := chi.URLParam(r, "keyID")

	apiKey, err := h.store.GetAPIKeyByID(r.Context(), keyID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "API key not found")
		return
	}

	env, err := h.store.GetEnvironment(r.Context(), apiKey.EnvID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "API key not found")
		return
	}
	project, err := h.store.GetProject(r.Context(), env.ProjectID)
	if err != nil || project.OrgID != middleware.GetOrgID(r.Context()) {
		httputil.Error(w, http.StatusNotFound, "API key not found")
		return
	}

	if err := h.store.RevokeAPIKey(r.Context(), keyID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to revoke API key")
		return
	}

	actorID := middleware.GetUserID(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	meta, _ := json.Marshal(map[string]string{"key_prefix": apiKey.KeyPrefix})
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ProjectID:    &env.ProjectID,
		ActorID:      &actorID,
		ActorType:    "user",
		Action:       "api_key.revoked",
		ResourceType: "api_key",
		ResourceID:   &keyID,
		Metadata:     meta,
	})

	w.WriteHeader(http.StatusNoContent)
}
