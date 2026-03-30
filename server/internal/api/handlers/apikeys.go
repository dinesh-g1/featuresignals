package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store/postgres"
)

type APIKeyHandler struct {
	store *postgres.Store
}

func NewAPIKeyHandler(store *postgres.Store) *APIKeyHandler {
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

	h := sha256.Sum256([]byte(rawKey))
	keyHash := fmt.Sprintf("%x", h[:])

	return rawKey, keyHash, rawKey[:12]
}

type CreateAPIKeyRequest struct {
	Name string `json:"name"`
	Type string `json:"type"` // "server" or "client"
}

func (h *APIKeyHandler) Create(w http.ResponseWriter, r *http.Request) {
	envID := chi.URLParam(r, "envID")

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

	apiKey := &domain.APIKey{
		EnvID:     envID,
		KeyHash:   keyHash,
		KeyPrefix: keyPrefix,
		Name:      req.Name,
		Type:      keyType,
	}

	if err := h.store.CreateAPIKey(r.Context(), apiKey); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to create API key")
		return
	}

	// Return the full key only on creation — it's never shown again
	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"id":         apiKey.ID,
		"key":        rawKey,
		"key_prefix": apiKey.KeyPrefix,
		"name":       apiKey.Name,
		"type":       apiKey.Type,
		"env_id":     apiKey.EnvID,
		"created_at": apiKey.CreatedAt,
	})
}

func (h *APIKeyHandler) List(w http.ResponseWriter, r *http.Request) {
	envID := chi.URLParam(r, "envID")
	keys, err := h.store.ListAPIKeys(r.Context(), envID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list API keys")
		return
	}
	if keys == nil {
		keys = []domain.APIKey{}
	}
	httputil.JSON(w, http.StatusOK, keys)
}

func (h *APIKeyHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	keyID := chi.URLParam(r, "keyID")
	if err := h.store.RevokeAPIKey(r.Context(), keyID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to revoke API key")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
