// Package domain defines the core types for the FeatureSignals platform.
// All business entities, evaluation types, and operator constants live here.
// The package has no external dependencies so it can be imported by every layer.
package domain

import (
	"encoding/json"
	"time"
)

// FlagType enumerates the value types a feature flag can hold.
type FlagType string

const (
	FlagTypeBoolean FlagType = "boolean"
	FlagTypeString  FlagType = "string"
	FlagTypeNumber  FlagType = "number"
	FlagTypeJSON    FlagType = "json"
)

// Flag is the top-level definition of a feature flag.
// It belongs to a Project and holds a default value that applies when the flag
// is disabled or no environment-specific state exists.
type Flag struct {
	ID           string          `json:"id" db:"id"`
	ProjectID    string          `json:"project_id" db:"project_id"`
	Key          string          `json:"key" db:"key"`
	Name         string          `json:"name" db:"name"`
	Description  string          `json:"description" db:"description"`
	FlagType     FlagType        `json:"flag_type" db:"flag_type"`
	DefaultValue json.RawMessage `json:"default_value" db:"default_value"`
	Tags         []string        `json:"tags" db:"tags"`
	ExpiresAt    *time.Time      `json:"expires_at,omitempty" db:"expires_at"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

// FlagState holds per-environment configuration for a Flag. Each environment
// (dev, staging, prod) has its own enable/disable toggle, targeting rules,
// and percentage rollout.
//
// PercentageRollout is expressed as basis points: 0 = 0%, 10000 = 100%.
type FlagState struct {
	ID                string          `json:"id" db:"id"`
	FlagID            string          `json:"flag_id" db:"flag_id"`
	EnvID             string          `json:"env_id" db:"env_id"`
	Enabled           bool            `json:"enabled" db:"enabled"`
	DefaultValue      json.RawMessage `json:"default_value,omitempty" db:"default_value"`
	Rules             []TargetingRule `json:"rules" db:"rules"`
	PercentageRollout int             `json:"percentage_rollout" db:"percentage_rollout"`
	UpdatedAt         time.Time       `json:"updated_at" db:"updated_at"`
}

// TargetingRule is a single rule evaluated during flag evaluation.
// Rules are processed in Priority order (lowest first). Each rule may reference
// Segments, direct Conditions, or both. The Value field holds the result
// returned when the rule matches.
type TargetingRule struct {
	ID          string          `json:"id"`
	Priority    int             `json:"priority"`
	Description string          `json:"description,omitempty"`
	Conditions  []Condition     `json:"conditions"`
	SegmentKeys []string        `json:"segment_keys,omitempty"`
	Percentage  int             `json:"percentage"` // 0–10000 basis points
	Value       json.RawMessage `json:"value"`
	MatchType   MatchType       `json:"match_type"`
}

// Condition is a single attribute predicate: "attribute <operator> values".
type Condition struct {
	Attribute string   `json:"attribute"`
	Operator  Operator `json:"operator"`
	Values    []string `json:"values"`
}

// Operator defines comparison operations available in targeting conditions.
type Operator string

const (
	OpEquals     Operator = "eq"
	OpNotEquals  Operator = "neq"
	OpContains   Operator = "contains"
	OpStartsWith Operator = "startsWith"
	OpEndsWith   Operator = "endsWith"
	OpIn         Operator = "in"
	OpNotIn      Operator = "notIn"
	OpGT         Operator = "gt"
	OpGTE        Operator = "gte"
	OpLT         Operator = "lt"
	OpLTE        Operator = "lte"
	OpRegex      Operator = "regex"
	OpExists     Operator = "exists"
)

// MatchType controls whether all or any conditions must match.
type MatchType string

const (
	MatchAll MatchType = "all"
	MatchAny MatchType = "any"
)
