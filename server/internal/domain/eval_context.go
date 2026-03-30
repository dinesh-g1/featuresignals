package domain

// EvalContext represents the context for flag evaluation.
// It contains the user/entity key and arbitrary attributes used for targeting.
type EvalContext struct {
	Key        string                 `json:"key"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

// GetAttribute returns the value of an attribute, checking the key first.
func (c EvalContext) GetAttribute(name string) (interface{}, bool) {
	if name == "key" {
		return c.Key, true
	}
	v, ok := c.Attributes[name]
	return v, ok
}

// EvalResult holds the result of a flag evaluation.
type EvalResult struct {
	FlagKey string      `json:"flag_key"`
	Value   interface{} `json:"value"`
	Reason  string      `json:"reason"`
}

// Evaluation reasons
const (
	ReasonDefault     = "DEFAULT"
	ReasonDisabled    = "DISABLED"
	ReasonTargeted    = "TARGETED"
	ReasonRollout     = "ROLLOUT"
	ReasonFallthrough = "FALLTHROUGH"
	ReasonNotFound    = "NOT_FOUND"
	ReasonError       = "ERROR"
)
