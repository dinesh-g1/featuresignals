package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type dataExportStore interface {
	domain.OrgReader
	domain.ProjectReader
	domain.EnvironmentReader
	domain.FlagReader
	domain.SegmentStore
	domain.OrgMemberStore
	domain.WebhookStore
	domain.AuditReader
}

type DataExportHandler struct {
	store dataExportStore
}

func NewDataExportHandler(store dataExportStore) *DataExportHandler {
	return &DataExportHandler{store: store}
}

type orgDataExport struct {
	ExportedAt   string                `json:"exported_at"`
	Organization *domain.Organization  `json:"organization"`
	Projects     []projectDataExport   `json:"projects"`
	Members      []memberExportEntry   `json:"members"`
	Webhooks     []webhookExportEntry  `json:"webhooks"`
	AuditSummary auditExportSummary    `json:"audit_summary"`
}

type projectDataExport struct {
	ID           string               `json:"id"`
	Name         string               `json:"name"`
	Environments []envExportEntry     `json:"environments"`
	Flags        []flagExportEntry    `json:"flags"`
	Segments     []segmentExportEntry `json:"segments"`
}

type envExportEntry struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Key  string `json:"key"`
}

type flagExportEntry struct {
	ID          string `json:"id"`
	Key         string `json:"key"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Description string `json:"description,omitempty"`
}

type segmentExportEntry struct {
	ID   string `json:"id"`
	Key  string `json:"key"`
	Name string `json:"name"`
}

type memberExportEntry struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type webhookExportEntry struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	URL    string `json:"url"`
	Active bool   `json:"active"`
}

type auditExportSummary struct {
	TotalEntries int    `json:"total_entries"`
	OldestEntry  string `json:"oldest_entry,omitempty"`
	NewestEntry  string `json:"newest_entry,omitempty"`
}

// Export streams the complete org data as a JSON download.
func (h *DataExportHandler) Export(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "data_export")
	orgID := middleware.GetOrgID(r.Context())

	org, err := h.store.GetOrganization(r.Context(), orgID)
	if err != nil {
		logger.Error("failed to get organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	export := orgDataExport{
		ExportedAt:   time.Now().UTC().Format(time.RFC3339),
		Organization: org,
	}

	projects, err := h.store.ListProjects(r.Context(), orgID, 10000, 0)
	if err != nil {
		logger.Error("failed to list projects for export", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	export.Projects = make([]projectDataExport, 0, len(projects))
	for _, p := range projects {
		pe := projectDataExport{
			ID:   p.ID,
			Name: p.Name,
		}

		envs, _ := h.store.ListEnvironments(r.Context(), p.ID, 10000, 0)
		pe.Environments = make([]envExportEntry, 0, len(envs))
		for _, e := range envs {
			pe.Environments = append(pe.Environments, envExportEntry{
				ID: e.ID, Name: e.Name, Key: e.Slug,
			})
		}

		flags, _ := h.store.ListFlags(r.Context(), p.ID, 10000, 0)
		pe.Flags = make([]flagExportEntry, 0, len(flags))
		for _, f := range flags {
			pe.Flags = append(pe.Flags, flagExportEntry{
				ID: f.ID, Key: f.Key, Name: f.Name,
				Type: string(f.FlagType), Description: f.Description,
			})
		}

		segs, _ := h.store.ListSegments(r.Context(), p.ID, 10000, 0)
		pe.Segments = make([]segmentExportEntry, 0, len(segs))
		for _, s := range segs {
			pe.Segments = append(pe.Segments, segmentExportEntry{
				ID: s.ID, Key: s.Key, Name: s.Name,
			})
		}

		export.Projects = append(export.Projects, pe)
	}

	members, _ := h.store.ListOrgMembers(r.Context(), orgID, 10000, 0)
	export.Members = make([]memberExportEntry, 0, len(members))
	for _, m := range members {
		export.Members = append(export.Members, memberExportEntry{
			UserID: m.UserID, Role: string(m.Role),
		})
	}

	webhooks, _ := h.store.ListWebhooks(r.Context(), orgID, 10000, 0)
	export.Webhooks = make([]webhookExportEntry, 0, len(webhooks))
	for _, wh := range webhooks {
		export.Webhooks = append(export.Webhooks, webhookExportEntry{
			ID: wh.ID, Name: wh.Name, URL: wh.URL, Active: wh.Enabled,
		})
	}

	entries, _ := h.store.ListAuditEntries(r.Context(), orgID, 1, 0)
	export.AuditSummary.TotalEntries = len(entries)
	if len(entries) > 0 {
		export.AuditSummary.NewestEntry = entries[0].CreatedAt.UTC().Format(time.RFC3339)
		export.AuditSummary.OldestEntry = entries[len(entries)-1].CreatedAt.UTC().Format(time.RFC3339)
	}

	actorID := middleware.GetUserID(r.Context())
	h.auditExportAction(r, orgID, actorID)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=featuresignals-export.json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(export)
}

func (h *DataExportHandler) auditExportAction(r *http.Request, orgID, actorID string) {
	type auditStore interface {
		domain.AuditWriter
	}
	if as, ok := h.store.(auditStore); ok {
		as.CreateAuditEntry(r.Context(), &domain.AuditEntry{
			OrgID: orgID, ActorID: &actorID, ActorType: "user",
			Action: "data.exported", ResourceType: "organization", ResourceID: &orgID,
			IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
		})
	}
}
