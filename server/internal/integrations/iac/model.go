package iac

// ResourceModel is the provider-agnostic representation of all FeatureSignals
// resources. Every IaC provider adapter maps to/from these types.
type ResourceModel struct {
	Provider string `json:"provider"` // "terraform", "pulumi", "ansible", "crossplane", "cdk"

	Projects     []ProjectResource     `json:"projects,omitempty"`
	Environments []EnvironmentResource `json:"environments,omitempty"`
	Flags        []FlagResource        `json:"flags,omitempty"`
	Segments     []SegmentResource     `json:"segments,omitempty"`
	Webhooks     []WebhookResource     `json:"webhooks,omitempty"`
	APIKeys      []APIKeyResource      `json:"api_keys,omitempty"`
}

type ProjectResource struct {
	Name        string `json:"name"`
	Slug        string `json:"slug,omitempty"`
	Description string `json:"description,omitempty"`
}

type EnvironmentResource struct {
	ProjectSlug string `json:"project_slug"`
	Name        string `json:"name"`
	Slug        string `json:"slug,omitempty"`
	Color       string `json:"color,omitempty"`
	Description string `json:"description,omitempty"`
}

type FlagResource struct {
	ProjectSlug  string            `json:"project_slug"`
	Key          string            `json:"key"`
	Name         string            `json:"name"`
	Description  string            `json:"description,omitempty"`
	FlagType     string            `json:"flag_type"`
	DefaultValue string            `json:"default_value"`
	Tags         []string          `json:"tags,omitempty"`
	Environments []FlagEnvironment `json:"environments,omitempty"`
}

type FlagEnvironment struct {
	Key     string `json:"key"`
	Enabled bool   `json:"enabled"`
	Rules   string `json:"rules,omitempty"` // JSON-encoded targeting rules
}

type SegmentResource struct {
	ProjectSlug string             `json:"project_slug"`
	Key         string             `json:"key"`
	Name        string             `json:"name"`
	Description string             `json:"description,omitempty"`
	MatchType   string             `json:"match_type"` // "all" or "any"
	Rules       []SegmentCondition `json:"rules,omitempty"`
}

type SegmentCondition struct {
	Attribute string   `json:"attribute"`
	Operator  string   `json:"operator"`
	Values    []string `json:"values"`
}

type WebhookResource struct {
	ProjectSlug string   `json:"project_slug"`
	Name        string   `json:"name"`
	URL         string   `json:"url"`
	Secret      string   `json:"secret,omitempty"`
	EventTypes  []string `json:"event_types"`
	Enabled     bool     `json:"enabled"`
}

type APIKeyResource struct {
	EnvironmentSlug string `json:"environment_slug"`
	Name            string `json:"name"`
	KeyType         string `json:"key_type"` // "server" or "client"
	ExpiresAt       string `json:"expires_at,omitempty"`
}