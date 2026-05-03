package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// ─── GET /v1/billing/credits ──────────────────────────────────────────────

// GetCredits returns all cost bearers with the org's current balance,
// included monthly units, and available credit packs.
func (h *BillingHandler) GetCredits(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	bearers, err := h.store.ListCostBearers(r.Context())
	if err != nil {
		log.Error("failed to list cost bearers", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load credit information")
		return
	}

	type packJSON struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		Credits      int    `json:"credits"`
		PricePaise   int64  `json:"price_paise"`
		PriceDisplay string `json:"price_display"`
	}

	type bearerJSON struct {
		ID               string      `json:"id"`
		DisplayName      string      `json:"display_name"`
		Description      string      `json:"description"`
		UnitName         string      `json:"unit_name"`
		Balance          int         `json:"balance"`
		IncludedPerMonth int         `json:"included_per_month"`
		LifetimeUsed     int         `json:"lifetime_used"`
		AvailablePacks   []packJSON  `json:"available_packs"`
	}

	org, err := h.store.GetOrganization(r.Context(), orgID)
	if err != nil {
		log.Error("failed to get organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load organization")
		return
	}

	result := make([]bearerJSON, 0, len(bearers))
	for _, b := range bearers {
		bal, _ := h.store.GetCreditBalance(r.Context(), orgID, b.ID)
		packs, _ := h.store.ListCreditPacks(r.Context(), b.ID)

		included := b.FreeUnits
		if org.Plan == domain.PlanPro {
			included = b.ProUnits
		} else if org.Plan == domain.PlanEnterprise {
			included = 10000
		}

		bj := bearerJSON{
			ID:               b.ID,
			DisplayName:      b.DisplayName,
			Description:      b.Description,
			UnitName:         b.UnitName,
			IncludedPerMonth: included,
			AvailablePacks:   make([]packJSON, 0, len(packs)),
		}
		if bal != nil {
			bj.Balance = bal.Balance
			bj.LifetimeUsed = bal.LifetimeUsed
		}

		for _, p := range packs {
			bj.AvailablePacks = append(bj.AvailablePacks, packJSON{
				ID:           p.ID,
				Name:         p.Name,
				Credits:      p.Credits,
				PricePaise:   p.PricePaise,
				PriceDisplay: formatPaiseDisplay(p.PricePaise),
			})
		}
		result = append(result, bj)
	}

	httputil.JSON(w, http.StatusOK, map[string]any{"bearers": result})
}

// ─── POST /v1/billing/credits/purchase ────────────────────────────────────

// PurchaseCredits buys a credit pack for the current org.
func (h *BillingHandler) PurchaseCredits(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var req struct {
		PackID string `json:"pack_id"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body: pack_id is required")
		return
	}
	if req.PackID == "" {
		httputil.Error(w, http.StatusBadRequest, "pack_id is required")
		return
	}

	purchase, err := h.store.PurchaseCredits(r.Context(), orgID, req.PackID)
	if err != nil {
		if errors.Is(err, domain.ErrInvalidCreditPack) {
			httputil.Error(w, http.StatusBadRequest, "invalid or inactive credit pack")
			return
		}
		log.Error("failed to purchase credits", "error", err, "org_id", orgID, "pack_id", req.PackID)
		httputil.Error(w, http.StatusInternalServerError, "failed to process purchase")
		return
	}

	// Get updated balance.
	bal, _ := h.store.GetCreditBalance(r.Context(), orgID, purchase.BearerID)
	newBalance := 0
	if bal != nil {
		newBalance = bal.Balance
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"purchase": map[string]any{
			"id":           purchase.ID,
			"pack_id":      purchase.PackID,
			"bearer_id":    purchase.BearerID,
			"credits":      purchase.Credits,
			"price_paise":  purchase.PricePaise,
			"price_display": formatPaiseDisplay(purchase.PricePaise),
		},
		"new_balance": newBalance,
	})
}

// ─── GET /v1/billing/credits/history ──────────────────────────────────────

// GetCreditHistory returns credit purchase and consumption history for the org.
func (h *BillingHandler) GetCreditHistory(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	bearerID := r.URL.Query().Get("bearer_id")
	limit, offset := parsePagination(r, 50, 100)

	type purchaseJSON struct {
		ID           string `json:"id"`
		PackID       string `json:"pack_id"`
		BearerID     string `json:"bearer_id"`
		Credits      int    `json:"credits"`
		PricePaise   int64  `json:"price_paise"`
		PriceDisplay string `json:"price_display"`
		PurchasedAt  string `json:"purchased_at"`
	}

	type consumptionJSON struct {
		ID             string `json:"id"`
		BearerID       string `json:"bearer_id"`
		Operation      string `json:"operation"`
		Credits        int    `json:"credits"`
		IdempotencyKey string `json:"idempotency_key,omitempty"`
		ConsumedAt     string `json:"consumed_at"`
	}

	purchases, err := h.store.ListCreditPurchases(r.Context(), orgID, limit, offset)
	if err != nil {
		log.Error("failed to list purchases", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load purchase history")
		return
	}

	consumptions, err := h.store.ListCreditConsumptions(r.Context(), orgID, bearerID, limit, offset)
	if err != nil {
		log.Error("failed to list consumptions", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load consumption history")
		return
	}

	pJSON := make([]purchaseJSON, 0, len(purchases))
	for _, p := range purchases {
		pJSON = append(pJSON, purchaseJSON{
			ID:           p.ID,
			PackID:       p.PackID,
			BearerID:     p.BearerID,
			Credits:      p.Credits,
			PricePaise:   p.PricePaise,
			PriceDisplay: formatPaiseDisplay(p.PricePaise),
			PurchasedAt:  p.PurchasedAt.Format(time.RFC3339),
		})
	}

	cJSON := make([]consumptionJSON, 0, len(consumptions))
	for _, c := range consumptions {
		cj := consumptionJSON{
			ID:         c.ID,
			BearerID:   c.BearerID,
			Operation:  c.Operation,
			Credits:    c.Credits,
			ConsumedAt: c.ConsumedAt.Format(time.RFC3339),
		}
		if c.IdempotencyKey != "" {
			cj.IdempotencyKey = c.IdempotencyKey
		}
		cJSON = append(cJSON, cj)
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"purchases":    pJSON,
		"consumptions": cJSON,
	})
}

// ─── GET /v1/billing/credits/balance ──────────────────────────────────────

// GetCreditBalance returns the credit balance summary for the current org.
// Lighter than GetCredits — just balance numbers, no pack listings.
func (h *BillingHandler) GetCreditBalance(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	balances, err := h.store.ListCreditBalances(r.Context(), orgID)
	if err != nil {
		log.Error("failed to list credit balances", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load credit balances")
		return
	}

	type balanceJSON struct {
		BearerID   string `json:"bearer_id"`
		Balance    int    `json:"balance"`
		LifetimeUsed int  `json:"lifetime_used"`
	}

	result := make([]balanceJSON, 0, len(balances))
	for _, b := range balances {
		result = append(result, balanceJSON{
			BearerID:     b.BearerID,
			Balance:      b.Balance,
			LifetimeUsed: b.LifetimeUsed,
		})
	}

	httputil.JSON(w, http.StatusOK, map[string]any{"balances": result})
}

// ─── Helpers ──────────────────────────────────────────────────────────────

func formatPaiseDisplay(paise int64) string {
	rupees := paise / 100
	paisePart := paise % 100
	return fmt.Sprintf("INR %d.%02d", rupees, paisePart)
}

func parsePagination(r *http.Request, defaultLimit, maxLimit int) (int, int) {
	limit := defaultLimit
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
			if limit > maxLimit {
				limit = maxLimit
			}
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed > 0 {
			offset = parsed
		}
	}
	return limit, offset
}

