package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// SalesNotifier sends a single notification email (ISP — narrower than domain.Mailer).
type SalesNotifier interface {
	Send(ctx context.Context, msg domain.EmailMessage) error
}

type SalesHandler struct {
	store    domain.SalesStore
	notifier SalesNotifier
	notifyTo string
}

func NewSalesHandler(store domain.SalesStore, notifier SalesNotifier, notifyTo string) *SalesHandler {
	return &SalesHandler{store: store, notifier: notifier, notifyTo: notifyTo}
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

	if h.notifier != nil && h.notifyTo != "" {
		teamSize := req.TeamSize
		if teamSize == "" {
			teamSize = "Not specified"
		}
		msg := req.Message
		if msg == "" {
			msg = "(no message)"
		}
		go func() {
			sendCtx, sendCancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer sendCancel()
			if err := h.notifier.Send(sendCtx, domain.EmailMessage{
				To:       h.notifyTo,
				Subject:  fmt.Sprintf("New Sales Inquiry from %s (%s)", req.ContactName, req.Company),
				Template: domain.TemplateEnterpriseAck,
				Data: map[string]string{
					"ContactName": req.ContactName,
					"Email":       req.Email,
					"Company":     req.Company,
					"TeamSize":    teamSize,
					"Message":     msg,
				},
			}); err != nil {
				log.Error("failed to send sales inquiry notification", "error", err, "to", h.notifyTo)
			}
		}()
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{
		"message": "Thank you for your interest! Our team will reach out within 24 hours.",
	})
}
