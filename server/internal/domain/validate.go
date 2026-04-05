package domain

import (
	"encoding/json"
	"regexp"
)

var flagKeyRe = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,127}$`)

var validFlagTypes = map[FlagType]bool{
	FlagTypeBoolean: true,
	FlagTypeString:  true,
	FlagTypeNumber:  true,
	FlagTypeJSON:    true,
	FlagTypeAB:      true,
}

// IsValid returns true if ft is a recognized flag type.
func (ft FlagType) IsValid() bool {
	return validFlagTypes[ft]
}

var validFlagCategories = map[FlagCategory]bool{
	CategoryRelease:    true,
	CategoryExperiment: true,
	CategoryOps:        true,
	CategoryPermission: true,
}

// IsValid returns true if fc is a recognized flag category.
func (fc FlagCategory) IsValid() bool {
	return validFlagCategories[fc]
}

var validFlagStatuses = map[FlagStatus]bool{
	StatusActive:     true,
	StatusRolledOut:  true,
	StatusDeprecated: true,
	StatusArchived:   true,
}

// IsValid returns true if fs is a recognized flag status.
func (fs FlagStatus) IsValid() bool {
	return validFlagStatuses[fs]
}

var validOperators = map[Operator]bool{
	OpEquals: true, OpNotEquals: true, OpContains: true,
	OpStartsWith: true, OpEndsWith: true,
	OpIn: true, OpNotIn: true,
	OpGT: true, OpGTE: true, OpLT: true, OpLTE: true,
	OpRegex: true, OpExists: true,
}

// IsValid returns true if op is a recognized operator.
func (op Operator) IsValid() bool {
	return validOperators[op]
}

var validMatchTypes = map[MatchType]bool{
	MatchAll: true,
	MatchAny: true,
}

// IsValid returns true if mt is a recognized match type.
func (mt MatchType) IsValid() bool {
	return validMatchTypes[mt]
}

// Validate checks Flag fields and returns the first validation error found.
func (f *Flag) Validate() error {
	if f.Key == "" {
		return NewValidationError("key", "is required")
	}
	if !flagKeyRe.MatchString(f.Key) {
		return NewValidationError("key", "must match pattern: lowercase alphanumeric, hyphens, underscores (max 128 chars)")
	}
	if f.Name == "" {
		return NewValidationError("name", "is required")
	}
	if len(f.Name) > 255 {
		return NewValidationError("name", "must be at most 255 characters")
	}
	if len(f.Description) > 2000 {
		return NewValidationError("description", "must be at most 2000 characters")
	}
	if f.FlagType != "" && !f.FlagType.IsValid() {
		return NewValidationError("flag_type", "must be boolean, string, number, json, or ab")
	}
	if f.Category != "" && !f.Category.IsValid() {
		return NewValidationError("category", "must be release, experiment, ops, or permission")
	}
	if f.Status != "" && !f.Status.IsValid() {
		return NewValidationError("status", "must be active, rolled_out, deprecated, or archived")
	}
	if f.DefaultValue != nil && !json.Valid(f.DefaultValue) {
		return NewValidationError("default_value", "must be valid JSON")
	}
	if f.DefaultValue != nil && f.FlagType != "" {
		if err := validateDefaultValueType(f.FlagType, f.DefaultValue); err != nil {
			return err
		}
	}
	return nil
}

// validateDefaultValueType ensures the default_value JSON is compatible with
// the declared flag_type. For example, a "string" flag must have a JSON string
// default, not a boolean or number.
func validateDefaultValueType(ft FlagType, raw json.RawMessage) error {
	var v interface{}
	if err := json.Unmarshal(raw, &v); err != nil {
		return NewValidationError("default_value", "must be valid JSON")
	}
	switch ft {
	case FlagTypeBoolean:
		if _, ok := v.(bool); !ok {
			return NewValidationError("default_value", "must be a boolean for boolean flags")
		}
	case FlagTypeString:
		if _, ok := v.(string); !ok {
			return NewValidationError("default_value", "must be a string for string flags")
		}
	case FlagTypeNumber:
		if _, ok := v.(float64); !ok {
			return NewValidationError("default_value", "must be a number for number flags")
		}
	case FlagTypeJSON:
		switch v.(type) {
		case map[string]interface{}, []interface{}:
		default:
			return NewValidationError("default_value", "must be an object or array for json flags")
		}
	case FlagTypeAB:
		// A/B flags use variants; any valid JSON default is fine.
	}
	return nil
}

// Validate checks Segment fields and returns the first validation error found.
func (s *Segment) Validate() error {
	if s.Key == "" {
		return NewValidationError("key", "is required")
	}
	if !flagKeyRe.MatchString(s.Key) {
		return NewValidationError("key", "must match pattern: lowercase alphanumeric, hyphens, underscores (max 128 chars)")
	}
	if s.Name == "" {
		return NewValidationError("name", "is required")
	}
	if len(s.Name) > 255 {
		return NewValidationError("name", "must be at most 255 characters")
	}
	if s.MatchType != "" && !s.MatchType.IsValid() {
		return NewValidationError("match_type", "must be 'all' or 'any'")
	}
	for i, c := range s.Rules {
		if err := c.Validate(); err != nil {
			ve := &ValidationError{}
			if asVE(err, &ve) {
				return NewValidationError("rules["+itoa(i)+"]."+ve.Field, ve.Message)
			}
			return err
		}
	}
	return nil
}

// Validate checks FlagState fields and returns the first validation error found.
func (fs *FlagState) Validate() error {
	if fs.FlagID == "" {
		return NewValidationError("flag_id", "is required")
	}
	if fs.EnvID == "" {
		return NewValidationError("env_id", "is required")
	}
	if fs.PercentageRollout < 0 || fs.PercentageRollout > 10000 {
		return NewValidationError("percentage_rollout", "must be between 0 and 10000")
	}
	totalWeight := 0
	for _, v := range fs.Variants {
		if err := v.Validate(); err != nil {
			return err
		}
		totalWeight += v.Weight
	}
	if len(fs.Variants) > 0 && totalWeight != 10000 {
		return NewValidationError("variants", "weights must sum to 10000")
	}
	return nil
}

// Validate checks Variant fields.
func (v *Variant) Validate() error {
	if v.Key == "" {
		return NewValidationError("variant.key", "is required")
	}
	if v.Weight < 0 {
		return NewValidationError("variant.weight", "must be non-negative")
	}
	return nil
}

// Validate checks Condition fields.
func (c *Condition) Validate() error {
	if c.Attribute == "" {
		return NewValidationError("attribute", "is required")
	}
	if !c.Operator.IsValid() {
		return NewValidationError("operator", "unrecognized operator: "+string(c.Operator))
	}
	return nil
}

func asVE(err error, target **ValidationError) bool {
	if ve, ok := err.(*ValidationError); ok {
		*target = ve
		return true
	}
	return false
}

func itoa(i int) string {
	if i < 10 {
		return string(rune('0' + i))
	}
	return string(rune('0'+i/10)) + string(rune('0'+i%10))
}
