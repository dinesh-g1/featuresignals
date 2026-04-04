package handlers

import (
	"net/http"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type SalesHandler struct {
	store domain.Store
}

func NewSalesHandler(store domain.Store) *SalesHandler {
	return &SalesHandler{store: store}
}

type salesInquiryRequest struct {
	ContactName string `json:"contact_name"`
	Email       string `json:"email"`
	Company     string `json:"company"`
	TeamSize    string `json:"team_size,omitempty"`
	Message     string `json:"message,omitempty"`
}

// SubmitInquiry captures an Enterprise plan inquiry ("Contact Sales").
func (h *SalesHandler) SubmitInquiry(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req salesInquiryRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ContactName == "" || req.Email == "" || req.Company == "" {
		httputil.Error(w, http.StatusBadRequest, "contact_name, email, and company are required")
		return
	}
	if !validateEmail(req.Email) {
		httputil.Error(w, http.StatusBadRequest, "invalid email format")
		return
	}
	if !validateStringLength(req.ContactName, 255) || !validateStringLength(req.Company, 255) {
		httputil.Error(w, http.StatusBadRequest, "contact_name and company must be at most 255 characters")
		return
	}
	if req.Message != "" && !validateStringLength(req.Message, 2000) {
		httputil.Error(w, http.StatusBadRequest, "message must be at most 2000 characters")
		return
	}

	inq := &domain.SalesInquiry{
		ContactName: req.ContactName,
		Email:       req.Email,
		Company:     req.Company,
		TeamSize:    req.TeamSize,
		Message:     req.Message,
	}

	if err := h.store.CreateSalesInquiry(r.Context(), inq); err != nil {
		log.Error("failed to store sales inquiry", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to submit inquiry")
		return
	}

	log.Info("sales inquiry received", "email", req.Email, "company", req.Company)
	httputil.JSON(w, http.StatusCreated, map[string]string{
		"message": "Thank you for your interest! Our team will reach out within 24 hours.",
	})
}
