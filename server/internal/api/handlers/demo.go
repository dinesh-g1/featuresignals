package handlers

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand"
	"net/http"
	"time"
	"unicode"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type DemoHandler struct {
	store  domain.Store
	jwtMgr auth.TokenManager
	logger *slog.Logger
}

func NewDemoHandler(store domain.Store, jwtMgr auth.TokenManager, logger *slog.Logger) *DemoHandler {
	return &DemoHandler{store: store, jwtMgr: jwtMgr, logger: logger}
}

func (h *DemoHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	ctx := r.Context()

	demoEmail := fmt.Sprintf("demo-%s@demo.featuresignals.com", randomHex(8))
	demoPass := randomHex(16)
	passHash, err := auth.HashPassword(demoPass)
	if err != nil {
		log.Error("failed to hash demo password", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	user := &domain.User{
		Email:        demoEmail,
		PasswordHash: passHash,
		Name:         "Demo User",
		IsDemo:       true,
	}
	if err := h.store.CreateUser(ctx, user); err != nil {
		log.Error("failed to create demo user", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create demo session")
		return
	}

	demoExpires := time.Now().Add(7 * 24 * time.Hour)
	org := &domain.Organization{
		Name:          "Demo Organization",
		Slug:          "demo-" + randomHex(6),
		IsDemo:        true,
		DemoExpiresAt: &demoExpires,
	}
	if err := h.store.CreateOrganization(ctx, org); err != nil {
		log.Error("failed to create demo org", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create demo session")
		return
	}

	member := &domain.OrgMember{OrgID: org.ID, UserID: user.ID, Role: domain.RoleOwner}
	if err := h.store.AddOrgMember(ctx, member); err != nil {
		log.Error("failed to add demo org member", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create demo session")
		return
	}

	project := &domain.Project{OrgID: org.ID, Name: "Sample App", Slug: "sample-app"}
	if err := h.store.CreateProject(ctx, project); err != nil {
		log.Error("failed to create demo project", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create demo session")
		return
	}

	envDefs := []struct{ name, slug, color string }{
		{"Development", "development", "#22C55E"},
		{"Staging", "staging", "#EAB308"},
		{"Production", "production", "#EF4444"},
	}
	envs := make(map[string]*domain.Environment)
	for _, e := range envDefs {
		env := &domain.Environment{ProjectID: project.ID, Name: e.name, Slug: e.slug, Color: e.color}
		if err := h.store.CreateEnvironment(ctx, env); err != nil {
			log.Error("failed to create demo env", "error", err, "env", e.name)
			continue
		}
		envs[e.slug] = env
	}

	h.seedSampleFlags(ctx, project, envs, log)
	h.seedSampleSegment(ctx, project, envs, log)
	h.seedAPIKeys(ctx, envs, log)

	tokens, err := h.jwtMgr.GenerateDemoTokenPair(user.ID, org.ID, string(domain.RoleOwner), demoExpires.Unix())
	if err != nil {
		log.Error("failed to generate demo tokens", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create demo session")
		return
	}

	log.Info("demo session created", "user_id", user.ID, "org_id", org.ID, "expires", demoExpires)

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"user":           user,
		"organization":   org,
		"tokens":         tokens,
		"demo_expires_at": demoExpires.Unix(),
	})
}

type demoFlagState struct {
	enabled           bool
	percentageRollout int
	defaultValue      json.RawMessage
	variants          []domain.Variant
}

func (h *DemoHandler) seedSampleFlags(ctx context.Context, project *domain.Project, envs map[string]*domain.Environment, log *slog.Logger) {
	flags := []struct {
		key, name, desc string
		flagType        domain.FlagType
		defaultValue    json.RawMessage
		states          map[string]demoFlagState
	}{
		{
			key: "dark-mode", name: "Dark Mode", desc: "Toggle dark mode UI theme",
			flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage(`false`),
			states: map[string]demoFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`true`)},
				"staging":     {enabled: true, defaultValue: json.RawMessage(`true`)},
				"production":  {enabled: false, defaultValue: json.RawMessage(`false`)},
			},
		},
		{
			key: "new-checkout-flow", name: "New Checkout Flow", desc: "Redesigned checkout experience",
			flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage(`false`),
			states: map[string]demoFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`true`)},
				"staging":     {enabled: true, percentageRollout: 5000, defaultValue: json.RawMessage(`true`)},
				"production":  {enabled: false, defaultValue: json.RawMessage(`false`)},
			},
		},
		{
			key: "pricing-experiment", name: "Pricing Experiment", desc: "A/B test for pricing page variants",
			flagType: domain.FlagTypeString, defaultValue: json.RawMessage(`"control"`),
			states: map[string]demoFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`"control"`)},
				"staging": {enabled: true, defaultValue: json.RawMessage(`"control"`), variants: []domain.Variant{
					{Key: "control", Value: json.RawMessage(`"control"`), Weight: 3000},
					{Key: "variant-a", Value: json.RawMessage(`"variant-a"`), Weight: 4000},
					{Key: "variant-b", Value: json.RawMessage(`"variant-b"`), Weight: 3000},
				}},
				"production": {enabled: true, defaultValue: json.RawMessage(`"control"`)},
			},
		},
		{
			key: "api-rate-limit", name: "API Rate Limit", desc: "Per-user API rate limit value",
			flagType: domain.FlagTypeNumber, defaultValue: json.RawMessage(`100`),
			states: map[string]demoFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`1000`)},
				"staging":     {enabled: true, defaultValue: json.RawMessage(`500`)},
				"production":  {enabled: true, defaultValue: json.RawMessage(`100`)},
			},
		},
		{
			key: "maintenance-mode", name: "Maintenance Mode", desc: "Kill switch to put app in maintenance mode",
			flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage(`false`),
			states: map[string]demoFlagState{
				"development": {enabled: false, defaultValue: json.RawMessage(`false`)},
				"staging":     {enabled: false, defaultValue: json.RawMessage(`false`)},
				"production":  {enabled: false, defaultValue: json.RawMessage(`false`)},
			},
		},
		{
			key: "beta-features", name: "Beta Features", desc: "Feature gate for beta users segment",
			flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage(`false`),
			states: map[string]demoFlagState{
				"development": {enabled: true, defaultValue: json.RawMessage(`true`)},
				"staging":     {enabled: false, defaultValue: json.RawMessage(`false`)},
				"production":  {enabled: false, defaultValue: json.RawMessage(`false`)},
			},
		},
	}

	for _, fd := range flags {
		flag := &domain.Flag{
			ProjectID:    project.ID,
			Key:          fd.key,
			Name:         fd.name,
			Description:  fd.desc,
			FlagType:     fd.flagType,
			DefaultValue: fd.defaultValue,
		}
		if err := h.store.CreateFlag(ctx, flag); err != nil {
			log.Error("failed to create demo flag", "error", err, "key", fd.key)
			continue
		}
		for envSlug, sd := range fd.states {
			env, ok := envs[envSlug]
			if !ok {
				continue
			}
			fs := &domain.FlagState{
				FlagID:            flag.ID,
				EnvID:             env.ID,
				Enabled:           sd.enabled,
				DefaultValue:      sd.defaultValue,
				PercentageRollout: sd.percentageRollout,
				Variants:          sd.variants,
			}
			if err := h.store.UpsertFlagState(ctx, fs); err != nil {
				log.Error("failed to create demo flag state", "error", err, "flag", fd.key, "env", envSlug)
			}
		}
	}
}

func (h *DemoHandler) seedSampleSegment(ctx context.Context, project *domain.Project, envs map[string]*domain.Environment, log *slog.Logger) {
	seg := &domain.Segment{
		ProjectID:   project.ID,
		Key:         "beta-users",
		Name:        "Beta Users",
		Description: "Users with @company.com email addresses",
		MatchType:   domain.MatchAll,
		Rules: []domain.Condition{
			{Attribute: "email", Operator: domain.OpEndsWith, Values: []string{"@company.com"}},
		},
	}
	if err := h.store.CreateSegment(ctx, seg); err != nil {
		log.Error("failed to create demo segment", "error", err)
	}
}

func (h *DemoHandler) seedAPIKeys(ctx context.Context, envs map[string]*domain.Environment, log *slog.Logger) {
	for slug, env := range envs {
		for _, keyType := range []domain.APIKeyType{domain.APIKeyServer, domain.APIKeyClient} {
			rawKey, keyHash, keyPrefix := generateAPIKey(keyType)
			_ = rawKey
			ak := &domain.APIKey{
				EnvID:     env.ID,
				KeyHash:   keyHash,
				KeyPrefix: keyPrefix,
				Name:      fmt.Sprintf("Demo %s %s key", slug, keyType),
				Type:      keyType,
			}
			if err := h.store.CreateAPIKey(ctx, ak); err != nil {
				log.Error("failed to create demo API key", "error", err, "env", slug, "type", keyType)
			}
		}
	}
}

type ConvertRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	OrgName  string `json:"org_name"`
	Phone    string `json:"phone,omitempty"`
}

func (h *DemoHandler) Convert(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	orgID := middleware.GetOrgID(ctx)

	var req ConvertRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" || req.Name == "" || req.OrgName == "" {
		httputil.Error(w, http.StatusBadRequest, "email, password, name, and org_name are required")
		return
	}
	if !validateDemoPassword(req.Password) {
		httputil.Error(w, http.StatusBadRequest, "password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character")
		return
	}

	if _, err := h.store.GetUserByEmail(ctx, req.Email); err == nil {
		httputil.Error(w, http.StatusConflict, "email already registered")
		return
	}

	passHash, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Error("failed to hash password", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := h.store.ConvertDemoUser(ctx, userID, req.Email, passHash, req.Name); err != nil {
		log.Error("failed to convert demo user", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to convert account")
		return
	}

	slug := slugify(req.OrgName)
	if err := h.store.ConvertDemoOrg(ctx, orgID, req.OrgName, slug); err != nil {
		log.Error("failed to convert demo org", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to convert organization")
		return
	}

	if req.Phone != "" {
		_ = h.store.UpdateUserPhone(ctx, userID, req.Phone)
	}

	tokens, err := h.jwtMgr.GenerateTokenPair(userID, orgID, string(domain.RoleOwner))
	if err != nil {
		log.Error("failed to generate tokens after conversion", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	log.Info("demo account converted", "user_id", userID, "org_id", orgID, "email", req.Email)
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"tokens":  tokens,
		"message": "Account converted successfully. All your data has been preserved.",
	})
}

func (h *DemoHandler) Feedback(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	ctx := r.Context()
	orgID := middleware.GetOrgID(ctx)

	var req struct {
		Message string `json:"message"`
		Email   string `json:"email,omitempty"`
		Rating  int    `json:"rating,omitempty"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Message == "" {
		httputil.Error(w, http.StatusBadRequest, "message is required")
		return
	}

	fb := &domain.DemoFeedback{
		OrgID:   orgID,
		Message: req.Message,
		Email:   req.Email,
		Rating:  req.Rating,
	}
	if err := h.store.CreateDemoFeedback(ctx, fb); err != nil {
		log.Error("failed to store demo feedback", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to store feedback")
		return
	}

	log.Info("demo feedback received", "org_id", orgID, "rating", req.Rating)
	httputil.JSON(w, http.StatusCreated, map[string]string{"message": "Thank you for your feedback!"})
}

func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func validateDemoPassword(pw string) bool {
	if len(pw) < 8 {
		return false
	}
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, c := range pw {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		case unicode.IsPunct(c) || unicode.IsSymbol(c):
			hasSpecial = true
		}
	}
	return hasUpper && hasLower && hasDigit && hasSpecial
}
