package handlers

import (
	"net"
	"net/http"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type ipAllowlistStore interface {
	domain.IPAllowlistStore
	domain.AuditWriter
}

type IPAllowlistHandler struct {
	store ipAllowlistStore
}

func NewIPAllowlistHandler(store ipAllowlistStore) *IPAllowlistHandler {
	return &IPAllowlistHandler{store: store}
}

func (h *IPAllowlistHandler) Get(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	enabled, cidrs, err := h.store.GetIPAllowlist(r.Context(), orgID)
	if err != nil {
		httputil.JSON(w, http.StatusOK, dto.IPAllowlistResponse{Enabled: false, CIDRRanges: []string{}})
		return
	}
	if cidrs == nil {
		cidrs = []string{}
	}
	httputil.JSON(w, http.StatusOK, dto.IPAllowlistResponse{Enabled: enabled, CIDRRanges: cidrs})
}

type ipAllowlistRequest struct {
	Enabled    bool     `json:"enabled"`
	CIDRRanges []string `json:"cidr_ranges"`
}

func (h *IPAllowlistHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "ip_allowlist")
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	var req ipAllowlistRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	for _, cidr := range req.CIDRRanges {
		if _, _, err := net.ParseCIDR(cidr); err != nil {
			httputil.Error(w, http.StatusBadRequest, "invalid CIDR: "+cidr)
			return
		}
	}

	if err := h.store.UpsertIPAllowlist(r.Context(), orgID, req.Enabled, req.CIDRRanges); err != nil {
		logger.Error("failed to upsert IP allowlist", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to update IP allowlist")
		return
	}

	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &userID, ActorType: "user",
		Action: "ip_allowlist.updated", ResourceType: "ip_allowlist", ResourceID: &orgID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	logger.Info("IP allowlist updated", "org_id", orgID, "enabled", req.Enabled, "cidrs", len(req.CIDRRanges))
	httputil.JSON(w, http.StatusOK, dto.IPAllowlistResponse{Enabled: req.Enabled, CIDRRanges: req.CIDRRanges})
}
