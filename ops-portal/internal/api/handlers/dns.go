package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/featuresignals/ops-portal/internal/cloudflare"
	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/go-chi/chi/v5"
)

// DNSHandler handles HTTP requests for DNS record management via Cloudflare.
type DNSHandler struct {
	cloudflareClient *cloudflare.Client
	clusterStore     domain.ClusterStore
	audit            domain.AuditStore
	logger           *slog.Logger
}

// NewDNSHandler creates a new DNSHandler.
func NewDNSHandler(cloudflareClient *cloudflare.Client, clusterStore domain.ClusterStore, audit domain.AuditStore, logger *slog.Logger) *DNSHandler {
	return &DNSHandler{
		cloudflareClient: cloudflareClient,
		clusterStore:     clusterStore,
		audit:            audit,
		logger:           logger.With("handler", "dns"),
	}
}

// GET /api/v1/dns/records
func (h *DNSHandler) List(w http.ResponseWriter, r *http.Request) {
	records, err := h.cloudflareClient.ListDNSRecords(r.Context())
	if err != nil {
		if errors.Is(err, cloudflare.ErrNotConfigured) {
			httputil.Error(w, http.StatusNotImplemented, "Cloudflare is not configured. Set CLOUDFLARE_TOKEN and CLOUDFLARE_ZONE_ID to enable DNS management.")
			return
		}
		h.logger.Error("failed to list DNS records", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to fetch DNS records")
		return
	}

	if records == nil {
		records = []cloudflare.DNSRecord{}
	}

	httputil.JSON(w, http.StatusOK, records)
}

// POST /api/v1/dns/records
func (h *DNSHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type    string `json:"type"`
		Name    string `json:"name"`
		Content string `json:"content"`
		TTL     int    `json:"ttl"`
		Proxied bool   `json:"proxied"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.Content == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "name and content are required")
		return
	}
	if req.TTL == 0 {
		req.TTL = 300
	}

	record, err := h.cloudflareClient.CreateDNSRecord(r.Context(), req.Type, req.Name, req.Content, req.TTL, req.Proxied)
	if err != nil {
		h.logger.Error("failed to create DNS record", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create DNS record")
		return
	}

	h.audit.Append(r.Context(), &domain.AuditEntry{
		UserID:     "",
		Action:     "dns.create",
		TargetType: "dns",
		TargetID:   record.ID,
		Details:    `{"name":"` + req.Name + `","type":"` + req.Type + `"}`,
		IP:         r.RemoteAddr,
	})

	httputil.JSON(w, http.StatusCreated, record)
}

// PUT /api/v1/dns/records/{id}
func (h *DNSHandler) Update(w http.ResponseWriter, r *http.Request) {
	recordID := chi.URLParam(r, "id")

	var req struct {
		Type    string `json:"type"`
		Name    string `json:"name"`
		Content string `json:"content"`
		TTL     int    `json:"ttl"`
		Proxied bool   `json:"proxied"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.cloudflareClient.UpdateDNSRecord(r.Context(), recordID, req.Type, req.Name, req.Content, req.TTL, req.Proxied); err != nil {
		h.logger.Error("failed to update DNS record", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to update DNS record")
		return
	}

	h.audit.Append(r.Context(), &domain.AuditEntry{
		UserID:     "",
		Action:     "dns.update",
		TargetType: "dns",
		TargetID:   recordID,
		Details:    `{"name":"` + req.Name + `","type":"` + req.Type + `"}`,
		IP:         r.RemoteAddr,
	})

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// POST /api/v1/dns/sync
func (h *DNSHandler) Sync(w http.ResponseWriter, r *http.Request) {
	// List all DNS records
	records, err := h.cloudflareClient.ListDNSRecords(r.Context())
	if err != nil {
		h.logger.Error("failed to list DNS records for sync", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to sync DNS records")
		return
	}

	// Build lookup of existing A records
	existing := make(map[string]cloudflare.DNSRecord)
	for _, rec := range records {
		if rec.Type == "A" {
			key := strings.TrimSuffix(rec.Name, ".featuresignals.com")
			existing[key] = rec
		}
	}

	// List all non-decommissioned clusters
	clusters, err := h.clusterStore.List()
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list clusters")
		return
	}

	created := 0
	updated := 0
	deleted := 0

	// For each cluster, ensure A record exists
	for _, c := range clusters {
		if c.Status == "decommissioned" {
			continue
		}
		recordName := c.Name + ".api.featuresignals.com"
		if existingRecord, ok := existing[recordName]; ok {
			if existingRecord.Content != c.PublicIP {
				h.cloudflareClient.UpdateDNSRecord(r.Context(), existingRecord.ID, "A", recordName, c.PublicIP, 300, false)
				updated++
			}
			delete(existing, recordName)
		} else {
			h.cloudflareClient.CreateDNSRecord(r.Context(), "A", recordName, c.PublicIP, 300, false)
			created++
		}
	}

	// Delete orphaned records
	for _, rec := range existing {
		h.cloudflareClient.DeleteDNSRecord(r.Context(), rec.ID)
		deleted++
	}

	h.audit.Append(r.Context(), &domain.AuditEntry{
		UserID:     "",
		Action:     "dns.sync",
		TargetType: "dns",
		Details:    `{"created":` + string(rune('0'+created)) + `,"updated":` + string(rune('0'+updated)) + `,"deleted":` + string(rune('0'+deleted)) + `}`,
		IP:         r.RemoteAddr,
	})

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"created": created,
		"updated": updated,
		"deleted": deleted,
	})
}