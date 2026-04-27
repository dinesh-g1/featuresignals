package handlers

import (

	"log/slog"
	"net/http"
	"strings"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/go-chi/chi/v5"
)

// OpsRegionHandler serves region and cell assignment endpoints for the ops portal.
type OpsRegionHandler struct {
	store  domain.Store
	logger *slog.Logger
}

// NewOpsRegionHandler creates a new region handler.
func NewOpsRegionHandler(store domain.Store, logger *slog.Logger) *OpsRegionHandler {
	return &OpsRegionHandler{store: store, logger: logger}
}

// ListRegions handles GET /api/v1/ops/regions
func (h *OpsRegionHandler) ListRegions(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_region_list")

	// Get cell load info
	var regionStore domain.TenantRegionStore
	var ok bool
	if regionStore, ok = h.store.(domain.TenantRegionStore); !ok {
		// Fallback: return region info from domain
		regions := make([]domain.RegionLoadInfo, 0)
		for _, code := range domain.RegionCodes() {
			regions = append(regions, domain.RegionLoadInfo{
				Region: code,
				Name:   domain.Regions[code].Name,
			})
		}
		httputil.JSON(w, http.StatusOK, map[string]any{"regions": regions})
		return
	}

	loadInfo, err := regionStore.GetCellLoad(r.Context())
	if err != nil {
		log.Error("failed to get cell load", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Group cells by region
	regionMap := make(map[string]*domain.RegionLoadInfo)
	for _, code := range domain.RegionCodes() {
		info := domain.Regions[code]
		regionMap[code] = &domain.RegionLoadInfo{
			Region: code,
			Name:   info.Name,
			Cells:  []domain.CellLoadInfo{},
		}
	}

	for _, cl := range loadInfo {
		regCode := cl.CellID
		// Extract region code from cell (cells are named like "prod-fsn1-001" or "fsn1")
		if _, ok := regionMap[cl.CellID]; !ok {
			for code := range regionMap {
				if strings.Contains(cl.CellID, code) || strings.Contains(cl.Name, code) {
					regCode = code
					break
				}
			}
		}
		if rl, ok := regionMap[regCode]; ok {
			rl.Cells = append(rl.Cells, cl)
		}
	}

	// Calculate total metrics per region
	regions := make([]domain.RegionLoadInfo, 0, len(regionMap))
	for _, rl := range regionMap {
		var totalCPU, totalMem float64
		for _, c := range rl.Cells {
			totalCPU += c.CPUPercent
			totalMem += c.MemPercent
		}
		if len(rl.Cells) > 0 {
			rl.TotalCPU = totalCPU / float64(len(rl.Cells))
			rl.TotalMemory = totalMem / float64(len(rl.Cells))
		}
		regions = append(regions, *rl)
	}

	httputil.JSON(w, http.StatusOK, map[string]any{"regions": regions})
}

// ListCellsInRegion handles GET /api/v1/ops/regions/{region}/cells
func (h *OpsRegionHandler) ListCellsInRegion(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_region_cells")
	region := chi.URLParam(r, "region")
	if region == "" {
		httputil.Error(w, http.StatusBadRequest, "region is required")
		return
	}

	cells, err := h.store.ListCells(r.Context(), domain.CellFilter{Region: region, Limit: 100})
	if err != nil {
		log.Error("failed to list cells in region", "error", err, "region", region)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if cells == nil {
		cells = []*domain.Cell{}
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"cells":  cells,
		"region": region,
		"total":  len(cells),
	})
}