package domain

import (
	"encoding/json"
	"time"
)

type FlagType string

const (
	FlagTypeBoolean FlagType = "boolean"
	FlagTypeString  FlagType = "string"
	FlagTypeNumber  FlagType = "number"
	FlagTypeJSON    FlagType = "json"
)

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

type FlagState struct {
	ID                string          `json:"id" db:"id"`
	FlagID            string          `json:"flag_id" db:"flag_id"`
	EnvID             string          `json:"env_id" db:"env_id"`
	Enabled           bool            `json:"enabled" db:"enabled"`
	DefaultValue      json.RawMessage `json:"default_value,omitempty" db:"default_value"`
	Rules             []TargetingRule `json:"rules" db:"rules"`
	PercentageRollout int             `json:"percentage_rollout" db:"percentage_rollout"` // 0-10000 (0.00%-100.00%)
	UpdatedAt         time.Time       `json:"updated_at" db:"updated_at"`
}

type TargetingRule struct {
	ID            string          `json:"id"`
	Priority      int             `json:"priority"`
	Description   string          `json:"description,omitempty"`
	Conditions    []Condition     `json:"conditions"`
	SegmentKeys   []string        `json:"segment_keys,omitempty"`
	Percentage    int             `json:"percentage"` // 0-10000
	Value         json.RawMessage `json:"value"`
	MatchType     MatchType       `json:"match_type"` // all or any
}

type Condition struct {
	Attribute string   `json:"attribute"`
	Operator  Operator `json:"operator"`
	Values    []string `json:"values"`
}

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

type MatchType string

const (
	MatchAll MatchType = "all"
	MatchAny MatchType = "any"
)
