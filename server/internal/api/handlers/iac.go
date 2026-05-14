package handlers

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/integrations/iac"
)

// ─── Request Types ──────────────────────────────────────────────────────────

// GenerateRequest requests IaC config generation from current resources.
type GenerateRequest struct {
	Format         string `json:"format"`          // "terraform", "pulumi", "ansible", "all"
	IncludeFlags   bool   `json:"include_flags"`
	IncludeEnvs    bool   `json:"include_environments"`
	IncludeSegments bool  `json:"include_segments"`
	IncludeWebhooks bool  `json:"include_webhooks"`
	IncludeAPIKeys bool    `json:"include_api_keys"`
	Namespace      string `json:"namespace,omitempty"`
}

// PreviewRequest requests a preview of what generated configs would look like.
type PreviewRequest struct {
	Format string `json:"format"`
}

// ─── Response Types ─────────────────────────────────────────────────────────

// GenerateResponse returns generated IaC files.
type GenerateResponse struct {
	Files  []iac.GeneratedFile `json:"files"`
	Format string              `json:"format"`
	Count  int                 `json:"count"`
}

// IaCProviderInfo describes a registered IaC provider.
type IaCProviderInfo struct {
	Name          string `json:"name"`
	FileExtension string `json:"file_extension"`
	Status        string `json:"status"`
	DocsURL       string `json:"docs_url,omitempty"`
	Version       string `json:"version,omitempty"`
}

// IaCProvidersResponse returns all registered IaC providers.
type IaCProvidersResponse struct {
	Providers []IaCProviderInfo `json:"providers"`
}

// PreviewResponse returns a preview of the file tree.
type PreviewResponse struct {
	FileTree []FileTreeEntry `json:"file_tree"`
	Format   string          `json:"format"`
}

// FileTreeEntry represents a file in the preview tree.
type FileTreeEntry struct {
	Path  string `json:"path"`
	Size  int    `json:"size"`
	Lines int    `json:"lines"`
}

// ─── Store Interface ────────────────────────────────────────────────────────

// IaCStore defines the narrowest interface for IaC generation operations.
type IaCStore interface {
	GetProject(ctx context.Context, id string) (*domain.Project, error)
	GetProjects(ctx context.Context, orgID string) ([]domain.Project, error)
	GetEnvironments(ctx context.Context, projectID string) ([]domain.Environment, error)
	GetFlags(ctx context.Context, projectID string) ([]domain.Flag, error)
	GetSegments(ctx context.Context, projectID string) ([]domain.Segment, error)
	GetWebhooks(ctx context.Context, orgID string) ([]domain.Webhook, error)
	GetAPIKeys(ctx context.Context, envID string) ([]domain.APIKey, error)
}

// ─── Handler ────────────────────────────────────────────────────────────────

// IaCHandler handles Infrastructure-as-Code generation and management.
type IaCHandler struct {
	store  IaCStore
	logger *slog.Logger
}

// NewIaCHandler creates a new IaCHandler.
func NewIaCHandler(store IaCStore, logger *slog.Logger) *IaCHandler {
	return &IaCHandler{
		store:  store,
		logger: logger.With("handler", "iac"),
	}
}

// ListProviders returns all registered IaC providers.
func (h *IaCHandler) ListProviders(w http.ResponseWriter, r *http.Request) {
	names := iac.ListGenerators()
	providers := make([]IaCProviderInfo, 0, len(names))

	for _, name := range names {
		gen, err := iac.NewGenerator(name)
		if err != nil {
			h.logger.Warn("failed to create generator for listing", "provider", name, "error", err)
			continue
		}
		providers = append(providers, IaCProviderInfo{
			Name:          gen.Name(),
			FileExtension: gen.FileExtension(),
			Status:        "active",
			DocsURL:       "https://featuresignals.com/docs/iac/" + name,
			Version:       "1.0.0",
		})
	}

	httputil.JSON(w, http.StatusOK, IaCProvidersResponse{Providers: providers})
}

// Generate creates IaC config files from the current FeatureSignals resources.
func (h *IaCHandler) Generate(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("request_id", r.Context().Value("requestID"))
	orgID := middleware.GetOrgID(r.Context())

	var req GenerateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.Format == "" {
		httputil.Error(w, http.StatusBadRequest, "Generation blocked — the format field is missing. Specify the IaC format (e.g., terraform, pulumi).")
		return
	}

	gen, err := iac.NewGenerator(req.Format)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "unsupported format: "+req.Format)
		return
	}

	// Fetch resources and build the resource model
	model := iac.ResourceModel{
		Provider: req.Format,
	}

	projects, err := h.store.GetProjects(r.Context(), orgID)
	if err != nil {
		logger.Error("Project fetch failed — an unexpected error occurred on the server. Try again or contact support.", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Project fetch failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	for _, p := range projects {
		projectRes := iac.ProjectResource{
			Name: p.Name,
			Slug: p.Slug,
		}
		model.Projects = append(model.Projects, projectRes)

		if req.IncludeEnvs {
			envs, err := h.store.GetEnvironments(r.Context(), p.ID)
			if err != nil {
				logger.Error("failed to fetch environments", "project_id", p.ID, "error", err)
				continue
			}
			for _, e := range envs {
				model.Environments = append(model.Environments, iac.EnvironmentResource{
					ProjectSlug: p.Slug,
					Name:        e.Name,
					Slug:        e.Slug,
					Color:       e.Color,
				})
			}
		}

		if req.IncludeFlags {
			flags, err := h.store.GetFlags(r.Context(), p.ID)
			if err != nil {
				logger.Error("failed to fetch flags", "project_id", p.ID, "error", err)
				continue
			}
			for _, f := range flags {
				flagRes := iac.FlagResource{
					ProjectSlug:  p.Slug,
					Key:          f.Key,
					Name:         f.Name,
					FlagType:     string(f.FlagType),
					DefaultValue: string(f.DefaultValue),
					Environments: make([]iac.FlagEnvironment, 0),
				}
				model.Flags = append(model.Flags, flagRes)
			}
		}

		if req.IncludeSegments {
			segs, err := h.store.GetSegments(r.Context(), p.ID)
			if err != nil {
				logger.Error("failed to fetch segments", "project_id", p.ID, "error", err)
				continue
			}
			for _, s := range segs {
				segRes := iac.SegmentResource{
					ProjectSlug: p.Slug,
					Key:         s.Key,
					Name:        s.Name,
					MatchType:   string(s.MatchType),
				}
				for _, c := range s.Rules {
					segRes.Rules = append(segRes.Rules, iac.SegmentCondition{
						Attribute: c.Attribute,
						Operator:  string(c.Operator),
						Values:    c.Values,
					})
				}
				model.Segments = append(model.Segments, segRes)
			}
		}
	}

	// Include webhooks if requested (separate from project loop since webhooks are org-scoped)
	if req.IncludeWebhooks {
		webhooks, err := h.store.GetWebhooks(r.Context(), orgID)
		if err == nil {
			for _, w := range webhooks {
				wh := iac.WebhookResource{
					Name:    w.Name,
					URL:     w.URL,
					Enabled: w.Enabled,
				}
				if w.Events != nil {
					wh.EventTypes = w.Events
				}
				model.Webhooks = append(model.Webhooks, wh)
			}
		} else {
			logger.Warn("failed to fetch webhooks", "error", err)
		}
	}

	// Generate the config files
	files, err := gen.Generate(r.Context(), model)
	if err != nil {
		logger.Error("failed to generate IaC configs", "format", req.Format, "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Configuration generation failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Info("IaC configs generated",
		"format", req.Format,
		"files", len(files),
		"projects", len(model.Projects),
		"flags", len(model.Flags),
	)

	httputil.JSON(w, http.StatusOK, GenerateResponse{
		Files:  files,
		Format: req.Format,
		Count:  len(files),
	})
}

// Preview shows what generated configs would look like without full content.
func (h *IaCHandler) Preview(w http.ResponseWriter, r *http.Request) {
	var req PreviewRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.Format == "" {
		httputil.Error(w, http.StatusBadRequest, "Generation blocked — the format field is missing. Specify the IaC format (e.g., terraform, pulumi).")
		return
	}

	gen, err := iac.NewGenerator(req.Format)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "unsupported format: "+req.Format)
		return
	}

	// Create an empty resource model for preview
	model := iac.ResourceModel{Provider: req.Format}

	files, err := gen.Generate(r.Context(), model)
	if err != nil {
		h.logger.Error("failed to preview IaC configs", "format", req.Format, "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Configuration preview failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	tree := make([]FileTreeEntry, 0, len(files))
	for _, f := range files {
		lines := 0
		for _, b := range f.Content {
			if b == '\n' {
				lines++
			}
		}
		tree = append(tree, FileTreeEntry{
			Path:  f.Path,
			Size:  len(f.Content),
			Lines: lines,
		})
	}

	httputil.JSON(w, http.StatusOK, PreviewResponse{
		FileTree: tree,
		Format:   req.Format,
	})
}

